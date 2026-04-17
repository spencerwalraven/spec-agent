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
    'Campaign Name': r.name || '',
    type:       r.type || r.campaign_type || '',
    Type:       r.type || r.campaign_type || '',
    status:     r.status || 'draft',
    Status:     r.status || 'draft',
    targetSegment: r.target_segment || '',
    'Target Audience': r.target_segment || '',
    subject:    r.subject || '',
    body:       r.message_body || r.body || '',
    Description: r.message_body || r.body || '',
    sentCount:  r.sent_count || 0,
    openCount:  r.open_count || 0,
    replyCount: r.reply_count || 0,
    sentAt:     r.launched_at || r.sent_at || null,
    'Send Now': r.launched_at ? 'Yes' : '',
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
    INSERT INTO marketing_campaigns (company_id, name, type, status,
      target_segment, message_body)
    VALUES ($1,$2,$3,$4,$5,$6)
  `, [
    COMPANY_ID,
    data.name || data['Campaign Name'] || 'Untitled Campaign',
    data.type || data.Type || data.campaign_type || '',
    data.status || data.Status || 'draft',
    data.targetSegment || data['Target Audience'] || data.target_segment || '',
    data.body || data.Description || data.message_body || data.subject || '',
  ]);
}

async function updateCampaignStatus(id, status) {
  const extra = status === 'sent' ? ', launched_at = NOW()' : '';
  return updateOne(
    `UPDATE marketing_campaigns SET status = $1${extra}, updated_at = NOW()
     WHERE id = $2 AND company_id = $3`,
    [status, id, COMPANY_ID]
  );
}

async function launchCampaign(id) {
  return updateCampaignStatus(id, 'sent');
}

module.exports = { getCampaigns, getCampaign, createCampaign, updateCampaignStatus, launchCampaign, formatCampaign };
