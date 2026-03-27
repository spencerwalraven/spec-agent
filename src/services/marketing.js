/**
 * Marketing service — PostgreSQL CRUD for marketing campaigns
 */
const { getAll, getOne, insertOne, updateOne } = require('../db');

const COMPANY_ID = 1;

function formatCampaign(r) {
  return {
    _row:       r.id,
    id:         r.id,
    name:       r.name || '',
    type:       r.campaign_type || '',
    status:     r.status || 'draft',
    targetSegment: r.target_segment || '',
    subject:    r.subject || '',
    body:       r.body || '',
    sentCount:  r.sent_count || 0,
    openCount:  r.open_count || 0,
    replyCount: r.reply_count || 0,
    sentAt:     r.sent_at || null,
    createdAt:  r.created_at,
  };
}

async function getCampaigns() {
  const rows = await getAll(
    `SELECT * FROM marketing_campaigns WHERE company_id = $1 ORDER BY created_at DESC`,
    [COMPANY_ID]
  );
  return rows.map(formatCampaign);
}

async function getCampaign(id) {
  const r = await getOne(
    `SELECT * FROM marketing_campaigns WHERE id = $1 AND company_id = $2`,
    [id, COMPANY_ID]
  );
  return r ? formatCampaign(r) : null;
}

async function createCampaign(data) {
  return insertOne(`
    INSERT INTO marketing_campaigns (company_id, name, campaign_type, status,
      target_segment, subject, body)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
  `, [
    COMPANY_ID,
    data.name || 'Untitled Campaign',
    data.type || data.campaign_type || '',
    data.status || 'draft',
    data.targetSegment || data.target_segment || '',
    data.subject || '',
    data.body || '',
  ]);
}

async function updateCampaignStatus(id, status) {
  const extra = status === 'sent' ? ', sent_at = NOW()' : '';
  return updateOne(
    `UPDATE marketing_campaigns SET status = $1${extra}, updated_at = NOW()
     WHERE id = $2 AND company_id = $3`,
    [status, id, COMPANY_ID]
  );
}

module.exports = { getCampaigns, getCampaign, createCampaign, updateCampaignStatus, formatCampaign };
