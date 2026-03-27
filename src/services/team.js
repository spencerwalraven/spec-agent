/**
 * Team & Time Clock service — PostgreSQL CRUD
 */
const { getAll, getOne, insertOne, updateOne, query } = require('../db');

const COMPANY_ID = 1;

function formatMember(r) {
  return {
    _row:             r.id,
    id:               r.id,
    name:             r.name              || '',
    role:             r.role              || '',
    email:            r.email             || '',
    phone:            r.phone             || '',
    status:           r.status            || 'active',
    performanceScore: r.performance_score || null,
    jobsCompleted:    r.jobs_completed    || 0,
    qbEmployeeId:     r.qb_employee_id   || '',
  };
}

async function getTeam() {
  const rows = await getAll(
    `SELECT * FROM team WHERE company_id = $1 ORDER BY name ASC`,
    [COMPANY_ID]
  );
  return rows.map(formatMember);
}

async function toggleMemberStatus(id) {
  const member = await getOne(`SELECT status FROM team WHERE id = $1`, [id]);
  if (!member) throw new Error('Member not found');
  const newStatus = member.status === 'active' ? 'inactive' : 'active';
  return updateOne(`UPDATE team SET status = $1, updated_at = NOW() WHERE id = $2`, [newStatus, id]);
}

// ─── TIME CLOCK ─────────────────────────────────────────────────────────────

function formatPunch(r) {
  return {
    _row:           r.id,
    id:             r.id,
    name:           r.team_member_name || '',
    jobId:          r.job_id           || null,
    jobName:        r.job_name         || '',
    clockIn:        r.clock_in         || null,
    clockOut:       r.clock_out        || null,
    hours:          r.hours            || null,
    qbSynced:       r.qb_synced        || false,
    createdAt:      r.created_at,
  };
}

async function getTimeclock(date) {
  // Get all punches for a date (default today)
  const d = date || new Date().toISOString().slice(0, 10);
  const rows = await getAll(`
    SELECT * FROM time_clock
    WHERE company_id = $1
      AND DATE(clock_in) = $2
    ORDER BY clock_in DESC
  `, [COMPANY_ID, d]);
  return rows.map(formatPunch);
}

async function getCurrentlyClocked() {
  const rows = await getAll(`
    SELECT * FROM time_clock
    WHERE company_id = $1 AND clock_out IS NULL
    ORDER BY clock_in DESC
  `, [COMPANY_ID]);
  return rows.map(formatPunch);
}

async function clockIn(name, jobId, jobName) {
  return insertOne(`
    INSERT INTO time_clock (company_id, team_member_name, job_id, job_name, clock_in)
    VALUES ($1,$2,$3,$4,NOW())
  `, [COMPANY_ID, name, jobId || null, jobName || '']);
}

async function clockOut(punchId) {
  // Calculate hours
  const punch = await getOne(`SELECT * FROM time_clock WHERE id = $1`, [punchId]);
  if (!punch || punch.clock_out) throw new Error('Punch not found or already clocked out');
  const hours = ((Date.now() - new Date(punch.clock_in).getTime()) / 3600000).toFixed(2);
  return updateOne(`
    UPDATE time_clock SET clock_out = NOW(), hours = $1, updated_at = NOW()
    WHERE id = $2
  `, [hours, punchId]);
}

async function getLastOpenPunch(name) {
  return getOne(`
    SELECT * FROM time_clock
    WHERE company_id = $1 AND team_member_name = $2 AND clock_out IS NULL
    ORDER BY clock_in DESC LIMIT 1
  `, [COMPANY_ID, name]);
}

async function markQbSynced(punchId, qbTimeActivityId) {
  await query(`
    UPDATE time_clock SET qb_synced = TRUE, qb_time_activity_id = $1
    WHERE id = $2
  `, [qbTimeActivityId || null, punchId]);
}

module.exports = {
  getTeam, toggleMemberStatus,
  getTimeclock, getCurrentlyClocked, clockIn, clockOut, getLastOpenPunch, markQbSynced,
  formatMember, formatPunch,
};
