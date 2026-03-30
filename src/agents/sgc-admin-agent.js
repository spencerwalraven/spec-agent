/**
 * SGC Admin Agent — Serene's AI assistant
 *
 * Handles Serene's daily admin tasks at Scottsdale General Contracting:
 *   • Bank transaction categorization (the $443K unallocated problem)
 *   • Subcontractor compliance tracking (W9, COI, Hold Harmless, etc.)
 *   • Job status and QuickBooks flagging
 *   • Monday Dashboard prep
 *   • Insurance task tracking
 *   • Payroll questions
 *
 * Uses a separate SGC_SHEET_ID so SGC's data stays isolated from other clients.
 */

const { BaseAgent, DEFAULT_MODEL } = require('./base-agent');
const { google } = require('googleapis');
const { logger } = require('../utils/logger');

// ─── SGC DATA LAYER (live sheet or demo fallback) ─────────────────────────────

const SGC_SHEET_ID = process.env.SGC_SHEET_ID;
const DEMO_MODE    = !SGC_SHEET_ID || SGC_SHEET_ID === 'your_sgc_sheet_id_here';
const demoData     = DEMO_MODE ? require('../data/sgc-demo.json') : null;

if (DEMO_MODE) logger.warn('SGC-Admin', 'No SGC_SHEET_ID set — running in DEMO MODE with sample data');

function getSGCSheets() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.sheets({ version: 'v4', auth });
}

async function sgcReadTab(tabName) {
  if (DEMO_MODE) {
    const rows = demoData[tabName] || demoData[Object.keys(demoData).find(k => k.trim() === tabName.trim())] || [];
    return rows.map((row, i) => ({ _row: i + 2, ...row }));
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
    .map((row, i) => {
      const obj = { _row: i + 2 };
      headers.forEach((h, j) => { obj[h] = row[j] || ''; });
      return obj;
    })
    .filter(r => Object.values(r).some(v => v && String(v).trim()));
}

async function sgcUpdateCell(tabName, rowNumber, columnHeader, value) {
  if (DEMO_MODE) return `[DEMO] Would update ${tabName} row ${rowNumber} — ${columnHeader}: "${value}"`;
  const sheets = getSGCSheets();
  const hRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SGC_SHEET_ID,
    range: `${tabName}!1:1`,
  });
  const headers = (hRes.data.values || [[]])[0] || [];
  let colIdx = headers.indexOf(columnHeader);
  if (colIdx === -1) {
    colIdx = headers.findIndex(h => h.trim().toLowerCase() === columnHeader.trim().toLowerCase());
  }
  if (colIdx === -1) throw new Error(`Column "${columnHeader}" not found in ${tabName}`);
  let letter = '';
  let idx = colIdx + 1;
  while (idx > 0) {
    const rem = (idx - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    idx = Math.floor((idx - 1) / 26);
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: SGC_SHEET_ID,
    range: `${tabName}!${letter}${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[value]] },
  });
  return `Updated ${tabName} row ${rowNumber} — ${columnHeader}: "${value}"`;
}

// ─── TOOL DEFINITIONS ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'read_jobs',
    description: 'Read the SGC job tracker — all active and completed jobs with status, customer names, job numbers, and QuickBooks notes.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'read_subcontractors',
    description: 'Read the 2025 subcontractor list — compliance status (W9, 1099, onboarding), payment totals, and notes on each sub.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'read_bank_transactions',
    description: 'Read the Unknown Bank Transactions tab — unidentified charges across all 5 SGC accounts that need to be categorized.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'read_insurance_tasks',
    description: 'Read the Insurance Tasks compliance checklist — which items are complete, in progress, or not started.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'read_payroll',
    description: 'Read the Payroll tab — employee hours, pay rates, OT, and mileage reimbursements.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'categorize_transaction',
    description: 'Apply SGC\'s 6-step expense decision tree to categorize a bank transaction for QuickBooks. Provide the vendor name, amount, and any context you have.',
    input_schema: {
      type: 'object',
      properties: {
        vendor:  { type: 'string', description: 'Vendor or merchant name from the bank statement' },
        amount:  { type: 'string', description: 'Transaction amount' },
        context: { type: 'string', description: 'Any additional context (job number, what was purchased, etc.)' },
      },
      required: ['vendor', 'amount'],
    },
  },
  {
    name: 'check_sub_compliance',
    description: 'Check a specific subcontractor\'s compliance status — what they have and what they\'re missing.',
    input_schema: {
      type: 'object',
      properties: {
        subName: { type: 'string', description: 'Name or partial name of the subcontractor' },
      },
      required: ['subName'],
    },
  },
  {
    name: 'update_job_notes',
    description: 'Update the notes or status on a job in the SGC tracker.',
    input_schema: {
      type: 'object',
      properties: {
        rowNumber: { type: 'number', description: 'Row number of the job in the sheet' },
        field:     { type: 'string', description: 'Column header to update (e.g. "Job Status", "NOTES")' },
        value:     { type: 'string', description: 'New value' },
      },
      required: ['rowNumber', 'field', 'value'],
    },
  },
  {
    name: 'prep_monday_dashboard',
    description: 'Pull together all data needed for the Monday Dashboard Meeting — jobs, cash notes, compliance gaps, and outstanding items.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'create_invoice',
    description: 'Create a QuickBooks invoice for a customer. Ask for customer name, amount, and what the invoice is for. Optionally a due date.',
    input_schema: {
      type: 'object',
      properties: {
        customerName:  { type: 'string', description: 'Full name of the customer as it should appear on the invoice' },
        customerEmail: { type: 'string', description: 'Customer email address (optional but helpful for QB match)' },
        amount:        { type: 'number', description: 'Invoice amount in dollars' },
        description:   { type: 'string', description: 'What the invoice is for (e.g. "Kitchen remodel deposit")' },
        dueDate:       { type: 'string', description: 'Due date in YYYY-MM-DD format (optional, defaults to Net 30)' },
      },
      required: ['customerName', 'amount', 'description'],
    },
  },
  {
    name: 'list_open_invoices',
    description: 'List all open (unpaid) invoices in QuickBooks, including overdue ones.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_invoice_status',
    description: 'Check the status of a specific invoice by invoice number.',
    input_schema: {
      type: 'object',
      properties: {
        invoiceNumber: { type: 'string', description: 'The QuickBooks invoice number' },
      },
      required: ['invoiceNumber'],
    },
  },
];

// ─── TOOL EXECUTORS ───────────────────────────────────────────────────────────

const EXECUTORS = {
  read_jobs: async () => {
    const rows = await sgcReadTab('SGC');
    // Normalize trailing-space column names from the sheet
    const clean = rows.map(r => ({
      jobNumber:  r['#'],
      customer:   r['Customer'],
      dates:      r['Thru'],
      status:     (r['Job Status '] || r['Job Status'] || '').trim(),
      notes:      (r['NOTES_1'] || r['NOTES'] || '').trim(),
    })).filter(r => r.customer);
    return JSON.stringify(clean, null, 2);
  },

  read_subcontractors: async () => {
    const rows = await sgcReadTab('2025 SubCons');
    return JSON.stringify(rows, null, 2);
  },

  read_bank_transactions: async () => {
    const rows = await sgcReadTab('Unknown Bank Transactions');
    return JSON.stringify(rows, null, 2);
  },

  read_insurance_tasks: async () => {
    const rows = await sgcReadTab('Insurance Tasks');
    return JSON.stringify(rows, null, 2);
  },

  read_payroll: async () => {
    const rows = await sgcReadTab('Payroll');
    return JSON.stringify(rows, null, 2);
  },

  categorize_transaction: async ({ vendor, amount, context }) => {
    // This is a reasoning tool — the agent applies the decision tree and returns a recommendation
    return JSON.stringify({
      vendor,
      amount,
      context: context || 'No additional context provided',
      decisionTree: [
        '1. Is this tied to a specific job? → Job Cost (needs job number)',
        '2. Recurring business subscription? → Overhead / Software',
        '3. Vehicle or fuel? → Vehicle Expense (needs vehicle assigned)',
        '4. Tool or equipment purchase? → Equipment / Tools',
        '5. Material purchase? → Materials (needs job number + 20% markup for billing)',
        '6. None of the above? → General Overhead (note vendor and purpose)',
      ],
      instruction: 'Apply the decision tree above to determine the QuickBooks category. Ask Serene for any missing info (job number, what was purchased) before finalizing.',
    });
  },

  check_sub_compliance: async ({ subName }) => {
    const rows = await sgcReadTab('2025 SubCons');
    const match = rows.find(r => {
      const name = (r['Name'] || r['Company Name'] || '').toLowerCase();
      return name.includes(subName.toLowerCase());
    });
    if (!match) return `No subcontractor found matching "${subName}". Check the name and try again.`;

    const required = ['W9 Received', 'BT Onboarding', '1099 needed'];
    const status = {};
    required.forEach(field => { status[field] = match[field] || 'Unknown'; });
    status['2025 Total Paid'] = match['2025 Total'] || '$0';
    status['Notes'] = match['NOTES'] || '';
    return JSON.stringify({ subcontractor: match['Name'] || match['Company Name'], ...status }, null, 2);
  },

  update_job_notes: async ({ rowNumber, field, value }) => {
    return await sgcUpdateCell('SGC', rowNumber, field, value);
  },

  prep_monday_dashboard: async () => {
    const [jobs, subs, transactions, insurance] = await Promise.all([
      sgcReadTab('SGC'),
      sgcReadTab('2025 SubCons'),
      sgcReadTab('Unknown Bank Transactions'),
      sgcReadTab('Insurance Tasks'),
    ]);

    const jobStatus  = j => (j['Job Status '] || j['Job Status'] || '').trim().toLowerCase();
    const activeJobs = jobs.filter(j => jobStatus(j) === 'in progress');
    const needsQB    = jobs.filter(j => (j['NOTES'] || j['NOTES_1'] || '').toLowerCase().includes('add'));
    const missingW9  = subs.filter(s => !s['W9 Received '] && !s['W9 Received'] || String(s['W9 Received '] ?? s['W9 Received'] ?? '').toLowerCase() === 'false');
    const notOnboarded = subs.filter(s => (s['BT Onboarding'] || '').toLowerCase() !== 'yes');
    const incompleteInsurance = insurance.filter(i => (i['Status'] || '').toLowerCase() === 'not started');

    return JSON.stringify({
      activeJobs: activeJobs.length,
      activeJobList: activeJobs.map(j => ({ job: j['#'], customer: j['Customer'], dates: j['Thru'] })),
      needsQuickBooksEntry: needsQB.map(j => ({ job: j['#'], customer: j['Customer'] })),
      subsWithoutW9: missingW9.map(s => s['Name'] || s['Company Name']),
      subsNotOnboarded: notOnboarded.map(s => s['Name'] || s['Company Name']),
      incompleteInsuranceTasks: incompleteInsurance.map(i => i['Task']),
      uncategorizedTransactionCount: transactions.length,
    }, null, 2);
  },

  create_invoice: async ({ customerName, customerEmail, amount, description, dueDate }) => {
    const qb = require('../tools/sgc-quickbooks');
    if (!qb.isConnected()) return JSON.stringify({ error: 'QuickBooks is not connected. Click "Connect QuickBooks" in the top bar first.' });
    try {
      const result = await qb.createInvoice({ customerName, customerEmail, amount, description, dueDate });
      return JSON.stringify(result, null, 2);
    } catch (err) {
      return JSON.stringify({ error: err.message });
    }
  },

  list_open_invoices: async () => {
    const qb = require('../tools/sgc-quickbooks');
    if (!qb.isConnected()) return JSON.stringify({ error: 'QuickBooks is not connected.' });
    try {
      const invoices = await qb.listOpenInvoices();
      return JSON.stringify({ openInvoices: invoices, total: invoices.length }, null, 2);
    } catch (err) {
      return JSON.stringify({ error: err.message });
    }
  },

  get_invoice_status: async ({ invoiceNumber }) => {
    const qb = require('../tools/sgc-quickbooks');
    if (!qb.isConnected()) return JSON.stringify({ error: 'QuickBooks is not connected.' });
    try {
      const result = await qb.getInvoiceStatus(invoiceNumber);
      if (!result) return JSON.stringify({ error: `Invoice #${invoiceNumber} not found.` });
      return JSON.stringify(result, null, 2);
    } catch (err) {
      return JSON.stringify({ error: err.message });
    }
  },
};

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Serene's AI admin assistant for Scottsdale General Contracting (SGC).

SGC is a general contracting company in Scottsdale, AZ with three divisions: Remodel, Roofing, and Handyman. They use QuickBooks for accounting, CompanyCam for job photos, and Buildertrend for project management.

SERENE'S ROLE:
Serene Swartz is the part-time admin (15-20 hrs/week, $30.25/hr). She is the operational backbone of SGC. Every task she handles keeps the business running — expense coding, sub compliance, payroll, Monday Dashboard prep, and job tracking.

YOUR JOB:
Help Serene get through her work faster and more accurately. Answer her questions directly. When she describes a transaction or situation, tell her exactly what to do. Never be vague.

KEY PRIORITIES (in order of importance):
1. Zero unallocated expenses — every transaction must be coded in QuickBooks
2. Sub compliance — no sub works without W9, COI, Hold Harmless, Rate Sheet, and onboarding complete
3. Monday Dashboard materials ready by Friday 5pm every week
4. Job status current and accurate in the tracker

EXPENSE DECISION TREE (always apply this when categorizing transactions):
1. Tied to a specific job? → Job Cost (get the job number)
2. Recurring business subscription? → Overhead / Software
3. Vehicle or fuel? → Vehicle Expense (assign to specific vehicle)
4. Tool or equipment purchase? → Equipment / Tools
5. Material purchase? → Materials (assign job number + flag for 20% markup on client billing)
6. None of the above? → General Overhead (note vendor and purpose)

SUBCONTRACTOR COMPLIANCE REQUIREMENTS (all 5 required before a sub can work):
- W9 received
- Certificate of Insurance (COI) on file
- Hold Harmless Agreement signed
- Rate sheet on file
- Buildertrend + CompanyCam onboarded

MONDAY DASHBOARD ITEMS:
- Cash position across all accounts
- Active jobs with budget vs actual
- Jobs completed this week needing QuickBooks entry
- Outstanding invoices
- Unallocated expenses (target: zero)
- Sub compliance gaps
- Upcoming document/insurance expirations (90/60/30 day alerts)

ACCOUNTS SERENE MANAGES:
- Chase SHC Checking 5289
- SHC INK Credit Card 1607
- AMEX 1001
- Chase 7755
- Amazon AMEX 1000/1018

TONE: Be direct, efficient, and practical. Serene is busy. Give her the answer, not a lecture. If you need more info to give a good answer, ask one specific question.`;

// ─── AGENT CLASS ──────────────────────────────────────────────────────────────

class SGCAdminAgent extends BaseAgent {
  constructor() {
    super('SGC-Admin', DEFAULT_MODEL, TOOLS, EXECUTORS);
  }

  async chat(userMessage, history = []) {
    logger.agent('SGC-Admin', `Serene: ${userMessage.slice(0, 80)}…`);
    return await this.run(SYSTEM_PROMPT, userMessage, { history });
  }
}

module.exports = Object.assign(new SGCAdminAgent(), { sgcReadTab, sgcUpdateCell });
