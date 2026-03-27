/**
 * db-tools.js — PostgreSQL-backed agent tool wrappers
 * Replaces the Google Sheets tool wrappers in sheets.js for all agent reads/writes.
 * rowNumber === database id in all cases.
 */

const { query, getOne, getAll, insertOne, updateOne } = require('../db');
const dbLeads = require('../services/leads');
const dbClients = require('../services/clients');
const dbJobs = require('../services/jobs');
const dbSettings = require('../services/settings');

// ---------------------------------------------------------------------------
// g — flexible field getter: tries each key in order, returns first truthy value or ''
// ---------------------------------------------------------------------------
function g(obj, ...keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }
  return '';
}

// ---------------------------------------------------------------------------
// Lead tools
// ---------------------------------------------------------------------------

async function toolReadLead(id) {
  try {
    const lead = await dbLeads.getLead(id);
    if (!lead) return null;
    return dbLeads.formatLead(lead);
  } catch (err) {
    console.error('[toolReadLead] error:', err.message);
    return null;
  }
}

async function toolUpdateLead(id, updates) {
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;

    if (key === 'status' || key === 'leadStatus') {
      await dbLeads.updateLeadStatus(id, value);
    } else if (key === 'score' || key === 'leadScore') {
      const label = updates.label || updates.scoreLabel || null;
      const summary = updates.summary || updates.scoreSummary || null;
      await dbLeads.updateLeadScore(id, value, label, summary);
    } else if (key === 'notes' || key === 'leadNote') {
      await dbLeads.updateLeadNote(id, value);
    } else if (key === 'lastContact' || key === 'lastContacted') {
      await query(
        'UPDATE leads SET last_contact=NOW(), updated_at=NOW() WHERE id=$1',
        [id]
      );
    } else if (key === 'emailThreadId' || key === 'emailThread') {
      await query(
        'UPDATE leads SET email_thread_id=$1 WHERE id=$2',
        [value, id]
      );
    } else if (
      key === 'label' || key === 'scoreLabel' ||
      key === 'summary' || key === 'scoreSummary'
    ) {
      // Skip — handled as part of score update above
      continue;
    } else {
      // Generic field update
      await query(
        `UPDATE leads SET ${key}=$1, updated_at=NOW() WHERE id=$2 AND company_id=1`,
        [value, id]
      );
    }
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Job tools
// ---------------------------------------------------------------------------

async function toolReadJob(id) {
  try {
    const job = await dbJobs.getJob(id);
    if (!job) return null;
    return dbJobs.formatJob(job);
  } catch (err) {
    console.error('[toolReadJob] error:', err.message);
    return null;
  }
}

async function toolUpdateJob(id, updates) {
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;

    if (key === 'status' || key === 'jobStatus') {
      await dbJobs.updateJobStatus(id, value);
    } else if (key === 'notes' || key === 'jobNotes') {
      await dbJobs.updateJobField(id, 'notes', value);
    } else if (key === 'proposalStatus') {
      await dbJobs.updateJobField(id, 'proposal_status', value);
    } else if (key === 'contractStatus') {
      await dbJobs.updateJobField(id, 'contract_status', value);
    } else if (key === 'estimatedValue') {
      await dbJobs.updateJobField(id, 'estimated_value', value);
    } else if (key === 'actualValue') {
      await dbJobs.updateJobField(id, 'actual_value', value);
    } else if (key === 'aiPlan') {
      await dbJobs.updateJobField(id, 'ai_plan', value);
    } else if (key === 'scopeOfWork') {
      await dbJobs.updateJobField(id, 'scope_of_work', value);
    } else if (key === 'kickoffDate') {
      await dbJobs.updateJobField(id, 'kickoff_date', value);
    } else if (key === 'proposalSentAt') {
      await query(
        'UPDATE jobs SET proposal_sent_at=NOW(), updated_at=NOW() WHERE id=$1',
        [id]
      );
    } else if (key === 'proposalSignedAt') {
      await query(
        'UPDATE jobs SET proposal_signed_at=NOW(), updated_at=NOW() WHERE id=$1',
        [id]
      );
    } else if (key === 'contractSignedAt') {
      await query(
        'UPDATE jobs SET contract_signed_at=NOW(), updated_at=NOW() WHERE id=$1',
        [id]
      );
    } else if (key === 'depositPaid') {
      await query(
        'UPDATE jobs SET deposit_paid=$1, updated_at=NOW() WHERE id=$2',
        [value, id]
      );
    } else if (key === 'emailThreadId') {
      await query(
        "UPDATE jobs SET notes=CONCAT(notes, ' [threadId:', $1, ']'), updated_at=NOW() WHERE id=$2",
        [value, id]
      );
    } else {
      // Generic field update
      await query(
        `UPDATE jobs SET ${key}=$1, updated_at=NOW() WHERE id=$2 AND company_id=1`,
        [value, id]
      );
    }
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Client tools
// ---------------------------------------------------------------------------

async function toolReadClient(id) {
  try {
    let client;
    if (typeof id === 'string' && isNaN(Number(id))) {
      client = await dbClients.getClientByName(id);
    } else {
      client = await dbClients.getClient(id);
    }
    if (!client) return null;
    return dbClients.formatClient(client);
  } catch (err) {
    console.error('[toolReadClient] error:', err.message);
    return null;
  }
}

async function toolUpdateClient(id, updates) {
  const fieldMap = {
    notes: 'notes',
    preferredContact: 'preferred_contact',
    communicationStyle: 'communication_style',
    decisionFactors: 'decision_factors',
    keyConcerns: 'key_concerns',
  };

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    const column = fieldMap[key] || key;
    await query(
      `UPDATE clients SET ${column}=$1, updated_at=NOW() WHERE id=$2 AND company_id=1`,
      [value, id]
    );
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Settings tools
// ---------------------------------------------------------------------------

async function toolReadSettings() {
  try {
    return await dbSettings.readSettings();
  } catch (err) {
    console.error('[toolReadSettings] error:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Phase tools
// ---------------------------------------------------------------------------

async function toolReadPhases(jobId) {
  try {
    return await dbJobs.getPhases(jobId);
  } catch (err) {
    console.error('[toolReadPhases] error:', err.message);
    return [];
  }
}

async function toolUpdatePhase(phaseId, updates) {
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;

    if (key === 'status') {
      await dbJobs.updatePhaseStatus(phaseId, value);
    } else if (key === 'actualCost') {
      await dbJobs.updatePhaseActualCost(phaseId, value);
    } else if (key === 'clientFeedback') {
      await query(
        'UPDATE job_phases SET client_feedback=$1, updated_at=NOW() WHERE id=$2',
        [value, phaseId]
      );
    } else if (key === 'completedAt' || key === 'completionDate') {
      await query(
        'UPDATE job_phases SET completed_at=NOW(), updated_at=NOW() WHERE id=$1',
        [phaseId]
      );
    } else {
      await query(
        `UPDATE job_phases SET ${key}=$1, updated_at=NOW() WHERE id=$2`,
        [value, phaseId]
      );
    }
  }
  return { ok: true };
}

async function toolAppendPhase(jobId, phaseData) {
  // Determine next phase_number
  const maxRow = await getOne(
    'SELECT MAX(phase_number) AS max_num FROM job_phases WHERE job_id=$1',
    [jobId]
  );
  const nextNum = maxRow && maxRow.max_num != null ? Number(maxRow.max_num) + 1 : 1;

  const name = g(phaseData, 'name', 'phaseName');
  const description = g(phaseData, 'description', 'notes');
  const assignedTo = g(phaseData, 'assignedTo', 'assigned_to');
  const estimatedCost = g(phaseData, 'estimatedCost', 'cost', 'estimated_cost') || null;
  const startDate = g(phaseData, 'startDate') || null;
  const endDate = g(phaseData, 'endDate') || null;
  const status = phaseData.status || 'pending';

  const result = await query(
    `INSERT INTO job_phases
      (job_id, phase_number, name, description, assigned_to, estimated_cost, start_date, end_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [jobId, nextNum, name, description, assignedTo, estimatedCost, startDate, endDate, status]
  );

  return result.rows[0].id;
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

async function findLeadByEmail(email) {
  try {
    const row = await getOne(
      'SELECT * FROM leads WHERE company_id=1 AND LOWER(email)=LOWER($1) LIMIT 1',
      [email]
    );
    if (!row) return null;
    return dbLeads.formatLead(row);
  } catch (err) {
    console.error('[findLeadByEmail] error:', err.message);
    return null;
  }
}

async function findJobByEmail(email) {
  try {
    const row = await getOne(
      `SELECT j.*, c.name AS client_name
       FROM jobs j
       LEFT JOIN clients c ON j.client_id = c.id
       WHERE j.company_id=1
         AND c.email ILIKE $1
         AND j.status NOT IN ('completed', 'cancelled')
       ORDER BY j.created_at DESC
       LIMIT 1`,
      [email]
    );
    if (!row) return null;
    return dbJobs.formatJob(row);
  } catch (err) {
    console.error('[findJobByEmail] error:', err.message);
    return null;
  }
}

async function findJobByClientName(name) {
  try {
    const row = await getOne(
      `SELECT j.*, c.name AS client_name
       FROM jobs j
       LEFT JOIN clients c ON j.client_id = c.id
       WHERE j.company_id=1
         AND c.name ILIKE $1
         AND j.status NOT IN ('completed', 'cancelled')
       ORDER BY j.created_at DESC
       LIMIT 1`,
      [`%${name}%`]
    );
    if (!row) return null;
    return dbJobs.formatJob(row);
  } catch (err) {
    console.error('[findJobByClientName] error:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  g,
  toolReadLead,
  toolUpdateLead,
  toolReadJob,
  toolUpdateJob,
  toolReadClient,
  toolUpdateClient,
  toolReadSettings,
  toolReadPhases,
  toolUpdatePhase,
  toolAppendPhase,
  findLeadByEmail,
  findJobByEmail,
  findJobByClientName,
};
