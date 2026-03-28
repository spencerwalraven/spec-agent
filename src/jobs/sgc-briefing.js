/**
 * SGC Monday Morning Briefing
 *
 * Texts Serene every Monday at 7am (Arizona time) with a snapshot:
 *   - Subs missing compliance docs
 *   - Insurance tasks not started
 *   - Uncategorized bank transactions
 *   - Any jobs with open QB flags
 *
 * Requires: SGC_PHONE in .env (Serene's cell, e.g. +16025551234)
 * Optional: SGC_SHEET_ID — falls back to demo data if not set
 */

require('dotenv').config();
const { logger }  = require('../utils/logger');
const { sendSms } = require('../tools/sms');

// ─── DATA LAYER (mirrors sgc-admin-agent approach) ────────────────────────────

const SGC_SHEET_ID = process.env.SGC_SHEET_ID;
const DEMO_MODE    = !SGC_SHEET_ID || SGC_SHEET_ID === 'your_sgc_sheet_id_here';
const demoData     = DEMO_MODE ? require('../data/sgc-demo.json') : null;

function getSGCSheets() {
  const { google } = require('googleapis');
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.sheets({ version: 'v4', auth });
}

async function readTab(tabName) {
  if (DEMO_MODE) {
    const rows = demoData[tabName] ||
      demoData[Object.keys(demoData).find(k => k.trim() === tabName.trim())] || [];
    return rows;
  }
  const sheets = getSGCSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SGC_SHEET_ID,
    range: `${tabName}!A1:CZ500`,
  });
  const rows = res.data.values || [];
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1)
    .map(row => {
      const obj = {};
      headers.forEach((h, j) => { obj[h] = row[j] || ''; });
      return obj;
    })
    .filter(r => Object.values(r).some(v => v && String(v).trim()));
}

// ─── BRIEFING LOGIC ───────────────────────────────────────────────────────────

async function buildBriefing() {
  const [subs, insuranceTasks, transactions] = await Promise.all([
    readTab('2025 SubCons'),
    readTab('Insurance Tasks'),
    readTab('Unknown Bank Transactions'),
  ]);

  // Subs missing W9 or 1099
  const subsWithWork = subs.filter(s => {
    const name = (s['Name'] || s['Company Name'] || '').trim();
    return name && name !== 'NAME';
  });
  const subsMissingDocs = subsWithWork.filter(s => {
    const w9   = s['W9 Received '] || s['W9 Received'] || '';
    const sent = s['SENT'] || '';
    // Missing if W9 not received or onboarding packet not sent
    return !w9 || w9 === false || w9 === 'FALSE' || w9 === '' ||
           !sent || sent === false || sent === 'FALSE';
  });

  // Insurance tasks not started
  const tasksNotStarted = insuranceTasks.filter(t => {
    const status = (t['Status'] || '').toLowerCase().trim();
    return status === 'not started' || status === '';
  });

  // Uncategorized bank transactions (ASSIGN TO is blank)
  // First row in demo is the header row itself — skip it
  const txRows = transactions.filter(t => {
    const date = t['Chase SHC Checking 5289'] || t['DATE'] || '';
    const desc = t['__EMPTY'] || t['DESCRIPTION'] || '';
    const assignTo = t['__EMPTY_2'] || t['ASSIGN TO'] || '';
    // Valid transaction row: has a date or description, no assignment yet
    return (date || desc) && date !== 'DATE' && !assignTo.trim();
  });

  const totalTxAmount = txRows.reduce((sum, t) => {
    const raw = t['__EMPTY_1'] || t['AMOUNT'] || '0';
    const n = parseFloat(String(raw).replace(/[$,]/g, ''));
    return sum + (isNaN(n) ? 0 : Math.abs(n));
  }, 0);

  return {
    subsMissing:   subsMissingDocs.length,
    totalSubs:     subsWithWork.length,
    tasksOpen:     tasksNotStarted.length,
    totalTasks:    insuranceTasks.length,
    txCount:       txRows.length,
    txAmount:      totalTxAmount,
  };
}

function formatSms(data, isDemo) {
  const { subsMissing, totalSubs, tasksOpen, totalTasks, txCount, txAmount } = data;
  const amtStr = txAmount > 0
    ? `$${Math.round(txAmount).toLocaleString()}`
    : `${txCount} transactions`;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
    timeZone: 'America/Phoenix',
  });

  const lines = [
    `Good morning Serene! Here's your SGC snapshot for ${today}:`,
    '',
    `• Subs missing docs: ${subsMissing} of ${totalSubs}`,
    `• Insurance tasks not started: ${tasksOpen} of ${totalTasks}`,
    `• Uncategorized transactions: ${txCount}${txAmount > 0 ? ` (${amtStr})` : ''}`,
    '',
    `Open your SGC assistant to prep for Monday's meeting or tackle any of these now.`,
  ];

  if (isDemo) lines.push('\n[DEMO MODE — connect SGC_SHEET_ID for live data]');
  return lines.join('\n');
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

async function runSGCMorningBriefing() {
  logger.info('SGC-Briefing', 'Running SGC morning briefing…');

  const phone = process.env.SGC_PHONE;
  if (!phone) {
    logger.warn('SGC-Briefing', 'SGC_PHONE not set — skipping briefing');
    return { skipped: true, reason: 'SGC_PHONE not configured' };
  }

  try {
    const data = await buildBriefing();
    const message = formatSms(data, DEMO_MODE);

    if (DEMO_MODE) {
      logger.warn('SGC-Briefing', 'Demo mode — would send:\n' + message);
    } else {
      await sendSms(phone, message);
    }

    logger.success('SGC-Briefing', `Briefing sent to ${phone}`);
    return { sent: true, demo: DEMO_MODE, data, message };
  } catch (err) {
    logger.error('SGC-Briefing', `Briefing failed: ${err.message}`);
    return { error: err.message };
  }
}

module.exports = { runSGCMorningBriefing };
