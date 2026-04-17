/**
 * QuickBooks Sync Reliability Layer
 *
 * Wraps the base QuickBooks tool with:
 *   - Auto-retry on 401 (token expired) with proactive refresh
 *   - Exponential backoff on 429 (rate limit) and 5xx
 *   - Idempotent webhook processing (dedupes by event_id)
 *   - Audit log for every sync operation
 *   - Per-invoice sync status tracking
 *   - Robust customer matching (email OR phone OR name)
 *
 * Every function here is safe to call repeatedly — failures don't corrupt state.
 */

const { logger } = require('../utils/logger');
const { query, getOne } = require('../db');
const qb = require('./quickbooks');

const COMPANY_ID = 1;

// ─── AUDIT LOG ──────────────────────────────────────────────────────────────

async function logSync({ entityType, entityId, qbEntityId, operation, direction, status, error, payload }) {
  try {
    await query(
      `INSERT INTO qb_sync_log (company_id, entity_type, entity_id, qb_entity_id, operation, direction, status, error_message, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [COMPANY_ID, entityType, entityId || null, qbEntityId || null, operation, direction, status, error || null, payload ? JSON.stringify(payload) : null]
    );
  } catch (e) {
    logger.warn('QBSync', `Could not write to qb_sync_log: ${e.message}`);
  }
}

// ─── RETRY WRAPPER ──────────────────────────────────────────────────────────
// Used internally — all public methods below go through this.
async function qbRequestWithRetry(method, path, body, maxAttempts = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // qbRequest in quickbooks.js already handles token refresh when expired.
      // We add retry on top for 429/5xx/network errors.
      return await qb.qbRequest(method, path, body);
    } catch (err) {
      lastErr = err;
      const msg = err.message || '';
      const is429    = /429|rate.?limit|ThrottleExceeded/i.test(msg);
      const is5xx    = /5\d\d/.test(msg);
      const is401    = /401|unauthor/i.test(msg);
      const isNet    = /ECONNRESET|ETIMEDOUT|ENOTFOUND|network/i.test(msg);

      if (!is429 && !is5xx && !is401 && !isNet) throw err; // Don't retry 4xx client errors

      // Exponential backoff: 500ms, 1.5s, 4.5s
      if (attempt < maxAttempts) {
        const delay = 500 * Math.pow(3, attempt - 1);
        logger.warn('QBSync', `Attempt ${attempt} failed (${msg.slice(0, 80)}), retrying in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

// ─── CUSTOMER SYNC ──────────────────────────────────────────────────────────
// Robust match: try qb_customer_id → email → phone → name
// If not found, create. Always returns { customerId, companyName }.

async function syncCustomer(client) {
  if (!client) throw new Error('Client required');

  try {
    // Already linked? Try to verify existence; if not found, re-sync.
    if (client.qb_customer_id) {
      try {
        const existing = await qbRequestWithRetry('GET', `/customer/${client.qb_customer_id}`);
        if (existing.Customer) {
          await logSync({ entityType: 'customer', entityId: client.id, qbEntityId: client.qb_customer_id, operation: 'verify', direction: 'from_qb', status: 'success' });
          return { customerId: client.qb_customer_id, companyName: existing.Customer.DisplayName };
        }
      } catch (_) {
        // Deleted or 404 — re-create below
      }
    }

    // Find by email, phone, or display name (in that order)
    const searches = [];
    if (client.email) searches.push(`PrimaryEmailAddr = '${client.email.replace(/'/g, "\\'")}'`);
    if (client.phone) {
      const cleanPhone = String(client.phone).replace(/[^0-9]/g, '');
      if (cleanPhone.length >= 10) searches.push(`PrimaryPhone.FreeFormNumber LIKE '%${cleanPhone.slice(-10)}%'`);
    }
    if (client.name) searches.push(`DisplayName = '${String(client.name).replace(/'/g, "\\'")}'`);

    for (const where of searches) {
      try {
        const q = `SELECT * FROM Customer WHERE ${where} MAXRESULTS 1`;
        const result = await qbRequestWithRetry('GET', `/query?query=${encodeURIComponent(q)}`);
        const found = result?.QueryResponse?.Customer?.[0];
        if (found) {
          // Save the link in our DB
          await query(
            `UPDATE clients SET qb_customer_id = $1, qb_synced_at = NOW() WHERE id = $2 AND company_id = $3`,
            [found.Id, client.id, COMPANY_ID]
          ).catch(() => {});
          await logSync({ entityType: 'customer', entityId: client.id, qbEntityId: found.Id, operation: 'match', direction: 'from_qb', status: 'success' });
          return { customerId: found.Id, companyName: found.DisplayName };
        }
      } catch (_) { /* Try next search method */ }
    }

    // Not found — create
    const [firstName, ...rest] = (client.name || 'Client').split(' ');
    const lastName = rest.join(' ') || '';
    const created = await qb.findOrCreateCustomer({
      firstName, lastName,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
    });

    await query(
      `UPDATE clients SET qb_customer_id = $1, qb_synced_at = NOW() WHERE id = $2 AND company_id = $3`,
      [created.customerId, client.id, COMPANY_ID]
    ).catch(() => {});
    await logSync({ entityType: 'customer', entityId: client.id, qbEntityId: created.customerId, operation: 'create', direction: 'to_qb', status: 'success' });
    return created;
  } catch (err) {
    await logSync({ entityType: 'customer', entityId: client.id, operation: 'create', direction: 'to_qb', status: 'failed', error: err.message });
    throw err;
  }
}

// ─── INVOICE SYNC ───────────────────────────────────────────────────────────
// Create/update invoice in QB. Updates our qb_sync_status column.
async function syncInvoice(invoiceId) {
  const invoice = await getOne('SELECT * FROM invoices WHERE id = $1 AND company_id = $2', [invoiceId, COMPANY_ID]);
  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

  try {
    // Mark in-progress
    await query(
      `UPDATE invoices SET qb_sync_attempts = COALESCE(qb_sync_attempts, 0) + 1 WHERE id = $1`,
      [invoiceId]
    ).catch(() => {});

    // Look up the client for this invoice
    const job = await getOne('SELECT j.*, c.name AS client_name, c.email AS client_email, c.phone AS client_phone, c.address AS client_address, c.qb_customer_id FROM jobs j LEFT JOIN clients c ON j.client_id = c.id WHERE j.id = $1', [invoice.job_id]);
    if (!job) throw new Error('Job not found for invoice');

    // Ensure customer exists in QB
    const customer = await syncCustomer({
      id: job.client_id,
      name: job.client_name,
      email: job.client_email,
      phone: job.client_phone,
      address: job.client_address,
      qb_customer_id: job.qb_customer_id,
    });

    let qbInvoiceId = invoice.qb_invoice_id;

    if (qbInvoiceId) {
      // Update existing QB invoice — just a status sync for now, full update is complex
      await logSync({ entityType: 'invoice', entityId: invoiceId, qbEntityId: qbInvoiceId, operation: 'update', direction: 'to_qb', status: 'skipped', error: 'Already in QB — updates handled via webhook' });
    } else {
      // Create new
      const desc = `${invoice.invoice_type === 'deposit' ? 'Deposit — ' : invoice.invoice_type === 'final' ? 'Final Payment — ' : 'Invoice — '}${job.service || job.title || 'Project'}${job.job_ref ? ' (' + job.job_ref + ')' : ''}`;
      const created = await qb.createInvoice({
        customerId: customer.customerId,
        amount: parseFloat(invoice.amount),
        description: desc,
        jobId: job.job_ref,
        dueDate: invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : null,
        invoiceType: invoice.invoice_type,
      });
      qbInvoiceId = created.qbInvoiceId;
    }

    // Mark synced
    await query(
      `UPDATE invoices SET qb_invoice_id = $1, qb_sync_status = 'synced', qb_synced_at = NOW(), qb_sync_error = NULL WHERE id = $2`,
      [qbInvoiceId, invoiceId]
    );
    await logSync({ entityType: 'invoice', entityId: invoiceId, qbEntityId: qbInvoiceId, operation: 'create', direction: 'to_qb', status: 'success' });

    return { ok: true, qbInvoiceId };
  } catch (err) {
    await query(
      `UPDATE invoices SET qb_sync_status = 'failed', qb_sync_error = $1 WHERE id = $2`,
      [err.message.slice(0, 500), invoiceId]
    ).catch(() => {});
    await logSync({ entityType: 'invoice', entityId: invoiceId, operation: 'create', direction: 'to_qb', status: 'failed', error: err.message });
    throw err;
  }
}

// ─── WEBHOOK HANDLER (IDEMPOTENT) ───────────────────────────────────────────
// Every incoming webhook event gets a unique dedupe key so repeats are safe.
async function handleWebhookEvent({ eventId, realmId, entityName, qbEntityId, operation }) {
  // Check if we've seen this event
  try {
    const existing = await getOne(
      'SELECT status, processed_at FROM qb_webhook_events WHERE event_id = $1',
      [eventId]
    );
    if (existing?.status === 'processed') {
      logger.info('QBSync', `Webhook event ${eventId} already processed — skipping`);
      return { skipped: true };
    }

    // Record the event as received
    await query(
      `INSERT INTO qb_webhook_events (event_id, company_id, realm_id, entity_name, qb_entity_id, operation, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, COMPANY_ID, realmId, entityName, qbEntityId, operation]
    );

    // Process the event
    if (entityName === 'Payment' && (operation === 'Create' || operation === 'Update')) {
      const payment = await qbRequestWithRetry('GET', `/payment/${qbEntityId}`);
      const payData = payment.Payment;
      if (payData?.Line) {
        for (const line of payData.Line) {
          const qbInvoiceId = line.LinkedTxn?.find(t => t.TxnType === 'Invoice')?.TxnId;
          if (qbInvoiceId) {
            const res = await query(
              `UPDATE invoices SET status = 'paid', paid_at = NOW(), paid_amount = $1, qb_sync_status = 'synced', qb_synced_at = NOW()
               WHERE qb_invoice_id = $2 AND company_id = $3 RETURNING id`,
              [payData.TotalAmt, qbInvoiceId, COMPANY_ID]
            );
            if (res.rows.length) {
              await logSync({ entityType: 'payment', entityId: res.rows[0].id, qbEntityId, operation: 'payment_received', direction: 'from_qb', status: 'success', payload: { amount: payData.TotalAmt } });
            }
          }
        }
      }
    }

    if (entityName === 'Invoice' && operation === 'Update') {
      const invoice = await qbRequestWithRetry('GET', `/invoice/${qbEntityId}`);
      const invData = invoice.Invoice;
      if (invData) {
        const balance = parseFloat(invData.Balance) || 0;
        const status = balance === 0 ? 'paid' : 'outstanding';
        await query(
          `UPDATE invoices SET status = $1, amount = $2, qb_synced_at = NOW()
           WHERE qb_invoice_id = $3 AND company_id = $4`,
          [status, invData.TotalAmt, qbEntityId, COMPANY_ID]
        );
        await logSync({ entityType: 'invoice', qbEntityId, operation: 'webhook_update', direction: 'from_qb', status: 'success' });
      }
    }

    if (entityName === 'Customer' && operation === 'Update') {
      const cust = await qbRequestWithRetry('GET', `/customer/${qbEntityId}`);
      const cData = cust.Customer;
      if (cData) {
        await query(
          `UPDATE clients SET name = $1, email = $2, phone = $3, qb_synced_at = NOW()
           WHERE qb_customer_id = $4 AND company_id = $5`,
          [cData.DisplayName, cData.PrimaryEmailAddr?.Address || null, cData.PrimaryPhone?.FreeFormNumber || null, qbEntityId, COMPANY_ID]
        );
        await logSync({ entityType: 'customer', qbEntityId, operation: 'webhook_update', direction: 'from_qb', status: 'success' });
      }
    }

    // Mark as processed
    await query(
      `UPDATE qb_webhook_events SET status = 'processed', processed_at = NOW() WHERE event_id = $1`,
      [eventId]
    );
    return { ok: true };

  } catch (err) {
    await query(
      `UPDATE qb_webhook_events SET status = 'failed' WHERE event_id = $1`,
      [eventId]
    ).catch(() => {});
    await logSync({ entityType: entityName, qbEntityId, operation: `webhook_${operation?.toLowerCase() || 'unknown'}`, direction: 'from_qb', status: 'failed', error: err.message });
    throw err;
  }
}

// ─── CONNECTION HEALTH CHECK ────────────────────────────────────────────────
async function healthCheck() {
  try {
    const status = await qb.getConnectionStatus();
    if (!status.connected) return { ok: false, reason: 'Not connected' };

    // Try a cheap query to verify token is valid
    const result = await qbRequestWithRetry('GET', `/companyinfo/${status.realmId}`);
    const companyName = result?.CompanyInfo?.CompanyName || 'Unknown';
    return { ok: true, companyName, realmId: status.realmId };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

// ─── RECENT ACTIVITY ────────────────────────────────────────────────────────
async function getSyncLog(limit = 50) {
  const rows = await query(
    `SELECT * FROM qb_sync_log WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [COMPANY_ID, limit]
  );
  return rows.rows;
}

async function getInvoicesByStatus(status) {
  const rows = await query(
    `SELECT i.*, j.job_ref, c.name AS client_name FROM invoices i
     LEFT JOIN jobs j ON i.job_id = j.id
     LEFT JOIN clients c ON j.client_id = c.id
     WHERE i.company_id = $1 AND i.qb_sync_status = $2 ORDER BY i.created_at DESC`,
    [COMPANY_ID, status]
  );
  return rows.rows;
}

module.exports = {
  syncCustomer, syncInvoice, handleWebhookEvent, healthCheck,
  getSyncLog, getInvoicesByStatus, logSync, qbRequestWithRetry,
};
