/**
 * Invoices service — PostgreSQL CRUD
 */
const { getAll, getOne, insertOne, updateOne, query } = require('../db');

const COMPANY_ID = 1;

function formatInvoice(r) {
  return {
    _row:          r.id,
    id:            r.id,
    jobId:         r.job_id,
    jobRef:        r.job_ref || '',
    clientName:    r.client_name || '',
    invoiceType:   r.invoice_type || 'deposit',
    invoiceNumber: r.invoice_number || '',
    amount:        parseFloat(r.amount || 0),
    status:        r.status || 'pending',  // pending, sent, paid, overdue
    sentAt:        r.sent_at || null,
    paidAt:        r.paid_at || null,
    dueDate:       r.due_date || null,
    stripePaymentLink: r.stripe_payment_link || '',
    qbInvoiceId:   r.qb_invoice_id || '',
    notes:         r.notes || '',
    createdAt:     r.created_at,
  };
}

async function getInvoices(status) {
  let sql = `
    SELECT i.*, j.job_ref, c.name AS client_name
    FROM invoices i
    LEFT JOIN jobs j ON i.job_id = j.id
    LEFT JOIN clients c ON j.client_id = c.id
    WHERE i.company_id = $1
  `;
  const params = [COMPANY_ID];
  if (status) { sql += ` AND i.status = $2`; params.push(status); }
  sql += ` ORDER BY i.created_at DESC`;
  const rows = await getAll(sql, params);
  return rows.map(formatInvoice);
}

async function getInvoice(id) {
  const r = await getOne(`
    SELECT i.*, j.job_ref, c.name AS client_name
    FROM invoices i
    LEFT JOIN jobs j ON i.job_id = j.id
    LEFT JOIN clients c ON j.client_id = c.id
    WHERE i.id = $1 AND i.company_id = $2
  `, [id, COMPANY_ID]);
  return r ? formatInvoice(r) : null;
}

async function getInvoicesForJob(jobId) {
  const rows = await getAll(`
    SELECT i.*, j.job_ref, c.name AS client_name
    FROM invoices i
    LEFT JOIN jobs j ON i.job_id = j.id
    LEFT JOIN clients c ON j.client_id = c.id
    WHERE i.job_id = $1 AND i.company_id = $2
    ORDER BY i.created_at ASC
  `, [jobId, COMPANY_ID]);
  return rows.map(formatInvoice);
}

async function createInvoice(data) {
  // Auto-generate invoice number
  const count = await getOne(`SELECT COUNT(*) FROM invoices WHERE company_id = $1`, [COMPANY_ID]);
  const invoiceNumber = data.invoiceNumber || `INV-${String(parseInt(count.count) + 1).padStart(3, '0')}`;

  return insertOne(`
    INSERT INTO invoices (company_id, job_id, invoice_type, invoice_number, amount,
      status, sent_at, due_date, stripe_payment_link, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  `, [
    COMPANY_ID,
    data.jobId || data.job_id,
    data.invoiceType || data.invoice_type || 'deposit',
    invoiceNumber,
    parseFloat(data.amount || 0),
    data.status || 'pending',
    data.sentAt || data.sent_at || null,
    data.dueDate || data.due_date || null,
    data.stripePaymentLink || data.stripe_payment_link || '',
    data.notes || '',
  ]);
}

async function markInvoicePaid(id, paidAt) {
  return updateOne(
    `UPDATE invoices SET status = 'paid', paid_at = $1, updated_at = NOW()
     WHERE id = $2 AND company_id = $3`,
    [paidAt || new Date().toISOString(), id, COMPANY_ID]
  );
}

async function markInvoiceSent(id, stripeLink) {
  return updateOne(
    `UPDATE invoices SET status = 'sent', sent_at = NOW(),
      stripe_payment_link = COALESCE($1, stripe_payment_link), updated_at = NOW()
     WHERE id = $2 AND company_id = $3`,
    [stripeLink || null, id, COMPANY_ID]
  );
}

async function setQbInvoiceId(id, qbId) {
  return updateOne(
    `UPDATE invoices SET qb_invoice_id = $1, updated_at = NOW()
     WHERE id = $2 AND company_id = $3`,
    [qbId, id, COMPANY_ID]
  );
}

module.exports = {
  getInvoices, getInvoice, getInvoicesForJob,
  createInvoice, markInvoicePaid, markInvoiceSent, setQbInvoiceId,
  formatInvoice,
};
