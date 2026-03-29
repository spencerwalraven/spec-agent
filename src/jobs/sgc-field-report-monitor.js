/**
 * SGC Field Report Monitor
 *
 * Runs at 6pm Arizona time (Mon–Fri).
 * Checks the "Field Reports" Google Sheet tab for today's submissions.
 * Sends follow-up emails to any tech who hasn't submitted or left key fields blank.
 * Sends Serene a daily summary of who submitted and who didn't.
 */

const { google } = require('googleapis');
const { logger }  = require('../utils/logger');
const { sendEmail } = require('../tools/gmail');

const SGC_SHEET_ID = process.env.SGC_SHEET_ID;

// ─── FIELD TECH ROSTER ────────────────────────────────────────────────────────
// Update these with real emails before going live
const FIELD_TECHS = [
  { name: 'Joe Robb',        email: process.env.SGC_TECH_JOE_EMAIL    || '' },
  { name: 'Elias Fuentes',   email: process.env.SGC_TECH_ELIAS_EMAIL  || '' },
  { name: 'Gerardo Garcia',  email: process.env.SGC_TECH_GERARDO_EMAIL|| '' },
  { name: 'Matthew Romani',  email: process.env.SGC_TECH_MATTHEW_EMAIL|| '' },
];

const SERENE_EMAIL  = process.env.SGC_SERENE_EMAIL  || 'swartzserene@gmail.com';
const REQUIRED_FIELDS = ['Work Completed Today', 'Job Name / Address'];

function getSGCSheets() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.sheets({ version: 'v4', auth });
}

function todayStr() {
  return new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Phoenix',
    month: '2-digit', day: '2-digit', year: 'numeric',
  });
}

async function getTodaysReports() {
  if (!SGC_SHEET_ID) return [];
  try {
    const sheets = getSGCSheets();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SGC_SHEET_ID,
      range: 'Field Reports!A1:Z500',
    });
    const rows = res.data.values || [];
    if (rows.length < 2) return [];
    const headers = rows[0];
    const today   = todayStr();
    return rows.slice(1)
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i] || ''; });
        return obj;
      })
      .filter(r => (r['Date'] || '').includes(today.split('/')[1]) ||
                   (r['Submitted At'] || '').startsWith(new Date().toISOString().split('T')[0]));
  } catch (e) {
    logger.error('SGC-FieldMonitor', `Could not read Field Reports tab: ${e.message}`);
    return [];
  }
}

function isIncomplete(report) {
  return REQUIRED_FIELDS.some(f => !report[f] || String(report[f]).trim().toLowerCase() === 'none' || String(report[f]).trim() === '');
}

async function runFieldReportMonitor() {
  logger.info('SGC-FieldMonitor', 'Running 6pm field report check...');

  const reports   = await getTodaysReports();
  const submitted = reports.map(r => (r['Name'] || '').toLowerCase().trim());

  const missing    = [];
  const incomplete = [];

  for (const tech of FIELD_TECHS) {
    if (!tech.email) continue;
    const techKey = tech.name.toLowerCase();
    const report  = reports.find(r => (r['Name'] || '').toLowerCase().trim() === techKey);

    if (!report) {
      missing.push(tech);
      // Send missing report email
      try {
        await sendEmail({
          to: tech.email,
          subject: `Reminder: Daily Field Report Missing — ${new Date().toLocaleDateString('en-US', { timeZone: 'America/Phoenix' })}`,
          body: `Hi ${tech.name.split(' ')[0]},

Just a quick reminder — we didn't receive your end-of-day field report for today.

It only takes 2 minutes. Please fill it out here:
${process.env.SGC_TALLY_FORM_URL || 'https://tally.so/r/2EL9Wg'}

Thanks,
Serene
Scottsdale General Contracting`,
        });
        logger.info('SGC-FieldMonitor', `Sent missing report email to ${tech.name}`);
      } catch (e) {
        logger.error('SGC-FieldMonitor', `Failed to email ${tech.name}: ${e.message}`);
      }

    } else if (isIncomplete(report)) {
      incomplete.push({ tech, report });
      // Send incomplete report email
      const missingFields = REQUIRED_FIELDS.filter(f => !report[f] || String(report[f]).trim() === '');
      try {
        await sendEmail({
          to: tech.email,
          subject: `Field Report Incomplete — a few fields need filling in`,
          body: `Hi ${tech.name.split(' ')[0]},

Thanks for submitting your report today! We noticed a couple fields were left blank:

${missingFields.map(f => `  • ${f}`).join('\n')}

Can you reply with those details, or resubmit here:
${process.env.SGC_TALLY_FORM_URL || 'https://tally.so/r/2EL9Wg'}

Thanks,
Serene
Scottsdale General Contracting`,
        });
        logger.info('SGC-FieldMonitor', `Sent incomplete report email to ${tech.name}`);
      } catch (e) {
        logger.error('SGC-FieldMonitor', `Failed to email ${tech.name}: ${e.message}`);
      }
    }
  }

  // Send Serene her daily summary
  const activeTechs = FIELD_TECHS.filter(t => t.email);
  if (activeTechs.length > 0 && SERENE_EMAIL) {
    const submittedNames  = activeTechs.filter(t => submitted.includes(t.name.toLowerCase()) && !incomplete.find(i => i.tech.name === t.name));
    const summaryLines    = [
      `SGC Field Report Summary — ${new Date().toLocaleDateString('en-US', { timeZone: 'America/Phoenix' })}`,
      '',
      `✅ Submitted (${submittedNames.length}): ${submittedNames.map(t => t.name).join(', ') || 'None'}`,
      `⚠️  Incomplete (${incomplete.length}): ${incomplete.map(i => i.tech.name).join(', ') || 'None'}`,
      `❌ Missing (${missing.length}): ${missing.map(t => t.name).join(', ') || 'None'}`,
      '',
      missing.length + incomplete.length === 0
        ? '🎉 All reports received and complete today!'
        : `Follow-up emails sent automatically to: ${[...missing, ...incomplete.map(i => i.tech)].map(t => t.name).join(', ')}`,
    ];

    try {
      await sendEmail({
        to: SERENE_EMAIL,
        subject: `Daily Field Report Summary — ${missing.length + incomplete.length > 0 ? `${missing.length + incomplete.length} need attention` : 'All clear ✅'}`,
        body: summaryLines.join('\n'),
      });
      logger.info('SGC-FieldMonitor', 'Sent daily summary to Serene');
    } catch (e) {
      logger.error('SGC-FieldMonitor', `Failed to send summary to Serene: ${e.message}`);
    }
  }

  logger.info('SGC-FieldMonitor', `Done. Missing: ${missing.length}, Incomplete: ${incomplete.length}, Submitted: ${submitted.length}`);
}

module.exports = { runFieldReportMonitor };
