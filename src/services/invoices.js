/**
 * Invoices service — PostgreSQL CRUD
 */
const { getAll, getOne, insertOne, updateOne, query } = require('../db');

const COMPANY_ID = 1;

function formatInvoice(r) {
  return {
    _row:            r.id,
    id:              r.id,
    jobId:           r.job_id,
    invoiceType:     r.invoice_type    || '',
    amount:          r.amount          || 0,
    status:          r.status          || 'draft',
    dueDate:         r.due_date        || null,
    paidAt:          r.paid_at         || null,
    stripeLink:      r.stripe_payment_link || '',
    stripeSessionId: r.stripe_payment_intent || '',
    qbInvoiceId:     r.qb_invoice_id   || '',
    sentAt:          r.sent_at         || null,
    createdAt:       r.created_at,
  };
}

async function getInvoices(jobId) {
  let sql = `SELECT * FROM invoices WHERE company_id = $1`;
  const params = [COMPANY_ID];
  if (jobId) { sql += ` AND job_id = $2`; params.push(jobId); }
  sql += ` ORDER BY created_at DESC`;
  const rows = await getAll(sql, params);
  return rows.map(formatInvoice);
}

async function getInvoice(id) {
  const r = await getOne(
    `SELECT * FROM invoices WHERE id = $1 AND company_id = $2`,
    [id, COMPANY_ID]
  );
  return r ? formatInvoice(r) : null;
}

async function createInvoice(data) {
  return insertOne(`
    INSERT INTO invoices (company_id, job_id, invoice_type, amount, status, due_date, stripe_payment_link)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
  `, [
    COMPANY_ID,
    data.jobId      || data.job_id      || null,
    data.invoiceType || data.invoice_type || '',
    parseFloat(data.amount) || 0,
    data.status     || 'draft',
    data.dueDate    || data.due_date    || null,
    data.stripeLink || data.stripe_payment_link || null,
  ]);
}

async function updateInvoiceStatus(id, status) {
  const extra = status === 'paid' ? ', paid_at = NOW()' : '';
  return updateOne(
    `UPDATE invoices SET status = $1, updated_at = NOW()${extra} WHERE id = $2 AND company_id = $3`,
    [status, id, COMPANY_ID]
  );
}

async function markInvoicePaid(id, paidAt) {
  return updateOne(
    `UPDATE invoices SET status = 'paid', paid_at = $1, updated_at = NOW()
     WHERE id = $2 AND company_id = $3`,
    [paidAt || new Date(), id, COMPANY_ID]
  );
}

async function markStripeSynced(id, sessionId, stripeLink) {
  return updateOne(
    `UPDATE invoices SET stripe_payment_intent = $1, stripe_payment_link = $2, updated_at = NOW()
     WHERE id = $3 AND company_id = $4`,
    [sessionId, stripeLink, id, COMPANY_ID]
  );
}

module.exports = {
  formatInvoice,
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoiceStatus,
  markInvoicePaid,
  markStripeSynced,
};
