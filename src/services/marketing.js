/**
 * Marketing Campaigns service — PostgreSQL CRUD
 */
const { getAll, getOne, insertOne, updateOne, query } = require('../db');

const COMPANY_ID = 1;

function formatCampaign(r) {
  return {
    _row:          r.id,
    id:            r.id,
    campaignName:  r.name           || '',
    type:          r.type           || '',
    description:   r.message_body   || '',
    targetSegment: r.target_segment || '',
    status:        r.status         || 'draft',
    launchDate:    r.launched_at    || null,
    emailsSent:    r.sent_count     || 0,
    conversions:   r.reply_count    || 0,
    createdAt:     r.created_at,
  };
}

async function getCampaigns() {
  const rows = await getAll(
    `SELECT * FROM marketing_campaigns WHERE company_id = $1 ORDER BY created_at DESC`,
    [COMPANY_ID]
  );
  return rows.map(formatCampaign);
}

async function createCampaign(data) {
  return insertOne(`
    INSERT INTO marketing_campaigns (company_id, name, type, status, target_segment, message_body)
    VALUES ($1,$2,$3,$4,$5,$6)
  `, [
    COMPANY_ID,
    data.campaignName || data.name        || '',
    data.type         || data.campaign_type || '',
    data.status       || 'draft',
    data.targetSegment || data.target_segment || null,
    data.description  || data.message_body  || null,
  ]);
}

async function launchCampaign(id) {
  return updateOne(
    `UPDATE marketing_campaigns SET status = 'launched', launched_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND company_id = $2`,
    [id, COMPANY_ID]
  );
}

module.exports = {
  formatCampaign,
  getCampaigns,
  createCampaign,
  launchCampaign,
};
