/**
 * Tasks service — PostgreSQL CRUD
 */
const { getAll, insertOne, updateOne, query } = require('../db');

const COMPANY_ID = 1;

function formatTask(r) {
  return {
    _row:        r.id,
    id:          r.id,
    jobId:       r.job_id     || null,
    title:       r.title      || '',
    description: r.description || '',
    assignedTo:  r.assigned_to || '',
    dueDate:     r.due_date   ? new Date(r.due_date).toLocaleDateString() : '',
    priority:    r.priority   || 'medium',
    status:      r.status     || 'pending',
    completedAt: r.completed_at || null,
    createdAt:   r.created_at,
  };
}

async function getTasks(status) {
  let sql = `SELECT * FROM tasks WHERE company_id = $1`;
  const params = [COMPANY_ID];
  if (status && status !== 'all') {
    sql += ` AND status = $2`;
    params.push(status);
  }
  sql += ` ORDER BY
    CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
    due_date ASC NULLS LAST, created_at DESC`;
  const rows = await getAll(sql, params);
  return rows.map(formatTask);
}

async function createTask(data) {
  return insertOne(`
    INSERT INTO tasks (company_id, job_id, title, description, assigned_to, due_date, priority, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  `, [
    COMPANY_ID,
    data.jobId || data.job_id || null,
    data.title || '',
    data.description || '',
    data.assignedTo || data.assigned_to || '',
    data.dueDate || data.due_date || null,
    data.priority || 'medium',
    'pending',
  ]);
}

async function completeTask(id) {
  return updateOne(
    `UPDATE tasks SET status = 'completed', completed_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND company_id = $2`,
    [id, COMPANY_ID]
  );
}

async function deleteTask(id) {
  await query(`DELETE FROM tasks WHERE id = $1 AND company_id = $2`, [id, COMPANY_ID]);
}

module.exports = { getTasks, createTask, completeTask, deleteTask, formatTask };
