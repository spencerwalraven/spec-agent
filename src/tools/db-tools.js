/**
 * db-tools.js — PostgreSQL-backed agent tool wrappers
 * Drop-in replacements for the Sheets-based tool wrappers in sheets.js
 * These are called by the Anthropic tool-use loop in each agent.
 */

const dbLeads   = require('../services/leads');
const dbJobs    = require('../services/jobs');
const dbClients = require('../services/clients');
const dbSettings = require('../services/settings');

// ─── LEAD TOOLS ──────────────────────────────────────────────────────────────

/**
 * Read a lead by DB id.
 * Agents pass { leadId } or legacy { rowNumber } — both work.
 */
async function toolReadLead({ leadId, rowNumber }) {
  const id = leadId || rowNumber;
  if (!id) return JSON.stringify({ error: 'leadId required' });
  const lead = await dbLeads.getLead(id);
  if (!lead) return JSON.stringify({ error: `Lead ${id} not found` });
  return JSON.stringify(lead, null, 2);
}

/**
 * Update a single field on a lead.
 * field uses camelCase matching the formatLead output, OR snake_case DB column.
 */
async function toolUpdateLead({ leadId, rowNumber, field, value }) {
  const id = leadId || rowNumber;
  if (!id || !field) return 'Error: leadId and field required';

  // Map friendly field names → DB operations
  const fieldMap = {
    leadStatus:   () => dbLeads.updateLeadStatus(id, value),
    status:       () => dbLeads.updateLeadStatus(id, value),
    notes:        () => dbLeads.updateLeadNote(id, value),
    leadScore:    () => dbLeads.updateLeadScore(id, parseInt(value) || 0, null, null),
    score:        () => dbLeads.updateLeadScore(id, parseInt(value) || 0, null, null),
    aiSummary:    () => dbLeads.updateLeadScore(id, null, null, value),
    lastContact:  () => dbLeads.logLeadContact(id),
  };

  const handler = fieldMap[field];
  if (handler) {
    await handler();
    return `Lead ${id} — ${field} updated to "${value}"`;
  }

  // Generic fallback — direct column update via query
  const { query } = require('../db');
  const allowed = ['name','email','phone','address','service','message','source',
    'score','score_label','status','notes','ai_summary','outreach_sent','sms_sent',
    'nurture_step','assigned_to','email_thread_id','last_contact'];
  const col = field.replace(/([A-Z])/g, '_$1').toLowerCase(); // camelCase → snake_case
  if (!allowed.includes(col)) return `Error: field "${field}" not updatable`;
  await query(`UPDATE leads SET ${col} = $1, updated_at = NOW() WHERE id = $2`, [value, id]);
  return `Lead ${id} — ${col} updated to "${value}"`;
}

// ─── JOB TOOLS ───────────────────────────────────────────────────────────────

/**
 * Read a job by DB id or job_ref (e.g. "JOB-003").
 */
async function toolReadJob({ jobId, rowNumber, jobRef }) {
  let job;
  if (jobRef) {
    job = await dbJobs.getJobByRef(jobRef);
  } else {
    const id = jobId || rowNumber;
    job = id ? await dbJobs.getJob(id) : null;
  }
  if (!job) return JSON.stringify({ error: `Job not found` });
  return JSON.stringify(job, null, 2);
}

/**
 * Update a single field on a job.
 */
async function toolUpdateJob({ jobId, rowNumber, field, value }) {
  const id = jobId || rowNumber;
  if (!id || !field) return 'Error: jobId and field required';

  // Status shortcuts
  if (field === 'status' || field === 'jobStatus') {
    await dbJobs.updateJobStatus(id, value);
    return `Job ${id} — status updated to "${value}"`;
  }

  // Map camelCase → snake_case for updateJobField
  const colMap = {
    notes:          'notes',
    priority:       'priority',
    estimatedValue: 'estimated_value',
    actualValue:    'actual_value',
    materialCost:   'material_cost',
    laborCost:      'labor_cost',
    proposalStatus: 'proposal_status',
    contractStatus: 'contract_status',
    kickoffDate:    'kickoff_date',
    startDate:      'start_date',
    endDate:        'end_date',
    scopeOfWork:    'scope_of_work',
    aiPlan:         'ai_plan',
  };

  const col = colMap[field] || field;
  await dbJobs.updateJobField(id, col, value);
  return `Job ${id} — ${col} updated to "${value}"`;
}

// ─── PHASE TOOLS ─────────────────────────────────────────────────────────────

/**
 * Read all phases for a job.
 */
async function toolReadPhases({ jobId }) {
  if (!jobId) return JSON.stringify({ error: 'jobId required' });
  const phases = await dbJobs.getPhases(jobId);
  return JSON.stringify(phases, null, 2);
}

/**
 * Update a phase's status.
 */
async function toolUpdatePhase({ phaseId, rowNumber, field, value }) {
  const id = phaseId || rowNumber;
  if (!id) return 'Error: phaseId required';

  if (field === 'status') {
    await dbJobs.updatePhaseStatus(id, value);
    return `Phase ${id} — status updated to "${value}"`;
  }
  if (field === 'actualCost' || field === 'actual_cost') {
    await dbJobs.updatePhaseActualCost(id, value);
    return `Phase ${id} — actual cost updated to $${value}`;
  }
  if (field === 'clientFeedback' || field === 'client_feedback') {
    const { query } = require('../db');
    await query(`UPDATE job_phases SET client_feedback = $1, updated_at = NOW() WHERE id = $2`, [value, id]);
    return `Phase ${id} — client feedback updated`;
  }

  return `Error: field "${field}" not supported for phases`;
}

/**
 * Append a new phase to a job.
 */
async function toolAppendPhase({ data }) {
  const { insertOne } = require('../db');
  const { query } = require('../db');

  // Get next phase number
  const res = await query(`SELECT COUNT(*) FROM job_phases WHERE job_id = $1`, [data.jobId || data.job_id]);
  const phaseNumber = parseInt(res.rows[0].count) + 1;

  const phase = await insertOne(`
    INSERT INTO job_phases (job_id, phase_number, name, description, assigned_to,
      status, estimated_cost, start_date, end_date)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
  `, [
    data.jobId || data.job_id,
    phaseNumber,
    data.name || data.phaseName || '',
    data.description || '',
    data.assignedTo || data.assigned_to || '',
    data.status || 'pending',
    parseFloat(data.estimatedCost || data.estimated_cost || 0) || null,
    data.startDate || data.start_date || null,
    data.endDate || data.end_date || null,
  ]);
  return JSON.stringify(phase, null, 2);
}

// ─── CLIENT TOOLS ────────────────────────────────────────────────────────────

/**
 * Read a client by id or name.
 */
async function toolReadClient({ clientId, rowNumber, name }) {
  let client;
  if (name) {
    client = await dbClients.getClientByName(name);
  } else {
    const id = clientId || rowNumber;
    client = id ? await dbClients.getClient(id) : null;
  }
  if (!client) return JSON.stringify({ error: 'Client not found' });
  return JSON.stringify(client, null, 2);
}

/**
 * Update a single field on a client.
 */
async function toolUpdateClient({ clientId, rowNumber, field, value }) {
  const id = clientId || rowNumber;
  if (!id || !field) return 'Error: clientId and field required';

  const { query } = require('../db');
  const colMap = {
    notes:              'notes',
    communicationStyle: 'communication_style',
    decisionFactors:    'decision_factors',
    keyConcerns:        'key_concerns',
    preferredContact:   'preferred_contact',
    totalRevenue:       'total_revenue',
    jobCount:           'job_count',
    lastJobAt:          'last_job_at',
  };

  const col = colMap[field] || field;
  const allowed = Object.values(colMap).concat(['email','phone','address','source']);
  if (!allowed.includes(col)) return `Error: field "${field}" not updatable`;

  await query(`UPDATE clients SET ${col} = $1, updated_at = NOW() WHERE id = $2`, [value, id]);
  return `Client ${id} — ${col} updated to "${value}"`;
}

// ─── SETTINGS TOOL ───────────────────────────────────────────────────────────

/**
 * Read company settings — injected into agent system prompts.
 */
async function toolReadSettings() {
  const s = await dbSettings.readSettings();

  const guidelines = [];
  if (s.emailTone)        guidelines.push(`Write all emails in a ${s.emailTone} tone.`);
  if (s.aboutUs)          guidelines.push(`Company background: ${s.aboutUs}`);
  if (s.keySellingPoints) guidelines.push(`Key selling points: ${s.keySellingPoints}`);

  const output = { ...s };
  if (guidelines.length) output._communication_guidelines = guidelines.join(' ');
  return JSON.stringify(output, null, 2);
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

module.exports = {
  // Lead tools
  toolReadLead,
  toolUpdateLead,
  // Job tools
  toolReadJob,
  toolUpdateJob,
  // Phase tools
  toolReadPhases,
  toolUpdatePhase,
  toolAppendPhase,
  // Client tools
  toolReadClient,
  toolUpdateClient,
  // Settings
  toolReadSettings,
};
