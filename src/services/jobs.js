/**
 * Jobs service — PostgreSQL CRUD
 */
const { getAll, getOne, insertOne, updateOne, query } = require('../db');

const COMPANY_ID = 1;

function formatJob(r) {
  return {
    _row:              r.id,
    id:                r.id,
    jobId:             r.job_ref         || `JOB-${r.id}`,
    jobRef:            r.job_ref         || '',
    clientId:          r.client_id,
    clientName:        r.client_name     || '',
    title:             r.title           || '',
    service:           r.service         || r.title || '',
    projectType:       r.service         || '',
    description:       r.description     || '',
    address:           r.address         || '',
    status:            r.status          || 'pending',
    priority:          r.priority        || 'normal',
    // Financials
    estimatedValue:    r.estimated_value  || 0,
    actualValue:       r.actual_value     || 0,
    materialCost:      r.material_cost    || 0,
    laborCost:         r.labor_cost       || 0,
    profitMargin:      r.profit_margin    || 0,
    depositAmount:     r.deposit_amount   || 0,
    depositPaid:       r.deposit_paid ? 'Paid' : 'No',
    // Dates
    startDate:         r.start_date  ? new Date(r.start_date).toLocaleDateString()  : '',
    endDate:           r.end_date    ? new Date(r.end_date).toLocaleDateString()    : '',
    kickoffDate:       r.kickoff_date ? new Date(r.kickoff_date).toLocaleDateString() : '',
    // Proposal
    proposalStatus:    r.proposal_status   || '',
    proposalSentAt:    r.proposal_sent_at  || null,
    proposalSignedAt:  r.proposal_signed_at || null,
    proposalToken:     r.proposal_token    || '',
    // Contract
    contractStatus:    r.contract_status   || '',
    contractSignedAt:  r.contract_signed_at || null,
    // Notes
    notes:             r.notes    || '',
    aiPlan:            r.ai_plan  || '',
    scopeOfWork:       r.scope_of_work || '',
    weatherRisk:       r.weather_risk  || '',
    // Site Visit
    siteVisitNotes:        r.site_visit_notes        || '',
    siteVisitMeasurements: r.site_visit_measurements  || '',
    siteVisitPhotos:       r.site_visit_photos        || '',
    siteVisitDate:         r.site_visit_date ? new Date(r.site_visit_date).toLocaleDateString() : '',
    qualityTier:           r.quality_tier              || '',
    squareFootage:         r.square_footage            || null,
    // QB
    qbEstimateId:      r.qb_estimate_id || '',
    qbInvoiceId:       r.qb_invoice_id  || '',
    createdAt:         r.created_at,
    updatedAt:         r.updated_at,
    emailThreadId:     r.email_thread_id || '',
    clientEmail:       r.client_email || '',
    // Compatibility aliases (analytics, agents, scheduler use Sheets-era names via g())
    jobStatus:            r.status            || '',
    Status:               r.status            || '',
    'Job Status':         r.status            || '',
    totalJobValue:        r.estimated_value   || 0,
    'Total Job Value':    r.estimated_value   || 0,
    'Contract Amount':    r.estimated_value   || 0,
    'Job Value':          r.estimated_value   || 0,
    serviceType:          r.service           || r.title || '',
    'Service Type':       r.service           || r.title || '',
    'Project Type':       r.service           || r.title || '',
    'Client Name':        r.client_name       || '',
    'Job ID':             r.job_ref           || `JOB-${r.id}`,
    'First Name':         (r.client_name || '').split(' ')[0] || '',
    'Last Name':          (r.client_name || '').split(' ').slice(1).join(' ') || '',
    'Start Date':         r.start_date ? new Date(r.start_date).toLocaleDateString() : '',
    'Deposit Status':     r.deposit_paid ? 'Paid' : 'No',
    'Lead Source':        r.source        || '',
    'Proposal Sent':      r.proposal_status || '',
    'Proposal Sent Date': r.proposal_sent_at || '',
    'Proposal Followup Step': r.proposal_follow_ups || '0',
  };
}

async function getJobs(status) {
  let sql = `
    SELECT j.*, c.name AS client_name, c.email AS client_email
    FROM jobs j
    LEFT JOIN clients c ON j.client_id = c.id
    WHERE j.company_id = $1
  `;
  const params = [COMPANY_ID];
  if (status) { sql += ` AND j.status = $2`; params.push(status); }
  sql += ` ORDER BY j.created_at DESC`;
  const rows = await getAll(sql, params);
  return rows.map(formatJob);
}

async function getJob(id) {
  const r = await getOne(`
    SELECT j.*, c.name AS client_name, c.email AS client_email
    FROM jobs j LEFT JOIN clients c ON j.client_id = c.id
    WHERE j.id = $1 AND j.company_id = $2
  `, [id, COMPANY_ID]);
  return r ? formatJob(r) : null;
}

async function getJobByRef(ref) {
  const r = await getOne(`
    SELECT j.*, c.name AS client_name, c.email AS client_email
    FROM jobs j LEFT JOIN clients c ON j.client_id = c.id
    WHERE j.job_ref = $1 AND j.company_id = $2
  `, [ref, COMPANY_ID]);
  return r ? formatJob(r) : null;
}

async function getJobsForClient(clientId) {
  const rows = await getAll(`
    SELECT j.*, c.name AS client_name, c.email AS client_email
    FROM jobs j LEFT JOIN clients c ON j.client_id = c.id
    WHERE j.client_id = $1 AND j.company_id = $2
    ORDER BY j.created_at DESC
  `, [clientId, COMPANY_ID]);
  return rows.map(formatJob);
}

async function getPhotosForClient(clientId) {
  const rows = await getAll(`
    SELECT p.*, j.job_ref, j.title AS job_title
    FROM photos p
    JOIN jobs j ON p.job_id = j.id
    WHERE j.client_id = $1 AND j.company_id = $2
    ORDER BY p.created_at DESC
  `, [clientId, COMPANY_ID]);
  return rows.map(r => ({
    id: r.id,
    jobId: r.job_id,
    jobRef: r.job_ref || '',
    jobTitle: r.job_title || '',
    url: r.url || r.drive_url || '',
    caption: r.caption || '',
    phase: r.phase || '',
    createdAt: r.created_at,
  }));
}

async function getJobMaterials(jobId) {
  const rows = await getAll(`
    SELECT * FROM job_materials WHERE job_id = $1 AND company_id = $2 ORDER BY category, item
  `, [jobId, COMPANY_ID]);
  return rows.map(r => ({
    id: r.id, jobId: r.job_id, jobRef: r.job_ref || '',
    category: r.category || '', item: r.item || '',
    quantity: r.quantity || '', unitCost: r.unit_cost || '',
    totalCost: r.total_cost || '', bestSource: r.best_source || '',
    status: r.status || 'needed', createdAt: r.created_at,
  }));
}

async function addJobMaterial(jobId, data) {
  return insertOne(`
    INSERT INTO job_materials (company_id, job_id, category, item, quantity, unit_cost, total_cost, best_source, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [COMPANY_ID, jobId, data.category||'', data.item||'', data.quantity||'', data.unitCost||'', data.totalCost||'', data.bestSource||'', data.status||'needed']);
}

async function updateJobMaterial(materialId, data) {
  const allowed = ['category','item','quantity','unit_cost','total_cost','best_source','status'];
  const sets = []; const vals = []; let i = 1;
  for (const [k,v] of Object.entries(data)) {
    const col = k.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowed.includes(col)) { sets.push(`${col} = $${i++}`); vals.push(v); }
  }
  if (!sets.length) return;
  vals.push(materialId); vals.push(COMPANY_ID);
  await query(`UPDATE job_materials SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i++} AND company_id = $${i}`, vals);
}

async function deleteJobMaterial(materialId) {
  await query(`DELETE FROM job_materials WHERE id = $1 AND company_id = $2`, [materialId, COMPANY_ID]);
}

async function createJob(data) {
  // Auto-generate job_ref
  const count = await getOne(`SELECT COUNT(*) FROM jobs WHERE company_id = $1`, [COMPANY_ID]);
  const jobRef = `JOB-${String(parseInt(count.count) + 1).padStart(3, '0')}`;

  return insertOne(`
    INSERT INTO jobs (company_id, client_id, job_ref, title, service, description,
      address, status, estimated_value, start_date, end_date, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
  `, [
    COMPANY_ID,
    data.clientId || data.client_id || null,
    jobRef,
    data.title   || data.projectType || data.service || '',
    data.service || data.projectType || '',
    data.description || data.notes || '',
    data.address || '',
    data.status  || 'pending',
    parseFloat(data.estimatedValue || data.value || 0) || null,
    data.startDate || null,
    data.endDate   || null,
    data.notes || '',
  ]);
}

async function updateJobStatus(id, status) {
  const extra = status === 'completed' ? ', actual_end = NOW()' : status === 'active' ? ', actual_start = NOW()' : '';
  return updateOne(
    `UPDATE jobs SET status = $1, updated_at = NOW()${extra} WHERE id = $2 AND company_id = $3`,
    [status, id, COMPANY_ID]
  );
}

async function updateJobField(id, field, value) {
  const allowed = ['notes', 'status', 'priority', 'estimated_value', 'actual_value',
    'material_cost', 'labor_cost', 'proposal_status', 'contract_status',
    'kickoff_date', 'start_date', 'end_date', 'scope_of_work', 'ai_plan',
    'site_visit_notes', 'site_visit_measurements', 'square_footage', 'quality_tier',
    'site_visit_date', 'email_thread_id', 'proposal_sent_at', 'contract_signed_at',
    'deposit_paid', 'review_requested', 'proposal_follow_ups', 'deposit_invoice_sent',
    'final_invoice_sent', 'thirty_day_sent'];
  if (!allowed.includes(field)) throw new Error(`Field ${field} not updatable`);
  return updateOne(
    `UPDATE jobs SET ${field} = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3`,
    [value, id, COMPANY_ID]
  );
}

// ─── PHASES ─────────────────────────────────────────────────────────────────

function formatPhase(r) {
  return {
    _row:          r.id,
    id:            r.id,
    jobId:         r.job_id,
    phaseNumber:   r.phase_number,
    name:          r.name          || '',
    description:   r.description   || '',
    assignedTo:    r.assigned_to   || '',
    status:        r.status        || 'pending',
    estimatedCost: r.estimated_cost || 0,
    actualCost:    r.actual_cost    || 0,
    startDate:     r.start_date    || '',
    endDate:       r.end_date      || '',
    completedAt:   r.completed_at  || null,
    clientFeedback: r.client_feedback || '',
    notes:         r.notes         || '',
  };
}

async function getPhases(jobId) {
  const rows = await getAll(
    `SELECT * FROM job_phases WHERE job_id = $1 ORDER BY phase_number ASC`,
    [jobId]
  );
  return rows.map(formatPhase);
}

async function updatePhaseStatus(id, status) {
  const extra = status === 'completed' ? ', completed_at = NOW()' : '';
  return updateOne(
    `UPDATE job_phases SET status = $1, updated_at = NOW()${extra} WHERE id = $2`,
    [status, id]
  );
}

async function updatePhaseActualCost(id, cost) {
  return updateOne(
    `UPDATE job_phases SET actual_cost = $1, updated_at = NOW() WHERE id = $2`,
    [parseFloat(cost) || 0, id]
  );
}

module.exports = {
  getJobs, getJob, getJobByRef, getJobsForClient, getPhotosForClient,
  createJob, updateJobStatus, updateJobField,
  getPhases, updatePhaseStatus, updatePhaseActualCost, formatJob,
  getJobMaterials, addJobMaterial, updateJobMaterial, deleteJobMaterial,
};
