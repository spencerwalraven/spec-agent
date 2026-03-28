/**
 * sheets-compat.js — Drop-in replacement for sheets.js
 *
 * Provides the SAME function signatures (readTab, updateCell, appendRow, readRow,
 * readSettings, g, getNextRep, findRowByEmail) but backed by PostgreSQL.
 *
 * Agents that import from '../tools/sheets' can switch to '../tools/sheets-compat'
 * with ZERO code changes.
 */

const dbLeads     = require('../services/leads');
const dbJobs      = require('../services/jobs');
const dbClients   = require('../services/clients');
const dbTeam      = require('../services/team');
const dbEquipment = require('../services/equipment');
const dbMarketing = require('../services/marketing');
const dbSettings  = require('../services/settings');
const dbInvoices  = require('../services/invoices');
const { query, getOne, getAll, insertOne } = require('../db');
const {
  toolReadLead, toolUpdateLead,
  toolReadJob, toolUpdateJob,
  toolReadPhases, toolUpdatePhase, toolAppendPhase,
  toolReadClient, toolUpdateClient,
  toolReadSettings,
} = require('./db-tools');

const COMPANY_ID = 1;

// ─── g() — Universal field getter (same as sheets version) ──────────────────
function g(row, ...keys) {
  if (!row) return '';
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== '' && row[k] !== null) return row[k];
  }
  return '';
}

// ─── readTab(tabName) — Read all rows from a table ──────────────────────────
const TAB_MAP = {
  'Leads':             () => dbLeads.getLeads(),
  'Jobs':              () => dbJobs.getJobs(),
  'Clients':           () => dbClients.getClients(),
  'Team':              () => dbTeam.getTeam(),
  'Equipment':         () => dbEquipment.getEquipment(),
  'Marketing Library': () => dbMarketing.getCampaigns(),
  'Invoices':          () => dbInvoices.getInvoices(),
  // Job Phases require a job_id — return all phases across all jobs
  'Job Phases': async () => {
    const rows = await getAll(
      `SELECT jp.*, j.job_ref FROM job_phases jp JOIN jobs j ON jp.job_id = j.id WHERE j.company_id = $1 ORDER BY jp.job_id, jp.phase_number`,
      [COMPANY_ID]
    );
    return rows.map(r => ({
      _row: r.id, id: r.id, jobId: r.job_id, jobRef: r.job_ref,
      phaseNumber: r.phase_number, name: r.name || '', description: r.description || '',
      assignedTo: r.assigned_to || '', status: r.status || 'pending',
      estimatedCost: r.estimated_cost || 0, actualCost: r.actual_cost || 0,
      startDate: r.start_date || '', endDate: r.end_date || '',
      completedAt: r.completed_at || null, clientFeedback: r.client_feedback || '',
      notes: r.notes || '',
      // Sheet-compatible aliases
      'Job ID': r.job_ref, 'Phase': r.name, 'Status': r.status,
      'Assigned To': r.assigned_to,
      'Estimated Cost': r.estimated_cost || 0, 'Est Cost': r.estimated_cost || 0,
      'Actual Cost': r.actual_cost || 0, 'Actual': r.actual_cost || 0,
    }));
  },
  // Tasks
  'Tasks': async () => {
    const rows = await getAll(`SELECT * FROM tasks WHERE company_id = $1 ORDER BY created_at DESC`, [COMPANY_ID]);
    return rows.map(r => ({
      _row: r.id, id: r.id, title: r.title, description: r.description || '',
      assignedTo: r.assigned_to || '', dueDate: r.due_date || '',
      priority: r.priority || 'medium', status: r.status || 'pending',
    }));
  },
  // Change Orders — use actual change_orders table
  'Change Orders': async () => {
    const rows = await getAll(
      `SELECT co.*, j.job_ref FROM change_orders co LEFT JOIN jobs j ON co.job_id = j.id WHERE co.company_id = $1 ORDER BY co.created_at DESC`,
      [COMPANY_ID]
    );
    return rows.map(r => ({
      _row: r.id, id: r.id, jobId: r.job_id, jobRef: r.job_ref,
      title: r.title || '', description: r.description || '',
      amount: r.amount || 0, status: r.status || 'pending',
      token: r.token || '', clientResponse: r.client_response || '',
      'Job ID': r.job_ref, 'Status': r.status, 'Amount': r.amount,
    }));
  },
  // Learnings — map to activity_log entries for AI learning
  'Learnings': async () => {
    const rows = await getAll(
      `SELECT * FROM activity_log WHERE company_id = $1 AND agent = 'LearningAgent' ORDER BY created_at DESC`,
      [COMPANY_ID]
    );
    return rows.map(r => ({
      _row: r.id, id: r.id, action: r.action || '', detail: r.detail || '',
      entityType: r.entity_type || '', entityId: r.entity_id,
      createdAt: r.created_at,
      'Lesson': r.action, 'Detail': r.detail, 'Job ID': r.entity_id,
    }));
  },
  // Settings — return Label/Value format for scheduler compatibility
  'Settings': async () => {
    const s = await dbSettings.readSettings();
    if (!s) return [];
    return [
      { Label: 'Company Name', Value: s.companyName || '' },
      { Label: 'Company Email', Value: s.email || '' },
      { Label: 'Gmail Send-From Address', Value: s.email || '' },
      { Label: 'Company Phone', Value: s.phone || '' },
      { Label: 'Company Address', Value: s.address || '' },
      { Label: 'Owner / Salesperson Name', Value: s.ownerName || '' },
      { Label: 'Owner Name', Value: s.ownerName || '' },
      { Label: 'Calendly Link', Value: s.calendlyLink || '' },
      { Label: 'Google Review Link', Value: s.googleReviewLink || '' },
      { Label: 'Email Signature', Value: s.emailSignature || '' },
      { Label: 'Email Tone', Value: s.emailTone || '' },
    ];
  },
};

async function readTab(tabName) {
  const fn = TAB_MAP[tabName];
  if (!fn) {
    console.warn(`sheets-compat: readTab("${tabName}") — unknown tab, returning []`);
    return [];
  }
  return await fn();
}

// ─── readRow(tabName, id) — Read a single row ──────────────────────────────
async function readRow(tabName, id) {
  if (!id) return null;
  const numId = parseInt(id);
  if (tabName === 'Leads')   return await dbLeads.getLead(numId);
  if (tabName === 'Jobs')    return await dbJobs.getJob(numId);
  if (tabName === 'Clients') return await dbClients.getClient(numId);
  // Phase by ID
  if (tabName === 'Job Phases') {
    const r = await getOne(`SELECT * FROM job_phases WHERE id = $1`, [numId]);
    return r ? { _row: r.id, ...r } : null;
  }
  // Team member by ID
  if (tabName === 'Team') {
    const members = await dbTeam.getTeam();
    return members.find(m => m.id === numId) || null;
  }
  console.warn(`sheets-compat: readRow("${tabName}", ${id}) — unknown tab`);
  return null;
}

// ─── readSettings() — Read company settings ─────────────────────────────────
async function readSettings() {
  return await dbSettings.readSettings();
}

// ─── updateCell(tabName, id, fieldOrFields, value) ──────────────────────────
// fieldOrFields can be a string or an array of possible column names

const LEAD_FIELD_MAP = {
  'Status': 'status', 'Lead Status': 'status', 'leadStatus': 'status',
  'Lead Score': 'score', 'leadScore': 'score', 'AI Score': 'score', 'Score': 'score',
  'Notes': 'notes', 'notes': 'notes',
  'AI Summary': 'ai_summary', 'aiSummary': 'ai_summary',
  'Outreach Sent': 'outreach_sent', 'outreachSent': 'outreach_sent',
  'SMS Sent': 'sms_sent', 'smsSent': 'sms_sent',
  'Last Contact': 'last_contact_at', 'Last Contacted': 'last_contact_at', 'lastContact': 'last_contact_at',
  'Email Thread ID': 'email_thread_id', 'emailThread': 'email_thread_id',
  'Assigned To': 'assigned_to', 'Sales Rep': 'assigned_to', 'Assigned Rep': 'assigned_to',
  'Nurture Step': 'follow_up_count', 'Nurture Day': 'follow_up_count', 'nurtureStep': 'follow_up_count',
  'Service Requested': 'service', 'Project Type': 'service',
  'Phone Number': 'phone', 'Phone': 'phone',
  'Email': 'email',
  'Address': 'address',
  'Source': 'source',
};

const JOB_FIELD_MAP = {
  'Status': 'status', 'Job Status': 'status', 'jobStatus': 'status',
  'Proposal Status': 'proposal_status', 'Proposal Sent': 'proposal_status', 'proposalStatus': 'proposal_status',
  'Contract Status': 'contract_status', 'contractStatus': 'contract_status',
  'Estimated Value': 'estimated_value', 'estimatedValue': 'estimated_value', 'Contract Value': 'estimated_value',
  'Actual Value': 'actual_value', 'actualValue': 'actual_value',
  'Material Cost': 'material_cost', 'materialCost': 'material_cost',
  'Labor Cost': 'labor_cost', 'laborCost': 'labor_cost',
  'Notes': 'notes', 'Job Notes': 'notes', 'notes': 'notes',
  'AI Plan': 'ai_plan', 'aiPlan': 'ai_plan',
  'Scope of Work': 'scope_of_work', 'scopeOfWork': 'scope_of_work',
  'Start Date': 'start_date', 'startDate': 'start_date',
  'End Date': 'end_date', 'endDate': 'end_date',
  'Kickoff Date': 'kickoff_date', 'kickoffDate': 'kickoff_date',
  'Deposit Paid': 'deposit_paid', 'depositPaid': 'deposit_paid',
  'Proposal Sent Date': 'proposal_sent_at', 'Proposal Date': 'proposal_sent_at',
  'Contract Signed': 'contract_signed_at', 'contractSignedAt': 'contract_signed_at',
  'Proposal Token': 'proposal_token', 'proposalToken': 'proposal_token',
  'Proposal Followup Step': 'proposal_follow_ups', 'proposalFollowUps': 'proposal_follow_ups',
  'Weather Risk': 'weather_risk', 'weatherRisk': 'weather_risk',
  'Review Requested': 'review_requested', 'reviewRequested': 'review_requested',
  'QB Estimate ID': 'qb_estimate_id', 'QB Invoice ID': 'qb_invoice_id',
};

const CLIENT_FIELD_MAP = {
  'Notes': 'notes', 'notes': 'notes',
  'Communication Style': 'communication_style', 'communicationStyle': 'communication_style',
  'Decision Factors': 'decision_factors', 'decisionFactors': 'decision_factors',
  'Key Concerns': 'key_concerns', 'keyConcerns': 'key_concerns',
  'Preferred Contact': 'preferred_contact', 'preferredContact': 'preferred_contact',
  'Total Revenue': 'total_revenue', 'totalRevenue': 'total_revenue', 'Lifetime Value': 'total_revenue',
  'Job Count': 'job_count', 'jobCount': 'job_count', 'Jobs Completed': 'job_count',
  'Last Job Date': 'last_job_at', 'lastJobAt': 'last_job_at',
  'Email': 'email', 'Phone': 'phone', 'Address': 'address',
};

const PHASE_FIELD_MAP = {
  'Status': 'status', 'Phase Status': 'status',
  'Actual Cost': 'actual_cost', 'actualCost': 'actual_cost',
  'Client Feedback': 'client_feedback', 'clientFeedback': 'client_feedback',
  'Completed Date': 'completed_at', 'Completion Date': 'completed_at',
  'Notes': 'notes',
  'Sub Notified': 'sub_notified', 'subNotified': 'sub_notified',
};

function resolveField(fieldOrFields, fieldMap) {
  const fields = Array.isArray(fieldOrFields) ? fieldOrFields : [fieldOrFields];
  for (const f of fields) {
    if (fieldMap[f]) return fieldMap[f];
  }
  // Fallback: camelCase → snake_case
  const f = fields[0];
  return f.replace(/([A-Z])/g, '_$1').toLowerCase();
}

async function updateCell(tabName, id, fieldOrFields, value) {
  const numId = parseInt(id);
  if (isNaN(numId)) return;

  let col, table;
  if (tabName === 'Leads') {
    col = resolveField(fieldOrFields, LEAD_FIELD_MAP);
    table = 'leads';
  } else if (tabName === 'Jobs') {
    col = resolveField(fieldOrFields, JOB_FIELD_MAP);
    table = 'jobs';
  } else if (tabName === 'Clients') {
    col = resolveField(fieldOrFields, CLIENT_FIELD_MAP);
    table = 'clients';
  } else if (tabName === 'Job Phases') {
    col = resolveField(fieldOrFields, PHASE_FIELD_MAP);
    table = 'job_phases';
  } else if (tabName === 'Team') {
    const TEAM_ALLOWED = ['name','role','email','phone','status','notes','performance_score','jobs_completed'];
    col = (Array.isArray(fieldOrFields) ? fieldOrFields[0] : fieldOrFields).replace(/([A-Z])/g, '_$1').toLowerCase();
    if (!TEAM_ALLOWED.includes(col)) { console.warn(`sheets-compat: updateCell Team — blocked field "${col}"`); return; }
    table = 'team';
  } else {
    console.warn(`sheets-compat: updateCell("${tabName}") — unknown tab`);
    return;
  }

  // Handle boolean fields
  if (['outreach_sent', 'sms_sent', 'deposit_paid', 'review_requested', 'kickoff_scheduled', 'sub_notified'].includes(col)) {
    value = value === true || value === 'true' || value === 'Yes' || value === 'yes' || value === 'TRUE';
  }

  try {
    await query(`UPDATE ${table} SET ${col} = $1, updated_at = NOW() WHERE id = $2`, [value, numId]);
  } catch (e) {
    console.error(`sheets-compat: updateCell("${tabName}", ${numId}, "${col}") failed:`, e.message);
  }
}

// ─── appendRow(tabName, data) — Insert a new row ────────────────────────────
async function appendRow(tabName, data) {
  if (tabName === 'Leads') {
    return await dbLeads.createLead(data);
  }
  if (tabName === 'Clients') {
    return await dbClients.createClient(data);
  }
  if (tabName === 'Jobs') {
    return await dbJobs.createJob(data);
  }
  if (tabName === 'Job Phases') {
    return await toolAppendPhase({ data });
  }
  if (tabName === 'Invoices') {
    return await dbInvoices.createInvoice(data);
  }
  if (tabName === 'Tasks') {
    return await insertOne(
      `INSERT INTO tasks (company_id, title, description, assigned_to, due_date, priority, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [COMPANY_ID, data.title||'', data.description||'', data.assignedTo||data.assigned_to||'',
       data.dueDate||data.due_date||null, data.priority||'medium', data.status||'pending']
    );
  }
  if (tabName === 'Equipment') {
    return await dbEquipment.createEquipment(data);
  }
  if (tabName === 'Change Orders') {
    const jobId = data.jobId || data.job_id || null;
    return await insertOne(
      `INSERT INTO change_orders (company_id, job_id, title, description, amount, status, token)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [COMPANY_ID, jobId, data.title||'', data.description||'',
       parseFloat(data.amount||0)||0, data.status||'pending',
       data.token || require('crypto').randomBytes(16).toString('hex')]
    );
  }
  if (tabName === 'Learnings') {
    return await insertOne(
      `INSERT INTO activity_log (company_id, agent, action, detail, entity_type, entity_id)
       VALUES ($1, 'LearningAgent', $2, $3, $4, $5)`,
      [COMPANY_ID, data.lesson||data.action||data.Lesson||'',
       data.detail||data.Detail||'', data.entityType||data.entity_type||'job',
       parseInt(data.entityId||data.entity_id||data.jobId||0)||null]
    );
  }
  console.warn(`sheets-compat: appendRow("${tabName}") — unknown tab`);
  return null;
}

// ─── getNextRep() — Round-robin sales rep assignment ────────────────────────
let _lastRepIndex = -1;

async function getNextRep() {
  const team = await dbTeam.getTeam();
  const reps = team.filter(m =>
    m.status === 'active' &&
    (m.loginRole === 'sales' || m.loginRole === 'owner' || m.role?.toLowerCase().includes('estimat') || m.role?.toLowerCase().includes('sales'))
  );
  if (reps.length === 0) {
    // Fallback to owner
    const owner = team.find(m => m.loginRole === 'owner' || m.role?.toLowerCase().includes('owner'));
    if (owner) return { name: owner.name, email: owner.email, calendlyLink: '' };
    return null;
  }
  _lastRepIndex = (_lastRepIndex + 1) % reps.length;
  const rep = reps[_lastRepIndex];
  return { name: rep.name, email: rep.email, calendlyLink: '' };
}

// ─── findRowByEmail(email) — Find a lead by email ──────────────────────────
async function findRowByEmail(email) {
  if (!email) return null;
  const r = await getOne(
    `SELECT * FROM leads WHERE LOWER(email) = LOWER($1) AND company_id = $2`,
    [email, COMPANY_ID]
  );
  if (r) return dbLeads.formatLead ? dbLeads.formatLead(r) : { _row: r.id, ...r };
  return null;
}

// ─── createJobFromLead(leadId) — Convert lead data into a job ───────────────
async function createJobFromLead(leadId) {
  const lead = await dbLeads.getLead(leadId);
  if (!lead) throw new Error('Lead not found');

  // Find or create client
  let client = await getOne(
    `SELECT * FROM clients WHERE LOWER(email) = LOWER($1) AND company_id = $2`,
    [lead.email, COMPANY_ID]
  );
  if (!client) {
    client = await dbClients.createClient({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      address: lead.address,
      source: lead.source,
      lead_id: lead.id,
    });
  }

  const job = await dbJobs.createJob({
    clientId: client.id,
    title: lead.projectType || lead.service || 'New Project',
    service: lead.projectType || lead.service || '',
    description: lead.description || lead.message || '',
    address: lead.address || '',
    status: 'pending',
  });

  return job;
}

// ─── getLastRow(tabName) — Get the count (used for ID generation) ───────────
async function getLastRow(tabName) {
  const tableMap = { Leads:'leads', Jobs:'jobs', Clients:'clients', 'Job Phases':'job_phases', Team:'team' };
  const table = tableMap[tabName];
  if (!table) return 0;
  const r = await getOne(`SELECT COUNT(*) AS cnt FROM ${table} WHERE company_id = $1`, [COMPANY_ID]);
  return parseInt(r.cnt) || 0;
}

// ─── writeSettings(data) — Write settings back to DB ────────────────────────
async function writeSettings(data) {
  return await dbSettings.writeSettings(data);
}

// ─── Exports — match sheets.js signature ────────────────────────────────────
module.exports = {
  // Core Sheets-compat functions
  readTab,
  readRow,
  readSettings,
  writeSettings,
  updateCell,
  appendRow,
  getLastRow,
  g,
  getNextRep,
  findRowByEmail,
  createJobFromLead,

  // Legacy aliases (used by agent.js)
  readLead:        (id) => readRow('Leads', id),
  findLeadByEmail: findRowByEmail,
  updateLead:      (id, field, value) => updateCell('Leads', id, field, value),

  // db-tools re-exports (agents use these directly)
  toolReadLead,
  toolUpdateLead,
  toolReadJob,
  toolUpdateJob,
  toolReadPhases,
  toolUpdatePhase,
  toolAppendPhase,
  toolReadClient,
  toolUpdateClient,
  toolReadSettings,
};
