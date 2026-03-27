/**
 * Leads service — PostgreSQL CRUD
 */
const { getAll, getOne, insertOne, updateOne, query } = require('../db');

const COMPANY_ID = 1;

function formatLead(r) {
  return {
    _row: r.id,
    id:           r.id,
    firstName:    (r.name || '').split(' ')[0] || '',
    lastName:     (r.name || '').split(' ').slice(1).join(' ') || '',
    name:         r.name         || '',
    email:        r.email        || '',
    phone:        r.phone        || '',
    address:      r.address      || '',
    projectType:  r.service      || '',
    description:  r.message      || '',
    source:       r.source       || '',
    heardAboutUs: r.source       || '',
    leadScore:    r.score        || 0,
    scoreReason:  r.score_label  || '',
    leadStatus:   r.status       || 'new',
    notes:        r.notes        || '',
    aiSummary:    r.ai_summary   || '',
    lastContact:  r.last_contact_at ? new Date(r.last_contact_at).toLocaleDateString() : '',
    nurtureStep:  r.follow_up_count || 0,
    timestamp:    r.created_at   ? new Date(r.created_at).toLocaleDateString() : '',
    createdAt:    r.created_at,
  };
}

async function getLeads() {
  const rows = await getAll(
    `SELECT * FROM leads WHERE company_id = $1 ORDER BY created_at DESC`,
    [COMPANY_ID]
  );
  return rows.map(formatLead);
}

async function getLead(id) {
  const r = await getOne(`SELECT * FROM leads WHERE id = $1 AND company_id = $2`, [id, COMPANY_ID]);
  return r ? formatLead(r) : null;
}

async function createLead(data) {
  const name = [data.firstName || data.first_name || '', data.lastName || data.last_name || ''].filter(Boolean).join(' ') || data.name || '';
  return insertOne(`
    INSERT INTO leads (company_id, name, email, phone, service, message, address, source, score, score_label, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
  `, [
    COMPANY_ID, name,
    data.email   || '',
    data.phone   || '',
    data.service || data.projectType || data['Service Requested'] || '',
    data.message || data.description || data['Project Description'] || '',
    data.address || '',
    data.source  || data.heardAboutUs || '',
    parseInt(data.leadScore || data.score || 0) || 0,
    data.scoreLabel || data.score_label || '',
    data.status  || 'new',
  ]);
}

async function updateLeadStatus(id, status) {
  const col = status === 'Converted' ? ', converted_at = NOW()' : status === 'Lost' ? ', lost_at = NOW()' : '';
  return updateOne(
    `UPDATE leads SET status = $1, updated_at = NOW()${col} WHERE id = $2 AND company_id = $3`,
    [status, id, COMPANY_ID]
  );
}

async function updateLeadNote(id, note) {
  return updateOne(
    `UPDATE leads SET notes = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3`,
    [note, id, COMPANY_ID]
  );
}

async function updateLeadScore(id, score, scoreLabel, aiSummary) {
  return updateOne(
    `UPDATE leads SET score = $1, score_label = $2, ai_summary = $3, updated_at = NOW()
     WHERE id = $4 AND company_id = $5`,
    [score, scoreLabel, aiSummary, id, COMPANY_ID]
  );
}

async function logLeadContact(id) {
  return query(
    `UPDATE leads SET last_contact_at = NOW(), follow_up_count = follow_up_count + 1, updated_at = NOW()
     WHERE id = $1 AND company_id = $2`,
    [id, COMPANY_ID]
  );
}

module.exports = { getLeads, getLead, createLead, updateLeadStatus, updateLeadNote, updateLeadScore, logLeadContact, formatLead };
