require('dotenv').config();
const express = require('express');
const path    = require('path');
const { google } = require('googleapis');

// Catch unhandled errors so they appear in Railway logs
process.on('uncaughtException',  e => console.error('UNCAUGHT EXCEPTION:', e));
process.on('unhandledRejection', e => console.error('UNHANDLED REJECTION:', e));
let handleNewLead, handleEmailReply;
try {
  ({ handleNewLead, handleEmailReply } = require('./agent'));
} catch (e) {
  console.warn('⚠️  Agent module failed to load:', e.message);
  handleNewLead = handleEmailReply = async () => ({ error: 'Agent not available' });
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

    // Hot leads not yet contacted
    leads.forEach(l => {
      const score = parseInt(g(l,'Lead Score'));
      const status = g(l,'Lead Status','Status').toLowerCase();
      const days = daysBetween(g(l,'Last Contact','Last Contacted','Timestamp'));
      const name = `${g(l,'First Name')} ${g(l,'Last Name')}`.trim();
      if (score >= 75 && status === 'new') {
        alerts.push({ type:'lead', priority:'high', icon:'🔥',
          title:`Hot lead not contacted — ${name}`,
          body:`Score ${score}/100 · ${g(l,'Project Type')} · ${g(l,'Phone')}`,
          action:'View Lead', color:'red' });
      }
      if (days !== null && days >= 3 && !['converted','dead'].includes(status) && name) {
        alerts.push({ type:'lead', priority:'medium', icon:'⏰',
          title:`No contact in ${days} days — ${name}`,
          body:`Status: ${g(l,'Lead Status','Status') || 'Unknown'} · Last: ${g(l,'Last Contact') || 'never'}`,
          action:'View Lead', color:'amber' });
      }
    });

    // Contract not signed after 5 days
    jobs.forEach(j => {
      const name = `${g(j,'First Name')} ${g(j,'Last Name')}`.trim();
      const contractStatus = g(j,'Contract Status','Contract').toLowerCase();
      const proposalDate = g(j,'Proposal Date','Proposal Sent');
      const depositPaid = g(j,'Deposit Paid','Deposit Invoice Paid');
      const finalPaid = g(j,'Final Paid','Final Invoice Paid');
      const jobStatus = g(j,'Job Status','Status').toLowerCase();
      const daysProposal = daysBetween(proposalDate);

      if (daysProposal !== null && daysProposal >= 5 &&
          !contractStatus.includes('sign') && name &&
          contractStatus && !contractStatus.includes('decline')) {
        alerts.push({ type:'contract', priority:'high', icon:'📄',
          title:`Contract not signed — ${name}`,
          body:`Proposal sent ${daysProposal} days ago · ${g(j,'Service Type')}`,
          action:'View Job', color:'amber' });
      }

      // Invoice overdue
      if (jobStatus.includes('progress') && depositPaid && !/yes|paid/i.test(depositPaid) && name) {
        alerts.push({ type:'invoice', priority:'high', icon:'💰',
          title:`Deposit not paid — ${name}`,
          body:`Job in progress · ${g(j,'Service Type')} · ${g(j,'Total Job Value','Job Value')}`,
          action:'View Job', color:'red' });
      }
      if (jobStatus.includes('complete') && finalPaid && !/yes|paid/i.test(finalPaid) && name) {
        alerts.push({ type:'invoice', priority:'high', icon:'💰',
          title:`Final invoice unpaid — ${name}`,
          body:`Job complete · ${g(j,'Total Job Value','Job Value')}`,
          action:'View Job', color:'red' });
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

// ─── API: SETTINGS ───────────────────────────────────────────────────────────
app.get('/api/settings',  async (req, res) => {
  try { res.json(await readSettings()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', async (req, res) => {
  try { await writeSettings(req.body); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── WEBHOOKS ────────────────────────────────────────────────────────────────
app.post('/webhook/new-lead', async (req, res) => {
  res.status(200).json({ received: true });
  try { await handleNewLead(req.body, req.query.clientId || 'default'); }
  catch (e) { console.error(e.message); }
});

app.post('/webhook/email-reply', async (req, res) => {
  res.status(200).json({ received: true });
  try {
    let data = req.body;
    if (req.body.message?.data) data = JSON.parse(Buffer.from(req.body.message.data, 'base64').toString());
    await handleEmailReply(data, req.query.clientId || 'default');
  } catch (e) { console.error(e.message); }
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
console.log(`Starting on PORT=${PORT}, SHEET_ID=${process.env.SHEET_ID ? 'set' : 'MISSING'}, GOOGLE_CLIENT_ID=${process.env.GOOGLE_CLIENT_ID ? 'set' : 'MISSING'}`);
app.listen(PORT, '0.0.0.0', () => console.log(`✅ SPEC Systems CRM running on port ${PORT}`));
