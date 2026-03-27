/**
 * Clients service — PostgreSQL CRUD
 */
const { getAll, getOne, insertOne, query } = require('../db');

const COMPANY_ID = 1;

function formatClient(r) {
  return {
    _row:            r.id,
    id:              r.id,
    clientId:        r.id,
    firstName:       (r.name || '').split(' ')[0] || '',
    lastName:        (r.name || '').split(' ').slice(1).join(' ') || '',
    name:            r.name            || '',
    email:           r.email           || '',
    phone:           r.phone           || '',
    address:         r.address         || '',
    source:          r.source          || '',
    lifetimeValue:   r.total_revenue   || 0,
    jobsCompleted:   r.job_count       || 0,
    lastJobDate:     r.last_job_at ? new Date(r.last_job_at).toLocaleDateString() : '',
    notes:           r.notes           || '',
    preferredContact: r.preferred_contact || '',
    communicationStyle: r.communication_style || '',
    decisionFactors: r.decision_factors || '',
    keyConcerns:     r.key_concerns    || '',
    createdAt:       r.created_at,
  };
}

async function getClients() {
  const rows = await getAll(
    `SELECT * FROM clients WHERE company_id = $1 ORDER BY name ASC`,
    [COMPANY_ID]
  );
  return rows.map(formatClient);
}

async function getClient(id) {
  const r = await getOne(`SELECT * FROM clients WHERE id = $1 AND company_id = $2`, [id, COMPANY_ID]);
  return r ? formatClient(r) : null;
}

async function getClientByName(name) {
  const r = await getOne(
    `SELECT * FROM clients WHERE company_id = $1 AND LOWER(name) LIKE LOWER($2) LIMIT 1`,
    [COMPANY_ID, `%${name}%`]
  );
  return r ? formatClient(r) : null;
}

async function createClient(data) {
  const name = data.name || [data.firstName || '', data.lastName || ''].filter(Boolean).join(' ');
  return insertOne(`
    INSERT INTO clients (company_id, lead_id, name, email, phone, address, source)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
  `, [
    COMPANY_ID,
    data.lead_id || data.leadId || null,
    name,
    data.email   || '',
    data.phone   || '',
    data.address || '',
    data.source  || '',
  ]);
}

async function getClientTimeline(name) {
  const client = await getClientByName(name);
  if (!client) return [];

  const events = [];

  // Lead origin
  if (client._row) {
    const lead = await getOne(`SELECT * FROM leads WHERE id = $1`, [client.id]);
    if (lead) {
      events.push({
        type: 'lead', icon: '👤', label: 'Lead submitted',
        detail: `Source: ${lead.source || 'Direct'}`,
        date: lead.created_at, color: 'gold',
      });
    }
  }

  // Jobs
  const jobs = await getAll(
    `SELECT * FROM jobs WHERE client_id = $1 ORDER BY created_at ASC`,
    [client.id]
  );
  for (const job of jobs) {
    events.push({
      type: 'job', icon: '🔨',
      label: `Job: ${job.title || job.service || 'Project'}`,
      detail: `${job.status}${job.estimated_value ? ' · $' + Number(job.estimated_value).toLocaleString() : ''}`,
      date: job.start_date || job.created_at, color: 'blue', jobId: job.job_ref,
    });

    // Proposal
    if (job.proposal_sent_at) {
      events.push({
        type: 'proposal', icon: '📄', label: 'Proposal sent',
        detail: job.estimated_value ? `$${Number(job.estimated_value).toLocaleString()}` : '',
        date: job.proposal_sent_at, color: 'gold',
      });
    }
    if (job.proposal_signed_at) {
      events.push({
        type: 'proposal_signed', icon: '✅', label: 'Proposal approved',
        detail: '', date: job.proposal_signed_at, color: 'green',
      });
    }
    if (job.contract_signed_at) {
      events.push({
        type: 'contract', icon: '📝', label: 'Contract signed',
        detail: '', date: job.contract_signed_at, color: 'green',
      });
    }
  }

  // Invoices
  const invoices = await getAll(
    `SELECT i.* FROM invoices i
     JOIN jobs j ON i.job_id = j.id
     WHERE j.client_id = $1 ORDER BY i.created_at ASC`,
    [client.id]
  );
  for (const inv of invoices) {
    events.push({
      type: 'invoice', icon: '💰',
      label: `${inv.invoice_type === 'deposit' ? 'Deposit' : 'Final'} invoice sent`,
      detail: `$${Number(inv.amount || 0).toLocaleString()} · ${inv.status}`,
      date: inv.sent_at || inv.created_at,
      color: inv.status === 'paid' ? 'green' : 'gold',
    });
  }

  // Photos
  const photos = await getAll(
    `SELECT p.* FROM photos p
     JOIN jobs j ON p.job_id = j.id
     WHERE j.client_id = $1 ORDER BY p.created_at ASC`,
    [client.id]
  );
  for (const ph of photos) {
    events.push({
      type: 'photo', icon: '📸',
      label: `Photo added: ${ph.photo_type || 'Job photo'}`,
      detail: ph.caption || '', date: ph.created_at, color: 'mist',
    });
  }

  // Sort by date
  events.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  return events;
}

module.exports = { getClients, getClient, getClientByName, createClient, getClientTimeline, formatClient };
