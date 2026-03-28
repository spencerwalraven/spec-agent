/**
 * PostgreSQL connection pool — SPEC Systems
 * Replaces Google Sheets as the primary data store.
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

let _loggedConnect = false;
pool.on('connect', () => { if (!_loggedConnect) { _loggedConnect = true; console.log('✅ PostgreSQL connected'); } });
pool.on('error', (err) => console.error('❌ PostgreSQL pool error:', err.message));

/** Run a query — returns full pg result */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const ms = Date.now() - start;
    if (ms > 500) console.warn(`⚠️  Slow query (${ms}ms): ${text.slice(0, 80)}`);
    return res;
  } catch (err) {
    console.error('DB error:', err.message, '\n→', text.slice(0, 160));
    throw err;
  }
}

/** Return first row or null */
async function getOne(text, params) {
  const res = await query(text, params);
  return res.rows[0] || null;
}

/** Return all rows */
async function getAll(text, params) {
  const res = await query(text, params);
  return res.rows;
}

/** Insert and return the created row */
async function insertOne(text, params) {
  const fullText = text.trimEnd().replace(/;?\s*$/, '') + ' RETURNING *';
  const res = await query(fullText, params);
  return res.rows[0];
}

/** Update and return the updated row */
async function updateOne(text, params) {
  const fullText = text.trimEnd().replace(/;?\s*$/, '') + ' RETURNING *';
  const res = await query(fullText, params);
  return res.rows[0] || null;
}

/** Check if database is reachable */
async function healthCheck() {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

module.exports = { pool, query, getOne, getAll, insertOne, updateOne, healthCheck };
