/**
 * Sheets tool library — all SummitCRM tab operations
 * Column lookups are by header name, never hard-coded letters.
 */

require('dotenv').config();
const { google } = require('googleapis');

const SHEET_ID = process.env.SHEET_ID;
if (!SHEET_ID) console.error('⚠️  SHEET_ID env var is not set — all Sheets API calls will fail');

function getSheets() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.sheets({ version: 'v4', auth });
}

// Convert zero-based column index → spreadsheet letter (A, B, … Z, AA, …)
function colToLetter(idx) {
  let letter = '';
  idx++;
  while (idx > 0) {
    const rem = (idx - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    idx = Math.floor((idx - 1) / 26);
  }
  return letter;
}

// Flexible value getter — tries multiple key candidates
function g(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== '') return obj[k];
  }
  return '';
}

// ─── CORE READ / WRITE ───────────────────────────────────────────────────────

/**
 * Read an entire tab and return array of row objects keyed by header.
 * Each row gets a `_row` property (1-based spreadsheet row, header = row 1).
 */
async function readTab(tabName) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!A1:CZ2000`,
  });
  const rows = res.data.values || [];
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1)
    .map((row, i) => {
      const obj = { _row: i + 2, _headers: headers };
      headers.forEach((h, j) => { obj[h] = row[j] || ''; });
      return obj;
    })
    .filter(r => Object.entries(r).some(([k, v]) => !k.startsWith('_') && v.trim?.()));
}

/**
 * Read a single row by 1-based row number.
 */
async function readRow(tabName, rowNumber) {
  const sheets = getSheets();
  const [hRes, rRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tabName}!1:1` }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tabName}!A${rowNumber}:CZ${rowNumber}` }),
  ]);
  const headers = (hRes.data.values || [[]])[0] || [];
  const row     = (rRes.data.values || [[]])[0] || [];
  if (!headers.length) return { _row: rowNumber };
  const obj = { _row: rowNumber };
  headers.forEach((h, i) => { obj[h] = row[i] || ''; });
  return obj;
}

/**
 * Update a single cell by column header name.
 * Accepts an array of candidate header names — uses the first one found.
 */
async function updateCell(tabName, rowNumber, colHeaders, value) {
  const sheets  = getSheets();
  const hRes    = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tabName}!1:1` });
  const headers = (hRes.data.values || [[]])[0];
  const candidates = Array.isArray(colHeaders) ? colHeaders : [colHeaders];
  let colIdx = -1;
  for (const h of candidates) {
    colIdx = headers.indexOf(h);
    if (colIdx !== -1) break;
  }
  if (colIdx === -1) throw new Error(`Column "${candidates.join(' | ')}" not found in ${tabName}`);
  const letter = colToLetter(colIdx);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!${letter}${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[value]] },
  });
  return `Updated ${tabName}!${letter}${rowNumber} = "${value}"`;
}

/**
 * Update multiple cells in one row atomically.
 * data = { 'Column Header': value, … }
 */
async function updateRow(tabName, rowNumber, data) {
  const sheets  = getSheets();
  const hRes    = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tabName}!1:1` });
  const headers = (hRes.data.values || [[]])[0];
  const results = [];
  for (const [header, value] of Object.entries(data)) {
    const idx = headers.indexOf(header);
    if (idx === -1) { results.push(`⚠ Column "${header}" not found`); continue; }
    const letter = colToLetter(idx);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!${letter}${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[value]] },
    });
    results.push(`${header} = "${value}"`);
  }
  return results.join(', ');
}

/**
 * Append a new row to a tab. data = { 'Column Header': value, … }
 */
async function appendRow(tabName, data) {
  const sheets  = getSheets();
  const hRes    = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tabName}!1:1` });
  const headers = (hRes.data.values || [[]])[0];
  const newRow  = headers.map(h => data[h] !== undefined ? data[h] : '');
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${tabName}!A:A`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [newRow] },
  });
  return res.data.updates?.updatedRange || 'Row appended';
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────

async function readSettings() {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Settings!A1:B80',
  });
  const rows = res.data.values || [];
  const map = {};
  rows.forEach(r => {
    if (r[0] && r[1] !== undefined && !String(r[0]).startsWith('▸')) map[r[0].trim()] = String(r[1]).trim();
  });

  // Collect all "Notify: X" preference entries into a sub-object
  const notifyPrefs = {};
  Object.entries(map).forEach(([k, v]) => {
    if (k.startsWith('Notify: ')) notifyPrefs[k] = v.toLowerCase();
  });

  return {
    companyName:      map['Company Name']                || '',
    ownerName:        map['Owner / Salesperson Name']    || '',
    phone:            map['Company Phone']               || '',
    email:            map['Company Email']               || map['Gmail Send-From Address'] || '',
    address:          map['Company Address']             || '',
    calendlyLink:     map['Calendly Link']               || '',
    googleReviewLink: map['Google Review Link']          || '',
    emailSignature:   map['Email Signature']             || '',
    ownerEmail:       map['Owner Email']                 || map['Company Email'] || '',
    leadReplyDelay:   map['Lead Reply Delay']            || '3',
    clientReplyDelay: map['Client Reply Delay']          || '1',
    // Business profile — injected into AI prompts
    emailTone:        map['Email Tone']                  || '',
    aboutUs:          map['About Us']                    || '',
    keySellingPoints: map['Key Selling Points']          || '',
    // Notification preferences keyed by "Notify: X" → "both"|"email"|"sms"|"none"
    notifyPrefs,
  };
}

// ─── LEADS HELPERS ───────────────────────────────────────────────────────────

async function findRowByEmail(tabName, email) {
  const rows = await readTab(tabName);
  const lc = email.toLowerCase();
  return rows.find(r => (g(r,'Email','Email Address') || '').toLowerCase() === lc) || null;
}

async function getLastRow(tabName) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tabName}!A:A` });
  return (res.data.values || []).length;
}

// ─── ROUND ROBIN REP ASSIGNMENT ──────────────────────────────────────────────

/**
 * Write a single key→value pair to the Settings tab.
 * Finds the existing row for that key and updates it, or appends a new row.
 */
async function writeSettings(key, value) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Settings!A1:B60',
  });
  const rows = res.data.values || [];
  const rowIdx = rows.findIndex(r => r[0]?.trim() === key);
  if (rowIdx !== -1) {
    // Update existing row
    const sheetRow = rowIdx + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Settings!B${sheetRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[value]] },
    });
  } else {
    // Append new key-value row
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Settings!A:B',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [[key, value]] },
    });
  }
}

/**
 * Get the next sales rep in round-robin rotation.
 * Reads Team tab for active reps with Calendly links.
 * Tracks current index in Settings tab under "Round Robin Index".
 * Returns { name, email, phone, calendlyLink } or null if no reps configured.
 */
async function getNextRep() {
  try {
    const rows = await readTab('Team');

    // Filter to active reps who have a Calendly link (salespeople)
    const reps = rows.filter(r => {
      const active = g(r, 'Active', 'Status') || '';
      const calendly = g(r, 'Calendly Link', 'Calendly URL', 'Calendly') || '';
      const name = g(r, 'Name', 'Full Name', 'Employee Name', 'Salesperson') || '';
      // Include if they have a name and calendly link, and aren't explicitly inactive
      return name && calendly && !['no', 'inactive', 'false', 'off'].includes(active.toLowerCase());
    });

    if (!reps.length) return null;

    // Get current index from Settings
    const settings = await readSettings();
    const raw = settings['Round Robin Index'] !== undefined
      ? settings['Round Robin Index']
      : (await (async () => {
          const sheets = getSheets();
          const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'Settings!A1:B60' });
          const rows2 = res.data.values || [];
          const found = rows2.find(r => r[0]?.trim() === 'Round Robin Index');
          return found ? found[1] : '0';
        })());

    const idx = parseInt(raw) || 0;
    const rep = reps[idx % reps.length];

    // Advance the index for next time
    await writeSettings('Round Robin Index', String((idx + 1) % reps.length));

    return {
      name:        g(rep, 'Name', 'Full Name', 'Employee Name', 'Salesperson'),
      email:       g(rep, 'Email', 'Email Address'),
      phone:       g(rep, 'Phone', 'Phone Number', 'Cell'),
      calendlyLink: g(rep, 'Calendly Link', 'Calendly URL', 'Calendly'),
      role:        g(rep, 'Role', 'Title', 'Position') || 'Estimator',
    };
  } catch (err) {
    console.warn('[sheets] getNextRep failed:', err.message);
    return null;
  }
}

// ─── AGENT TOOL WRAPPERS ─────────────────────────────────────────────────────
// These are the functions the Anthropic agent tool-use loop calls.

async function toolReadLead({ rowNumber }) {
  const row = await readRow('Leads', rowNumber);
  return JSON.stringify(row, null, 2);
}

async function toolReadJob({ rowNumber }) {
  const row = await readRow('Jobs', rowNumber);
  return JSON.stringify(row, null, 2);
}

async function toolReadClient({ rowNumber }) {
  const row = await readRow('Clients', rowNumber);
  return JSON.stringify(row, null, 2);
}

async function toolUpdateLead({ rowNumber, field, value }) {
  return await updateCell('Leads', rowNumber, field, value);
}

async function toolUpdateJob({ rowNumber, field, value }) {
  return await updateCell('Jobs', rowNumber, field, value);
}

async function toolUpdateClient({ rowNumber, field, value }) {
  return await updateCell('Clients', rowNumber, field, value);
}

async function toolReadSettings() {
  const s = await readSettings();
  // Build communication guidelines from business profile fields so agents
  // automatically incorporate them without each prompt needing explicit instructions.
  const guidelines = [];
  if (s.emailTone)        guidelines.push(`Write all emails in a ${s.emailTone} tone.`);
  if (s.aboutUs)          guidelines.push(`Company background to weave in naturally: ${s.aboutUs}`);
  if (s.keySellingPoints) guidelines.push(`Key selling points to highlight when relevant: ${s.keySellingPoints}`);

  const output = { ...s };
  if (guidelines.length) {
    output._communication_guidelines = guidelines.join(' ');
  }
  // Don't expose internal notifyPrefs object to AI — it's not actionable
  delete output.notifyPrefs;
  return JSON.stringify(output, null, 2);
}

async function toolReadPhases({ jobId }) {
  const rows = await readTab('Job Phases');
  const phases = rows.filter(r => !jobId || g(r, 'Job ID') === jobId);
  return JSON.stringify(phases, null, 2);
}

async function toolUpdatePhase({ rowNumber, field, value }) {
  return await updateCell('Job Phases', rowNumber, field, value);
}

async function toolAppendPhase({ data }) {
  return await appendRow('Job Phases', data);
}

module.exports = {
  // Core
  readTab, readRow, updateCell, updateRow, appendRow,
  readSettings, writeSettings, findRowByEmail, getLastRow, g,
  // Round robin
  getNextRep,
  // Agent tool wrappers
  toolReadLead, toolReadJob, toolReadClient,
  toolUpdateLead, toolUpdateJob, toolUpdateClient,
  toolReadSettings, toolReadPhases, toolUpdatePhase, toolAppendPhase,
};
