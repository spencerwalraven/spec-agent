require('dotenv').config();
const express = require('express');
const path    = require('path');
const { google } = require('googleapis');

// Catch unhandled errors so they appear in Railway logs
process.on('uncaughtException',  e => console.error('UNCAUGHT EXCEPTION:', e));
process.on('unhandledRejection', e => console.error('UNHANDLED REJECTION:', e));

// ─── AI AGENT SYSTEM ─────────────────────────────────────────────────────────
let webhookRouter, startScheduler, addSseClient;
try {
  webhookRouter  = require('./src/triggers/webhooks');
  ({ startScheduler } = require('./src/triggers/scheduler'));
  ({ addClient: addSseClient } = require('./src/utils/logger'));
  console.log('✅ AI Agent system loaded');
} catch (e) {
  console.warn('⚠️  AI Agent system failed to load:', e.message);
  webhookRouter = null; startScheduler = null; addSseClient = null;
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── SSE: LIVE ACTIVITY FEED ─────────────────────────────────────────────────
app.get('/api/activity-stream', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.write('data: {"type":"connected"}\n\n');
  // Heartbeat every 25s to keep connection alive
  const hb = setInterval(() => res.write(':heartbeat\n\n'), 25000);
  res.on('close', () => clearInterval(hb));
  if (addSseClient) addSseClient(res);
});

// ─── WEBHOOK ROUTER (agent triggers) ─────────────────────────────────────────
if (webhookRouter) app.use('/webhook', webhookRouter);

// ─── SHEETS CLIENT ─────────────────────────────────────────────────────────
function getSheets() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.sheets({ version: 'v4', auth });
}

const SHEET_ID = process.env.SHEET_ID;

// Read a tab and return array of objects keyed by header row
async function readTab(tabName) {
  try {
    const sheets = getSheets();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A1:CZ1000`,
    });
    const rows = res.data.values || [];
    if (rows.length < 2) return [];
    const headers = rows[0];
    return rows.slice(1)
      .filter(r => r.some(c => c && c.trim()))
      .map(row => {
        const obj = { __headers: headers };
        headers.forEach((h, i) => { obj[h] = row[i] || ''; });
        return obj;
      });
  } catch (e) {
    console.error(`readTab(${tabName}):`, e.message);
    return [];
  }
}

// Read Settings tab — label/value pairs in columns A and B
async function readSettings() {
  try {
    const sheets = getSheets();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Settings!A1:B50',
    });
    const rows = res.data.values || [];
    const map = {};
    rows.forEach(r => {
      if (r[0] && r[1] && !String(r[0]).startsWith('▸')) map[r[0].trim()] = r[1];
    });
    return {
      companyName:      map['Company Name']               || '',
      ownerName:        map['Owner / Salesperson Name']   || '',
      phone:            map['Company Phone']              || '',
      email:            map['Company Email']              || map['Gmail Send-From Address'] || '',
      address:          map['Company Address']            || '',
      calendlyLink:     map['Calendly Link']              || '',
      googleReviewLink: map['Google Review Link']         || '',
      emailSignature:   map['Email Signature']            || '',
    };
  } catch (e) { return {}; }
}

// Write Settings — update specific labeled rows in column B
async function writeSettings(data) {
  const sheets = getSheets();
  // Read to find the row index of each label
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID, range: 'Settings!A1:A50',
  });
  const labels = (res.data.values || []).map(r => (r[0] || '').trim());
  const writeMap = {
    'Company Name':              data.companyName      || '',
    'Owner / Salesperson Name':  data.ownerName        || '',
    'Company Phone':             data.phone            || '',
    'Company Email':             data.email            || '',
    'Company Address':           data.address          || '',
    'Calendly Link':             data.calendlyLink     || '',
    'Google Review Link':        data.googleReviewLink || '',
    'Email Signature':           data.emailSignature   || '',
  };
  for (const [label, value] of Object.entries(writeMap)) {
    const rowIdx = labels.indexOf(label);
    if (rowIdx !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `Settings!B${rowIdx + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[value]] },
      });
    }
  }
}

// Update a specific cell — colHeaders can be a string or array of candidates
async function updateCell(tabName, rowNumber, colHeaders, value) {
  try {
    const sheets = getSheets();
    const hRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!1:1`,
    });
    const headers = (hRes.data.values || [[]])[0];
    const candidates = Array.isArray(colHeaders) ? colHeaders : [colHeaders];
    let colIdx = -1;
    for (const h of candidates) {
      colIdx = headers.indexOf(h);
      if (colIdx !== -1) break;
    }
    if (colIdx === -1) throw new Error(`Column "${candidates.join('|')}" not found`);
    const colLetter = colToLetter(colIdx);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!${colLetter}${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[value]] },
    });
    return true;
  } catch (e) {
    console.error(`updateCell error:`, e.message);
    return false;
  }
}

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

// Flexible field getter — tries multiple possible column names
function g(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== '') return row[k];
  }
  return '';
}

// ─── HELPERS ───────────────────────────────────────────────────────────────
function daysBetween(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    return Math.floor((Date.now() - d) / 86400000);
  } catch { return null; }
}

// ─── API: HEALTH ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '2.0.0' }));

// ─── API: SETUP — Gmail Watch ────────────────────────────────────────────────
// POST /api/setup/gmail-watch  — call once per client to enable push notifications
app.post('/api/setup/gmail-watch', async (req, res) => {
  try {
    const { startWatch } = require('./src/tools/gmail-watch');
    const result = await startWatch();
    res.json({ ok: true, expiration: result.expiration, historyId: result.historyId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── API: CONVERSATIONS ──────────────────────────────────────────────────────
// Returns all leads/jobs that have an email thread, sorted by last contact
app.get('/api/conversations', async (req, res) => {
  try {
    const [leads, jobs] = await Promise.all([readTab('Leads'), readTab('Jobs')]);
    const conversations = [];

    leads.forEach((r, i) => {
      const threadId = g(r, 'Email Thread ID', 'emailThread');
      if (!threadId) return;
      const name = `${g(r,'First Name')} ${g(r,'Last Name')}`.trim();
      conversations.push({
        _row:       i + 2,
        source:     'lead',
        name,
        email:      g(r, 'Email'),
        threadId,
        lastContact: g(r, 'Last Contact', 'Last Contacted'),
        status:     g(r, 'Status', 'Lead Status'),
        project:    g(r, 'Service Requested', 'Service Type', 'Project Type'),
      });
    });

    jobs.forEach((r, i) => {
      const threadId = g(r, 'Client Email Thread', 'Email Thread ID', 'emailThread');
      if (!threadId) return;
      const name = `${g(r,'First Name')} ${g(r,'Last Name')}`.trim();
      conversations.push({
        _row:       i + 2,
        source:     'job',
        name,
        email:      g(r, 'Email'),
        threadId,
        jobId:      g(r, 'Job ID'),
        lastContact: g(r, 'Last Contact', 'Last Client Contact'),
        status:     g(r, 'Job Status', 'Status'),
        project:    g(r, 'Service Type', 'Project Type'),
      });
    });

    // Sort newest contact first
    conversations.sort((a, b) => {
      const da = a.lastContact ? new Date(a.lastContact) : new Date(0);
      const db = b.lastContact ? new Date(b.lastContact) : new Date(0);
      return db - da;
    });

    res.json(conversations);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: THREAD ─────────────────────────────────────────────────────────────
app.get('/api/thread/:threadId', async (req, res) => {
  try {
    const { readThread } = require('./src/tools/gmail');
    const messages = await readThread(req.params.threadId);
    res.json(messages);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: SUMMARY ──────────────────────────────────────────────────────────
app.get('/api/summary', async (req, res) => {
  try {
    const [leads, jobs, clients, settings] = await Promise.all([
      readTab('Leads'), readTab('Jobs'), readTab('Clients'), readSettings(),
    ]);

    const now = new Date();
    const newLeadsThisMonth = leads.filter(l => {
      const d = new Date(g(l, 'Timestamp', 'Date Added', 'Created'));
      return !isNaN(d) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const activeJobs = jobs.filter(j =>
      /progress|active/i.test(g(j, 'Job Status', 'Status'))
    ).length;

    let pipelineValue = 0;
    jobs.forEach(j => {
      const v = parseFloat(String(g(j, 'Total Job Value', 'Job Value', 'Contract Amount')).replace(/[$,]/g, ''));
      if (!isNaN(v) && !/complete/i.test(g(j, 'Job Status', 'Status'))) pipelineValue += v;
    });

    const converted = leads.filter(l => /convert/i.test(g(l, 'Lead Status', 'Status'))).length;
    const conversionRate = leads.length > 0 ? Math.round((converted / leads.length) * 100) + '%' : '—';

    // Recent activity — last 8 leads + in-progress jobs
    const activity = [];
    [...leads].reverse().slice(0, 5).forEach(l => {
      const name = `${g(l,'First Name')} ${g(l,'Last Name')}`.trim();
      if (name) activity.push({
        text: `${name} — ${g(l,'Project Type','Service Type') || 'new lead'}`,
        time: g(l, 'Timestamp', 'Date Added') ? relativeTime(g(l,'Timestamp','Date Added')) : 'recently',
        color: scoreColor(g(l,'Lead Score')),
        type: 'lead',
      });
    });
    jobs.filter(j => /progress/i.test(g(j,'Job Status','Status'))).slice(0,3).forEach(j => {
      const name = `${g(j,'First Name')} ${g(j,'Last Name')}`.trim();
      if (name) activity.push({
        text: `${name} — ${g(j,'Service Type','Project Type') || 'job'} in progress`,
        time: g(j,'Kickoff Date') ? relativeTime(g(j,'Kickoff Date')) : '',
        color: 'blue', type: 'job',
      });
    });

    res.json({
      companyName: settings.companyName || 'SPEC Systems',
      newLeadsThisMonth: newLeadsThisMonth || 0,
      activeJobs,
      pipelineValue,
      conversionRate,
      totalLeads: leads.length,
      totalClients: clients.length,
      recentActivity: activity.slice(0, 8),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: LEADS ─────────────────────────────────────────────────────────────
app.get('/api/leads', async (req, res) => {
  try {
    const rows = await readTab('Leads');
    res.json(rows.map((r, i) => ({
      _row: i + 2,
      firstName:    g(r, 'First Name'),
      lastName:     g(r, 'Last Name'),
      email:        g(r, 'Email'),
      phone:        g(r, 'Phone Number', 'Phone'),
      address:      g(r, 'Street Address', 'Address'),
      city:         g(r, 'City'),
      state:        g(r, 'State'),
      zip:          g(r, 'Zip Code', 'Zip', 'ZIP'),
      projectType:  g(r, 'Service Requested', 'Service Type', 'Project Type'),
      description:  g(r, 'Tell us about your project', 'Project Description', 'Description'),
      budget:       g(r, 'Budget'),
      timeline:     g(r, 'Timeline'),
      leadScore:    g(r, 'Lead Score', 'AI Score'),
      scoreReason:  g(r, 'Score Reasoning', 'Score Label'),
      leadStatus:   g(r, 'Status', 'Lead Status'),
      assignedRep:  g(r, 'Assigned Salesmen', 'Assigned Rep', 'Sales Rep', 'Salesperson'),
      notes:        g(r, 'Notes', 'Agent Notes', 'Qualifying Notes'),
      lastContact:  g(r, 'Last Contact', 'Last Contacted'),
      nurtureStep:  g(r, 'Nurture Day', 'Nurture Step'),
      booked:       g(r, 'Call Scheduled', 'Booked', 'Call Booked'),
      timestamp:    g(r, 'Timestamp', 'Date Added'),
      heardAboutUs: g(r, 'How did you hear about us?', 'Source'),
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: CONVERT LEAD ──────────────────────────────────────────────────────
app.post('/api/leads/:row/convert', async (req, res) => {
  try {
    const row = parseInt(req.params.row);
    if (isNaN(row) || row < 2) return res.status(400).json({ error: 'Invalid row' });
    await updateCell('Leads', row, ['Status', 'Lead Status'], 'Converted');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: LOST LEAD ──────────────────────────────────────────────────────────
app.post('/api/leads/:row/lost', async (req, res) => {
  try {
    const row = parseInt(req.params.row);
    if (isNaN(row) || row < 2) return res.status(400).json({ error: 'Invalid row' });
    await updateCell('Leads', row, ['Status', 'Lead Status'], 'Lost');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: SAVE LEAD NOTE ─────────────────────────────────────────────────────
app.post('/api/leads/:row/note', async (req, res) => {
  try {
    const row = parseInt(req.params.row);
    if (isNaN(row) || row < 2) return res.status(400).json({ error: 'Invalid row' });
    const { note } = req.body;
    await updateCell('Leads', row, ['Notes', 'Agent Notes', 'Qualifying Notes'], note || '');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: UPDATE JOB STATUS ──────────────────────────────────────────────────
app.post('/api/jobs/:row/status', async (req, res) => {
  try {
    const row = parseInt(req.params.row);
    if (isNaN(row) || row < 2) return res.status(400).json({ error: 'Invalid row' });
    const { status } = req.body;
    await updateCell('Jobs', row, ['Job Status', 'Status'], status || '');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: JOBS ──────────────────────────────────────────────────────────────
app.get('/api/jobs', async (req, res) => {
  try {
    const rows = await readTab('Jobs');
    res.json(rows.map((r, i) => ({
      _row: i + 2,
      jobId:           g(r, 'Job ID'),
      firstName:       g(r, 'First Name'),
      lastName:        g(r, 'Last Name'),
      clientName:      `${g(r,'First Name')} ${g(r,'Last Name')}`.trim(),
      email:           g(r, 'Email'),
      phone:           g(r, 'Phone Number', 'Phone'),
      address:         g(r, 'Street Address', 'Address'),
      city:            g(r, 'City'),
      serviceType:     g(r, 'Service Type', 'Project Type'),
      description:     g(r, 'Project Description', 'Description'),
      jobStatus:       g(r, 'Job Status', 'Status'),
      qualityTier:     g(r, 'Quality Tier'),
      salesperson:     g(r, 'Salesperson', 'Sales Rep'),
      estimateLow:     g(r, 'AI Estimate Low', 'Estimate Low', 'Low Estimate'),
      estimateHigh:    g(r, 'AI Estimate High', 'Estimate High', 'High Estimate'),
      depositAmount:   g(r, 'Deposit Amount'),
      totalJobValue:   g(r, 'Total Job Value', 'Contract Amount', 'Job Value'),
      contractStatus:  g(r, 'Contract Status'),
      contractLink:    g(r, 'Contract Doc Link', 'Contract Link'),
      proposalStatus:  g(r, 'Proposal Status', 'Proposal Accepted'),
      proposalLink:    g(r, 'Proposal Doc Link', 'Proposal Link'),
      proposalDate:    g(r, 'Proposal Sent Date', 'Proposal Sent', 'Proposal Date'),
      kickoffDocLink:  g(r, 'Kickoff Doc Link', 'Kickoff Document'),
      kickoffDate:     g(r, 'Site Visit Date', 'Kickoff Date'),
      startDate:       g(r, 'Site Visit Date', 'Kickoff Date', 'Start Date'),
      endDate:         g(r, 'Est. Completion', 'Estimated End', 'End Date'),
      jobTemplateLink: g(r, 'Job Template Link'),
      phasesTotal:     g(r, 'Phases Total', 'Total Phases'),
      phasesComplete:  g(r, 'Phases Complete', 'Phases Completed'),
      depositPaid:     g(r, 'Deposit Paid', 'Deposit Invoice Paid'),
      depositSent:     g(r, 'Deposit Invoice Sent'),
      finalPaid:       g(r, 'Final Invoice Paid', 'Final Paid'),
      finalSent:       g(r, 'Final Invoice Sent'),
      jobNotes:        g(r, 'Job Notes', 'Notes'),
      depositInvoice:  g(r, 'Deposit Invoice Link', 'Deposit Invoice'),
      finalInvoice:    g(r, 'Final Invoice Link', 'Final Invoice'),
      jobComplete:     g(r, 'Job Complete', 'Completion'),
      completionDate:  g(r, 'Completion Date', 'Job Completion Date'),
      jobNotes:        g(r, 'Job Notes', 'Notes'),
      sqFootage:       g(r, 'Total Sq Footage', 'Sq Footage'),
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: JOB PHASES ────────────────────────────────────────────────────────
app.get('/api/phases', async (req, res) => {
  try {
    const { jobId } = req.query;
    const rows = await readTab('Job Phases');
    const phases = rows
      .filter(r => !jobId || g(r,'Job ID') === jobId)
      .map((r, i) => ({
        _row: i + 2,
        phaseId:       g(r, 'Phase ID'),
        jobId:         g(r, 'Job ID'),
        clientName:    g(r, 'Client Name'),
        phaseName:     g(r, 'Phase Name'),
        phaseOrder:    g(r, 'Phase Order'),
        description:   g(r, 'Description'),
        materials:     g(r, 'Materials Needed'),
        laborHrs:      g(r, 'Estimated Labor Hrs', 'Est Labor Hrs'),
        estCost:       g(r, 'Estimated Cost', 'Est Cost'),
        status:        g(r, 'Status'),
        completionDate:g(r, 'Completion Date'),
        assignedName:  g(r, 'Assigned Name'),
        teamId:        g(r, 'Team ID'),
        subNotified:   g(r, 'Sub Notified'),
        subConfirmed:  g(r, 'Sub Confirmed'),
        phaseRating:   g(r, 'Phase Rating'),
        clientFeedback:g(r, 'Client Feedback'),
        progress:      g(r, 'Progress'),
      }))
      .sort((a, b) => parseInt(a.phaseOrder) - parseInt(b.phaseOrder));
    res.json(phases);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update phase status
app.post('/api/phases/:row/status', async (req, res) => {
  try {
    const rowNum = parseInt(req.params.row);
    const { status } = req.body;
    const ok = await updateCell('Job Phases', rowNum, 'Status', status);
    if (status === 'Complete') {
      await updateCell('Job Phases', rowNum, 'Completion Date',
        new Date().toLocaleDateString('en-US'));
    }
    res.json({ success: ok });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: CLIENTS ───────────────────────────────────────────────────────────
app.get('/api/clients', async (req, res) => {
  try {
    const rows = await readTab('Clients');
    res.json(rows.map((r, i) => ({
      _row: i + 2,
      clientId:      g(r, 'Client ID'),
      firstName:     g(r, 'First Name'),
      lastName:      g(r, 'Last Name'),
      email:         g(r, 'Email'),
      phone:         g(r, 'Phone'),
      address:       g(r, 'Address', 'Street Address'),
      city:          g(r, 'City'),
      lifetimeValue: g(r, 'Lifetime Value', 'Total Job Value', 'LTV'),
      jobsCompleted: g(r, 'Jobs Completed', 'Total Jobs'),
      lastJobDate:   g(r, 'Last Job Date', 'Last Job'),
      referralScore: g(r, 'Referral Score', 'Referral Potential'),
      reviewStatus:  g(r, 'Review Status', 'Google Review'),
      reviewLink:    g(r, 'Review Link'),
      notes:         g(r, 'Client Notes', 'Notes'),
      preferredContact: g(r, 'Preferred Contact'),
      birthday:      g(r, 'Birthday'),
      anniversary:   g(r, 'Home Anniversary', 'Anniversary'),
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: TEAM ──────────────────────────────────────────────────────────────
app.get('/api/team', async (req, res) => {
  try {
    const [teamRows, jobRows] = await Promise.all([
      readTab('Team'), readTab('Jobs'),
    ]);

    const team = teamRows.map((r, i) => {
      const name = g(r, 'Name', 'Team Member', 'Employee Name');
      const teamId = g(r, 'Team ID', 'ID');
      const assignedJobs = jobRows.filter(j =>
        g(j,'Salesperson','Sales Rep') === name ||
        g(j,'Salesperson','Sales Rep') === teamId
      ).length;
      return {
        _row: i + 2,
        teamId,
        name,
        role:         g(r, 'Role', 'Position', 'Title'),
        email:        g(r, 'Email'),
        phone:        g(r, 'Phone'),
        active:       g(r, 'Active', 'Status', 'Is Active'),
        activeJobs:   assignedJobs,
        leadsAssigned:g(r, 'Leads Assigned', 'Total Leads'),
        type:         g(r, 'Type', 'Employee Type') || 'Employee',
        specialty:    g(r, 'Specialty', 'Skills'),
        startDate:    g(r, 'Start Date'),
        notes:        g(r, 'Notes'),
      };
    });
    res.json(team);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Toggle team member active/inactive
app.post('/api/team/:row/toggle', async (req, res) => {
  try {
    const rowNum = parseInt(req.params.row);
    const { active } = req.body;
    const ok = await updateCell('Team', rowNum, 'Active', active ? 'Yes' : 'No');
    res.json({ success: ok });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: ALERTS ────────────────────────────────────────────────────────────
app.get('/api/alerts', async (req, res) => {
  try {
    const [leads, jobs] = await Promise.all([readTab('Leads'), readTab('Jobs')]);
    const alerts = [];

    // Hot leads not yet contacted (score >= 80, status New, no Last Contact)
    leads.forEach(l => {
      const score = parseInt(g(l,'Lead Score','AI Score'));
      const status = g(l,'Lead Status','Status').toLowerCase();
      const lastContact = g(l,'Last Contact','Last Contacted');
      const name = `${g(l,'First Name')} ${g(l,'Last Name')}`.trim();
      if (score >= 80 && status === 'new' && !lastContact && name) {
        alerts.push({
          type: 'urgent',
          priority: 'high',
          icon: '🔥',
          title: 'Hot lead not yet contacted',
          desc: `${name} · Score ${score}/100 · ${g(l,'Service Requested','Service Type','Project Type') || 'new lead'}`,
          tag: `Lead: ${name}`,
        });
      }
      // Stale active leads (no contact in 3+ days)
      const days = daysBetween(g(l,'Last Contact','Last Contacted'));
      if (days !== null && days >= 3 && !['converted','dead','lost'].includes(status) && name) {
        alerts.push({
          type: 'warning',
          priority: 'medium',
          icon: '⏰',
          title: `No contact in ${days} days — ${name}`,
          desc: `Status: ${g(l,'Lead Status','Status') || 'Unknown'} · Last contact: ${g(l,'Last Contact','Last Contacted') || 'never'}`,
          tag: `Lead: ${name}`,
        });
      }
    });

    // Job-level alerts
    jobs.forEach(j => {
      const name = `${g(j,'First Name')} ${g(j,'Last Name')}`.trim();
      const contractStatus = g(j,'Contract Status','Contract').toLowerCase();
      const depositPaid = g(j,'Deposit Paid','Deposit Invoice Paid');
      const finalPaid = g(j,'Final Paid','Final Invoice Paid');
      const jobStatus = g(j,'Job Status','Status').toLowerCase();
      const jobId = g(j,'Job ID');

      // Deposit overdue: Contract Signed but Deposit Paid = No for more than 3 days
      if (contractStatus.includes('sign')) {
        const contractDate = g(j,'Contract Signed Date','Contract Date','Proposal Date','Proposal Sent Date');
        const daysSigned = daysBetween(contractDate);
        if (daysSigned !== null && daysSigned > 3 && depositPaid && !/yes|paid/i.test(depositPaid) && name) {
          alerts.push({
            type: 'urgent',
            priority: 'high',
            icon: '💰',
            title: `Deposit overdue — ${name}`,
            desc: `Contract signed ${daysSigned} days ago · Deposit still unpaid · ${g(j,'Service Type','Project Type') || ''}`,
            tag: jobId ? `Job: ${jobId}` : `Job: ${name}`,
          });
        }
      }

      // No progress update this week (In Progress jobs with no weekly progress notes)
      if (jobStatus.includes('progress') && name) {
        const jobNotes = g(j,'Job Notes','Notes','Weekly Progress Notes','Progress Notes');
        const lastUpdate = g(j,'Last Progress Update','Last Update');
        const daysSinceUpdate = daysBetween(lastUpdate);
        if (!jobNotes && !lastUpdate || (daysSinceUpdate !== null && daysSinceUpdate >= 7)) {
          alerts.push({
            type: 'warning',
            priority: 'medium',
            icon: '📋',
            title: `No progress update this week — ${name}`,
            desc: `${g(j,'Service Type','Project Type') || 'Job'} is in progress · No weekly notes recorded`,
            tag: jobId ? `Job: ${jobId}` : `Job: ${name}`,
          });
        }
      }

      // Contract not signed after 5 days
      const proposalDate = g(j,'Proposal Sent Date','Proposal Date','Proposal Sent');
      const daysProposal = daysBetween(proposalDate);
      if (daysProposal !== null && daysProposal >= 5 &&
          !contractStatus.includes('sign') && name &&
          contractStatus && !contractStatus.includes('decline')) {
        alerts.push({
          type: 'warning',
          priority: 'medium',
          icon: '📄',
          title: `Contract not signed — ${name}`,
          desc: `Proposal sent ${daysProposal} days ago · ${g(j,'Service Type','Project Type') || ''}`,
          tag: jobId ? `Job: ${jobId}` : `Job: ${name}`,
        });
      }

      // Final invoice unpaid on complete jobs
      if (jobStatus.includes('complete') && finalPaid && !/yes|paid/i.test(finalPaid) && name) {
        alerts.push({
          type: 'urgent',
          priority: 'high',
          icon: '💰',
          title: `Final invoice unpaid — ${name}`,
          desc: `Job complete · ${g(j,'Total Job Value','Job Value') || ''}`,
          tag: jobId ? `Job: ${jobId}` : `Job: ${name}`,
        });
      }
    });

    // Sort by priority
    const order = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2));
    res.json(alerts);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: MARKETING ─────────────────────────────────────────────────────────
app.get('/api/marketing', async (req, res) => {
  try {
    const rows = await readTab('Marketing Library');
    res.json(rows.map((r, i) => ({
      _row: i + 2,
      campaignName: g(r, 'Campaign Name', 'Name'),
      type:         g(r, 'Target Segment', 'Campaign Type', 'Type'),
      description:  g(r, 'Message Theme', 'Description', 'Email Body', 'Body'),
      audience:     g(r, 'Target Segment', 'Target Audience', 'Audience'),
      status:       g(r, 'Status', 'Campaign Status'),
      launchDate:   g(r, 'Launch Date', 'Date Sent', 'Last Run Date'),
      emailsSent:   g(r, 'Emails Sent Count', 'Reach', 'Recipients'),
      conversions:  g(r, 'Conversions'),
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Launch a campaign — write "Launched" to Status column
app.post('/api/marketing/:row/launch', async (req, res) => {
  try {
    const row = parseInt(req.params.row);
    await updateCell('Marketing Library', row, ['Status', 'Campaign Status'], 'Launched');
    // Also try to write today's date to Launch Date
    try {
      await updateCell('Marketing Library', row, ['Launch Date', 'Date Sent'], new Date().toLocaleDateString('en-US'));
    } catch(_) {}
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: APPROVALS ──────────────────────────────────────────────────────────
app.get('/api/approvals', async (req, res) => {
  try {
    const rows = await readTab('Jobs');
    const items = [];
    rows.forEach((r, i) => {
      const rowNum = i + 2;
      const clientName = `${g(r,'First Name')} ${g(r,'Last Name')}`.trim() || g(r,'Client Name','Name') || 'Unknown';
      const jobId      = g(r, 'Job ID');
      const serviceType= g(r, 'Service Type', 'Project Type');
      const jobValue   = g(r, 'Total Job Value', 'Contract Amount', 'Job Value');
      const checks = [
        { type:'proposal', cols:['Proposal Sent'],   linkCols:['Proposal Doc Link','Proposal Link'],   label:'Proposal'     },
        { type:'contract', cols:['Contract Status'],  linkCols:['Contract Doc Link','Contract Link'],   label:'Contract'     },
      ];
      checks.forEach(({ type, cols, linkCols, label }) => {
        if (g(r, ...cols) === 'Pending Approval') {
          items.push({ _row: rowNum, jobId, clientName, serviceType, jobValue, type, label, docLink: g(r, ...linkCols) });
        }
      });
    });
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/jobs/:row/approve', async (req, res) => {
  try {
    const row  = parseInt(req.params.row);
    const { type } = req.body;
    if (isNaN(row) || row < 2) return res.status(400).json({ error: 'Invalid row' });
    const colMap = {
      proposal: ['Proposal Sent'],
      contract:  ['Contract Status'],
    };
    const linkMap = {
      proposal: ['Proposal Doc Link','Proposal Link'],
      contract:  ['Contract Doc Link','Contract Link'],
    };
    if (!colMap[type]) return res.status(400).json({ error: 'Unknown type' });
    await updateCell('Jobs', row, colMap[type], 'Approved');
    // Fire Make webhook if configured — include client info so Make doesn't need extra sheet reads
    const urlMap = { proposal: process.env.MAKE_PROPOSAL_WEBHOOK, contract: process.env.MAKE_CONTRACT_WEBHOOK, template: process.env.MAKE_TEMPLATE_WEBHOOK };
    const webhookUrl = urlMap[type];
    if (webhookUrl) {
      try {
        const jobRows = await readTab('Jobs');
        const jobRow  = jobRows[row - 2] || {};
        const payload = {
          rowNumber:   row,
          type,
          approved:    true,
          jobId:       g(jobRow, 'Job ID'),
          clientName:  `${g(jobRow,'First Name')} ${g(jobRow,'Last Name')}`.trim(),
          clientEmail: g(jobRow, 'Email'),
          serviceType: g(jobRow, 'Service Type', 'Project Type'),
          jobValue:    g(jobRow, 'Total Job Value', 'Contract Amount'),
          docLink:     g(jobRow, ...linkMap[type]),
        };
        const { default: nodeFetch } = await import('node-fetch').catch(() => ({ default: null }));
        const fetchFn = nodeFetch || (typeof fetch !== 'undefined' ? fetch : null);
        if (fetchFn) await fetchFn(webhookUrl, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      } catch (we) { console.warn('Webhook failed:', we.message); }
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/jobs/:row/flag', async (req, res) => {
  try {
    const row  = parseInt(req.params.row);
    const { type, note } = req.body;
    if (isNaN(row) || row < 2) return res.status(400).json({ error: 'Invalid row' });
    const colMap = {
      proposal: ['Proposal Sent'],
      contract:  ['Contract Status'],
    };
    if (!colMap[type]) return res.status(400).json({ error: 'Unknown type' });
    await updateCell('Jobs', row, colMap[type], 'Flagged — Needs Revision');
    if (note) await updateCell('Jobs', row, ['Job Notes','Notes'], note);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: FIELD UPDATE (PM logs daily progress from job site) ────────────────
app.post('/api/jobs/:row/field-update', async (req, res) => {
  try {
    const row = parseInt(req.params.row);
    if (isNaN(row) || row < 2) return res.status(400).json({ error: 'Invalid row' });
    const { note, notifyClient } = req.body;
    if (!note) return res.status(400).json({ error: 'Note required' });

    const now = new Date().toLocaleDateString('en-US');
    const timestamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

    // Append note with timestamp to Job Notes
    const { readRow } = require('./src/tools/sheets');
    const existing = await readRow('Jobs', row);
    const existingNotes = (existing?.['Job Notes'] || existing?.['Notes'] || '').trim();
    const newNotes = existingNotes
      ? `${existingNotes}\n[${timestamp}]: ${note}`
      : `[${timestamp}]: ${note}`;

    await updateCell('Jobs', row, ['Job Notes', 'Notes'], newNotes);
    await updateCell('Jobs', row, ['Last Client Update', 'Last Update'], now);

    // Optionally trigger client weekly update agent
    if (notifyClient) {
      const { route } = require('./src/agents/orchestrator');
      route('send_weekly_update', { rowNumber: row }).catch(err =>
        logger.error('API', `Field update notify client failed: ${err.message}`)
      );
    }

    res.json({ ok: true, timestamp });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: FIELD ISSUE FLAG (PM flags a problem, owner gets text + email) ─────
app.post('/api/jobs/:row/field-issue', async (req, res) => {
  try {
    const row = parseInt(req.params.row);
    if (isNaN(row) || row < 2) return res.status(400).json({ error: 'Invalid row' });
    const { issue, severity } = req.body;
    if (!issue) return res.status(400).json({ error: 'Issue description required' });

    const { readRow } = require('./src/tools/sheets');
    const job = await readRow('Jobs', row);
    const clientName = `${job?.['First Name'] || ''} ${job?.['Last Name'] || ''}`.trim() || 'Unknown Client';
    const projectType = job?.['Service Type'] || job?.['Project Type'] || 'Project';

    const timestamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

    // Append issue to notes
    const existingNotes = (job?.['Job Notes'] || job?.['Notes'] || '').trim();
    const issueNote = `[${timestamp}] ⚠️ ISSUE FLAGGED: ${issue}`;
    const newNotes = existingNotes ? `${existingNotes}\n${issueNote}` : issueNote;
    await updateCell('Jobs', row, ['Job Notes', 'Notes'], newNotes);

    // Notify owner via email + text
    const { notifyOwner } = require('./src/tools/notify');
    await notifyOwner({
      subject: `⚠️ Issue Flagged — ${clientName} ${projectType}`,
      message: `A field issue was flagged on the ${clientName} job (row ${row}).\n\nSeverity: ${severity || 'Unknown'}\n\nIssue: ${issue}\n\nLogged at: ${timestamp}`,
      urgent: true,
    });

    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: SETTINGS ───────────────────────────────────────────────────────────
app.get('/api/settings',  async (req, res) => {
  try { res.json(await readSettings()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', async (req, res) => {
  try { await writeSettings(req.body); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Legacy webhook aliases — kept for backward compat with existing Make.com scenarios
app.post('/webhook/new-lead', (req, res) => {
  res.status(200).json({ received: true });
  const { route } = require('./src/agents/orchestrator');
  const rowNumber = req.body.rowNumber || req.body.row;
  if (rowNumber) route('new_lead', { rowNumber: parseInt(rowNumber) }).catch(console.error);
});

app.post('/webhook/email-reply', (req, res) => {
  res.status(200).json({ received: true });
  const { route } = require('./src/agents/orchestrator');
  let data = req.body;
  if (req.body?.message?.data) {
    try { data = JSON.parse(Buffer.from(req.body.message.data, 'base64').toString()); } catch (_) {}
  }
  route('email_reply', data).catch(console.error);
});

// ─── CLIENT STATUS PAGE API ───────────────────────────────────────────────────
app.get('/api/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const rows = await readTab('Jobs');
    const job  = rows.find(r => (g(r,'Job ID') || '').toUpperCase() === jobId.toUpperCase());
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const settings = await readSettings();

    // Load phases
    const phaseRows = await readTab('Job Phases');
    const phases = phaseRows
      .filter(p => (g(p,'Job ID') || '').toUpperCase() === jobId.toUpperCase())
      .map(p => ({
        name:   g(p,'Phase','Phase Name') || '—',
        trade:  g(p,'Trade','Assigned Trade') || '',
        status: g(p,'Status','Phase Status') || 'Pending',
        start:  g(p,'Start Date','Phase Start') || '',
        end:    g(p,'End Date','Due Date','Phase End') || '',
      }));

    const totalPhases    = phases.length;
    const completePhases = phases.filter(p => p.status.toLowerCase().includes('complete')).length;
    const progressPct    = totalPhases > 0 ? Math.round((completePhases / totalPhases) * 100) : 0;

    res.json({
      company: {
        name:  settings.companyName || 'Your Contractor',
        phone: settings.phone || '',
        email: settings.email || '',
      },
      job: {
        id:          g(job,'Job ID') || jobId,
        clientName:  `${g(job,'First Name')||''} ${g(job,'Last Name')||''}`.trim(),
        projectType: g(job,'Service Type','Project Type') || 'Remodeling Project',
        status:      g(job,'Job Status','Status') || 'In Progress',
        startDate:   g(job,'Site Visit Date','Kickoff Date','Start Date') || '',
        endDate:     g(job,'Est. Completion','Estimated End','End Date') || '',
        lastUpdate:  g(job,'Last Client Update','Last Update') || '',
        notes:       g(job,'Job Notes','Notes') || '',
        address:     g(job,'Street Address','Address') || '',
      },
      phases,
      progress: { total: totalPhases, complete: completePhases, pct: progressPct },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── CLIENT STATUS PAGE ───────────────────────────────────────────────────────
app.get('/status/:jobId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'status.html'));
});

// ─── SERVE DASHBOARD ─────────────────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function relativeTime(str) {
  try {
    const d = new Date(str);
    const diff = (Date.now() - d) / 1000;
    if (diff < 3600)   return Math.round(diff/60) + 'm ago';
    if (diff < 86400)  return Math.round(diff/3600) + 'hr ago';
    if (diff < 604800) return Math.round(diff/86400) + 'd ago';
    return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
  } catch { return str; }
}

function scoreColor(score) {
  const n = parseInt(score);
  if (n >= 75) return '';
  if (n >= 50) return 'amber';
  return 'blue';
}

// Health check — always responds even if sheets API is down
app.get('/ping', (req, res) => res.send('pong'));

const PORT = process.env.PORT || 3000;
console.log(`Starting on PORT=${PORT}, SHEET_ID=${process.env.SHEET_ID ? 'set' : 'MISSING'}, GOOGLE_CLIENT_ID=${process.env.GOOGLE_CLIENT_ID ? 'set' : 'MISSING'}, ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING'}`);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ SPEC Systems CRM running on port ${PORT}`);
  // Start cron scheduler after server is up
  if (startScheduler) {
    try { startScheduler(); }
    catch (e) { console.warn('Scheduler failed to start:', e.message); }
  }
});
