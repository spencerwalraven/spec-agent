/**
 * Settings service — reads/writes from PostgreSQL settings + goals tables
 */
const { getOne, query } = require('../db');

const COMPANY_ID = 1;

async function readSettings() {
  const row = await getOne('SELECT * FROM settings WHERE company_id = $1', [COMPANY_ID]);
  if (!row) return {};
  return {
    companyName:      row.company_name  || '',
    phone:            row.phone         || '',
    email:            row.email         || '',
    address:          row.address       || '',
    ownerName:        row.owner_name    || '',
    calendlyLink:     row.calendly_link || '',
    googleReviewLink: row.google_review_link || '',
    emailSignature:   row.email_signature   || '',
    emailTone:        row.email_tone        || 'professional',
    targetMargin:     parseFloat(row.target_margin)      || 25,
    contingencyPct:   parseFloat(row.contingency_pct)    || 10,
    defaultLaborRate: parseFloat(row.default_labor_rate)  || 45,
  };
}

async function writeSettings(data) {
  await query(`
    INSERT INTO settings (company_id, company_name, phone, email, address, owner_name,
      calendly_link, google_review_link, email_signature, email_tone,
      target_margin, contingency_pct, default_labor_rate, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
    ON CONFLICT (company_id) DO UPDATE SET
      company_name       = EXCLUDED.company_name,
      phone              = EXCLUDED.phone,
      email              = EXCLUDED.email,
      address            = EXCLUDED.address,
      owner_name         = EXCLUDED.owner_name,
      calendly_link      = EXCLUDED.calendly_link,
      google_review_link = EXCLUDED.google_review_link,
      email_signature    = EXCLUDED.email_signature,
      email_tone         = EXCLUDED.email_tone,
      target_margin      = EXCLUDED.target_margin,
      contingency_pct    = EXCLUDED.contingency_pct,
      default_labor_rate = EXCLUDED.default_labor_rate,
      updated_at         = NOW()
  `, [
    COMPANY_ID,
    data.companyName      || data['Company Name']      || '',
    data.phone            || data['Phone']             || '',
    data.email            || data['Email']             || '',
    data.address          || data['Address']           || '',
    data.ownerName        || data['Owner Name']        || '',
    data.calendlyLink     || data['Calendly Link']     || '',
    data.googleReviewLink || data['Google Review Link']|| '',
    data.emailSignature   || data['Email Signature']   || '',
    data.emailTone        || data['Email Tone']        || 'professional',
    data.targetMargin     || data['Target Margin']     || 25,
    data.contingencyPct   || data['Contingency %']     || 10,
    data.defaultLaborRate || data['Default Labor Rate'] || 45,
  ]);
}

async function readGoals() {
  const rows = await query(
    `SELECT metric, target, current_value, period FROM goals WHERE company_id = $1`,
    [COMPANY_ID]
  );
  const map = {};
  rows.rows.forEach(r => { map[r.metric] = r; });
  return {
    revenueGoal:    parseFloat(map.revenue?.target    || 0),
    leadsGoal:      parseInt(map.leads?.target        || 0),
    conversionGoal: parseFloat(map.conversion?.target || 0),
    jobsGoal:       parseInt(map.jobs?.target         || 0),
    period:         map.revenue?.period || 'Monthly',
  };
}

async function writeGoals(data) {
  const { revenueGoal, leadsGoal, conversionGoal, jobsGoal, period } = data;
  const goals = [
    { metric: 'revenue',    target: revenueGoal    || 0 },
    { metric: 'leads',      target: leadsGoal      || 0 },
    { metric: 'conversion', target: conversionGoal || 0 },
    { metric: 'jobs',       target: jobsGoal       || 0 },
  ];
  for (const g of goals) {
    await query(`
      INSERT INTO goals (company_id, metric, target, period, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT DO NOTHING
    `, [COMPANY_ID, g.metric, g.target, period || 'Monthly']);
    await query(`
      UPDATE goals SET target = $1, period = $2, updated_at = NOW()
      WHERE company_id = $3 AND metric = $4
    `, [g.target, period || 'Monthly', COMPANY_ID, g.metric]);
  }
}

module.exports = { readSettings, writeSettings, readGoals, writeGoals };
