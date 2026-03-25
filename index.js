require('dotenv').config();
const express = require('express');
const path    = require('path');
const { google } = require('googleapis');

// Catch unhandled errors so they appear in Railway logs
process.on('uncaughtException',  e => console.error('UNCAUGHT EXCEPTION:', e));
process.on('unhandledRejection', e => console.error('UNHANDLED REJECTION:', e));

// ─── AI AGENT SYSTEM ─────────────────────────────────────────────────────────
let webhookRouter, startScheduler, addSseClient, logger;
try {
  webhookRouter  = require('./src/triggers/webhooks');
  ({ startScheduler } = require('./src/triggers/scheduler'));
  ({ logger, addClient: addSseClient } = require('./src/utils/logger'));
  console.log('✅ AI Agent system loaded');
} catch (e) {
  console.warn('⚠️  AI Agent system failed to load:', e.message);
  webhookRouter = null; startScheduler = null; addSseClient = null;
  logger = { info: console.log, success: console.log, warn: console.warn, error: console.error };
}

const crypto = require('crypto');

const app = express();

// ─── STRIPE WEBHOOK (raw body MUST come before express.json) ─────────────────
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) return res.status(200).send('Stripe webhook secret not configured');

  let event;
  try {
    const Stripe = require('stripe');
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    logger.error('Stripe', `Webhook signature failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session   = event.data.object;
    const jobId     = session.metadata?.jobId;
    const amountPaid = (session.amount_total || 0) / 100; // cents → dollars
    const desc      = (session.metadata?.description || '').toLowerCase();

    if (jobId) {
      try {
        const jobs    = await readTab('Jobs');
        const job     = jobs.find(j => g(j, 'Job ID') === jobId);
        if (job) {
          const row   = jobs.indexOf(job) + 2;
          const today = new Date().toLocaleDateString('en-US');
          const clientName = `${g(job,'First Name','')} ${g(job,'Last Name','')}`.trim() || 'Client';
          const isFinal = desc.includes('final') || desc.includes('balance');

          if (isFinal) {
            await updateCell('Jobs', row, ['Final Invoice Paid', 'Final Paid'], 'Yes');
            await updateCell('Jobs', row, ['Final Paid Date', 'Final Invoice Paid Date'], today);
          } else {
            await updateCell('Jobs', row, ['Deposit Paid', 'Deposit Invoice Paid'], 'Yes');
            await updateCell('Jobs', row, ['Deposit Paid Date'], today);
          }

          const { notifyOwner } = require('./src/tools/notify');
          await notifyOwner({
            subject: `💰 Payment Received — ${clientName}`,
            message: `${clientName} just paid $${amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${isFinal ? '(final invoice)' : '(deposit)'} via Stripe.\n\nJob: ${g(job,'Service Type','Project Type') || 'Project'}\nJob ID: ${jobId}\n\nThe sheet has been updated automatically.`,
            urgent: true,
            eventType: 'paymentReceived',
          });

          logger.success('Stripe', `Payment recorded: ${clientName} paid $${amountPaid} (${isFinal ? 'final' : 'deposit'})`);
        }
      } catch (e) {
        logger.error('Stripe', `Failed to process payment webhook: ${e.message}`);
      }
    }
  }

  res.json({ received: true });
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─── AUTH ─────────────────────────────────────────────────────────────────────
const COOKIE_NAME = 'spec_auth';
const SESS_SECRET = process.env.SESSION_SECRET || 'spec-crm-secret-please-change';

/**
 * Parse configured users from env vars.
 * LOGIN_USERS="name:password:role,name2:password2:role2"
 * Roles: owner | sales | field
 * Falls back to LOGIN_PASSWORD (treated as owner).
 */
function getUsers() {
  const users = [];
  if (process.env.LOGIN_USERS) {
    process.env.LOGIN_USERS.split(',').forEach(entry => {
      const parts = entry.trim().split(':');
      if (parts.length >= 2 && parts[0] && parts[1]) {
        users.push({ name: parts[0].trim(), password: parts[1].trim(), role: (parts[2] || 'sales').trim() });
      }
    });
  }
  // Backward compat: single LOGIN_PASSWORD → owner
  if (process.env.LOGIN_PASSWORD && !users.some(u => u.role === 'owner')) {
    users.push({ name: 'Owner', password: process.env.LOGIN_PASSWORD, role: 'owner' });
  }
  return users;
}

function signUserToken(name, role, password) {
  return crypto.createHmac('sha256', SESS_SECRET).update(`${name}|${role}|${password}`).digest('hex');
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    if (k) out[k.trim()] = decodeURIComponent(v.join('=').trim());
  });
  return out;
}

/** Returns { name, role } or null. Supports legacy single-password cookies. */
function getAuthSession(req) {
  const cookie = parseCookies(req)[COOKIE_NAME] || '';
  if (!cookie) return null;
  const users = getUsers();
  if (!users.length) return { name: 'Owner', role: 'owner' }; // no auth configured

  // New cookie format: base64url(name).role.hmac
  const parts = cookie.split('.');
  if (parts.length === 3) {
    const [b64, role, hmac] = parts;
    let name;
    try { name = Buffer.from(b64, 'base64url').toString(); } catch { return null; }
    const user = users.find(u => u.name === name && u.role === role);
    if (!user) return null;
    if (hmac !== signUserToken(name, role, user.password)) return null;
    return { name, role };
  }

  // Legacy format: bare hmac — check LOGIN_PASSWORD owner
  const pw = process.env.LOGIN_PASSWORD;
  if (pw) {
    const legacy = crypto.createHmac('sha256', SESS_SECRET).update(pw).digest('hex');
    if (cookie === legacy) return { name: 'Owner', role: 'owner' };
  }
  return null;
}

function isAuthenticated(req) {
  const users = getUsers();
  if (!users.length) return true; // dev mode — no auth configured
  return getAuthSession(req) !== null;
}

function setSessionCookie(res, user) {
  const b64  = Buffer.from(user.name).toString('base64url');
  const hmac = signUserToken(user.name, user.role, user.password);
  const val  = `${b64}.${user.role}.${hmac}`;
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=${val}; HttpOnly; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Strict`
  );
}

// Paths that never require a login
const PUBLIC_PREFIXES = [
  '/login', '/ping',
  '/status.html', '/sub.html',
  '/api/status/', '/api/sub/',
  '/api/proposal/approve', '/api/proposal/decline',
  '/api/change-order/approve', '/api/change-order/decline',
  '/api/kickoff/select',
  '/api/stripe/webhook',
  '/webhook/sms',
];

app.use((req, res, next) => {
  const pub = PUBLIC_PREFIXES.some(p => req.path.startsWith(p))
           || req.path === '/favicon.ico'
           || req.path.endsWith('.png') || req.path.endsWith('.ico')
           || req.path.endsWith('.json'); // manifest.json

  if (!pub && !isAuthenticated(req)) {
    if (req.path.startsWith('/api/') || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.redirect('/login');
  }

  // Role-based restrictions — non-owners can't write settings or toggle team
  const session = getAuthSession(req);
  if (session && session.role !== 'owner') {
    if (req.method === 'POST' && req.path === '/api/settings') {
      return res.status(403).json({ error: 'Owner access required' });
    }
    if (req.method === 'POST' && /^\/api\/team\/\d+\/toggle/.test(req.path)) {
      return res.status(403).json({ error: 'Owner access required' });
    }
  }

  next();
});

// Who am I?
app.get('/api/me', (req, res) => {
  const session = getAuthSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  res.json(session);
});

// Login page
app.get('/login', (req, res) => {
  if (isAuthenticated(req)) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Login form submit
app.post('/login', (req, res) => {
  const { password } = req.body;
  const users = getUsers();

  if (!users.length) {
    // No auth configured — set open owner session
    setSessionCookie(res, { name: 'Owner', role: 'owner', password: '' });
    return res.redirect('/');
  }

  const user = users.find(u => u.password === password);
  if (user) {
    setSessionCookie(res, user);
    return res.redirect('/');
  }
  res.redirect('/login?error=1');
});

// Logout
app.get('/logout', (req, res) => {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0`);
  res.redirect('/login');
});

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
      range: 'Settings!A1:B80',
    });
    const rows = res.data.values || [];
    const map = {};
    rows.forEach(r => {
      if (r[0] && r[1] !== undefined && !String(r[0]).startsWith('▸')) map[r[0].trim()] = String(r[1]).trim();
    });
    // Collect "Notify: X" preference keys
    const notifyPrefs = {};
    Object.entries(map).forEach(([k, v]) => {
      if (k.startsWith('Notify: ')) notifyPrefs[k] = v.toLowerCase();
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
      emailTone:        map['Email Tone']                 || '',
      aboutUs:          map['About Us']                   || '',
      keySellingPoints: map['Key Selling Points']         || '',
      notifyPrefs,
    };
  } catch (e) { return {}; }
}

// Write Settings — update existing rows or append new ones
async function writeSettings(data) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID, range: 'Settings!A1:A80',
  });
  const existingRows = res.data.values || [];
  const labels = existingRows.map(r => (r[0] || '').trim());

  const writeMap = {
    'Company Name':              data.companyName      ?? '',
    'Owner / Salesperson Name':  data.ownerName        ?? '',
    'Company Phone':             data.phone            ?? '',
    'Company Email':             data.email            ?? '',
    'Company Address':           data.address          ?? '',
    'Calendly Link':             data.calendlyLink     ?? '',
    'Google Review Link':        data.googleReviewLink ?? '',
    'Email Signature':           data.emailSignature   ?? '',
    'Email Tone':                data.emailTone        ?? '',
    'About Us':                  data.aboutUs          ?? '',
    'Key Selling Points':        data.keySellingPoints ?? '',
    ...Object.fromEntries(Object.entries(data.notifyPrefs || {}).map(([k, v]) => [k, v])),
  };

  const toAppend = [];
  for (const [label, value] of Object.entries(writeMap)) {
    if (!label) continue;
    const rowIdx = labels.indexOf(label);
    if (rowIdx !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `Settings!B${rowIdx + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[value]] },
      });
    } else {
      // Key doesn't exist yet — batch append after the loop
      toAppend.push([label, value]);
    }
  }

  if (toAppend.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Settings!A:B',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: toAppend },
    });
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
      companyName: settings.companyName || '',
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

// Update phase actual cost (job costing)
app.post('/api/phases/:row/actual-cost', async (req, res) => {
  try {
    const rowNum = parseInt(req.params.row);
    const { actualCost } = req.body;
    if (isNaN(rowNum) || rowNum < 2) return res.status(400).json({ error: 'Invalid row' });
    const ok = await updateCell('Job Phases', rowNum, ['Actual Cost', 'Actual'], String(actualCost || '0'));
    res.json({ success: ok });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update phase status
app.post('/api/phases/:row/status', async (req, res) => {
  try {
    const rowNum = parseInt(req.params.row);
    if (isNaN(rowNum) || rowNum < 2) return res.status(400).json({ error: 'Invalid row' });
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
    if (isNaN(rowNum) || rowNum < 2) return res.status(400).json({ error: 'Invalid row' });
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
    if (isNaN(row) || row < 2) return res.status(400).json({ error: 'Invalid row' });
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
      eventType: 'fieldIssue',
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

// ─── CHANGE ORDER API ────────────────────────────────────────────────────────

// Manually trigger a change order from the dashboard
app.post('/api/jobs/:row/change-order', async (req, res) => {
  try {
    const row = parseInt(req.params.row);
    if (isNaN(row) || row < 2) return res.status(400).json({ error: 'Invalid row' });
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: 'Description required' });
    res.json({ ok: true, message: 'Change order generation started' });
    const { generateChangeOrder } = require('./src/agents/change-order-agent');
    generateChangeOrder({ rowNumber: row, changeDescription: description }).catch(err =>
      logger.error('API', `Change order failed: ${err.message}`)
    );
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Client approves change order via email link
app.get('/api/change-order/approve/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const [rows, settings] = await Promise.all([readTab('Change Orders'), readSettings()]);
    const companyName = settings.companyName || 'Your Contractor';
    const co   = rows.find(r => g(r, 'Approval Token') === token);
    if (!co) return res.status(404).send(changeOrderResponsePage('not-found', null, companyName));

    const status = g(co, 'Status') || '';
    if (status === 'Approved') return res.send(changeOrderResponsePage('already-approved', co, companyName));
    if (status === 'Declined') return res.send(changeOrderResponsePage('already-declined', co, companyName));

    // Update change order status
    await updateCell('Change Orders', co._row, 'Status', 'Approved');
    await updateCell('Change Orders', co._row, 'Approved/Declined Date', new Date().toLocaleDateString('en-US'));

    // Update job value if cost impact exists
    const costImpact = parseFloat(g(co, 'Cost Impact') || '0');
    const jobRow     = parseInt(g(co, 'Job Row') || '0');
    if (jobRow >= 2 && costImpact !== 0) {
      const jobRows  = await readTab('Jobs');
      const job      = jobRows.find((_, i) => i + 2 === jobRow);
      if (job) {
        const currentValue = parseFloat((g(job, 'Total Job Value', 'Contract Amount', 'Job Value') || '0').replace(/[^0-9.]/g, ''));
        const newValue = currentValue + costImpact;
        await updateCell('Jobs', jobRow, ['Total Job Value', 'Contract Amount', 'Job Value'], String(newValue));
        const timelineImpact = parseInt(g(co, 'Timeline Impact') || '0');
        if (timelineImpact > 0) {
          const note = `[Change Order Approved ${new Date().toLocaleDateString()}]: ${g(co, 'Description')} — +$${costImpact.toLocaleString()}, +${timelineImpact} days`;
          const existingNotes = g(job, 'Job Notes', 'Notes') || '';
          await updateCell('Jobs', jobRow, ['Job Notes', 'Notes'], existingNotes ? `${existingNotes}\n${note}` : note);
        }
      }
    }

    // Notify owner
    const { notifyOwner } = require('./src/tools/notify');
    await notifyOwner({
      subject: `✅ Change Order Approved — ${g(co, 'Client Name')}`,
      message: `${g(co, 'Client Name')} approved the change order.\n\nChange: ${g(co, 'Description')}\nCost Impact: +$${costImpact.toLocaleString()}\nTimeline: +${g(co, 'Timeline Impact') || 0} days\n\nJob value has been updated automatically.`,
      urgent: true,
      eventType: 'changeOrder',
    });

    res.send(changeOrderResponsePage('approved', co, companyName));
  } catch (e) {
    logger.error('API', `Change order approve failed: ${e.message}`);
    res.status(500).send(changeOrderResponsePage('error', null));
  }
});

// Client declines change order via email link
app.get('/api/change-order/decline/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const [rows, settings] = await Promise.all([readTab('Change Orders'), readSettings()]);
    const companyName = settings.companyName || 'Your Contractor';
    const co   = rows.find(r => g(r, 'Approval Token') === token);
    if (!co) return res.status(404).send(changeOrderResponsePage('not-found', null, companyName));

    await updateCell('Change Orders', co._row, 'Status', 'Declined');
    await updateCell('Change Orders', co._row, 'Approved/Declined Date', new Date().toLocaleDateString('en-US'));

    const { notifyOwner } = require('./src/tools/notify');
    await notifyOwner({
      subject: `❌ Change Order Declined — ${g(co, 'Client Name')}`,
      message: `${g(co, 'Client Name')} declined the change order.\n\nChange: ${g(co, 'Description')}\nCost Impact: $${g(co, 'Cost Impact') || 0}\n\nFollow up with the client to discuss alternatives.`,
      urgent: true,
      eventType: 'changeOrder',
    });

    res.send(changeOrderResponsePage('declined', co, companyName));
  } catch (e) {
    res.status(500).send(changeOrderResponsePage('error', null));
  }
});

function changeOrderResponsePage(type, co, companyName = 'Your Contractor') {
  const msgs = {
    'approved':         { icon: '✅', title: 'Change Order Approved!', sub: 'Thank you — we\'ll get started on the updated scope right away.', color: '#22C55E' },
    'declined':         { icon: '❌', title: 'Change Order Declined', sub: 'No problem — we\'ll be in touch to discuss your options.', color: '#EF4444' },
    'already-approved': { icon: '✅', title: 'Already Approved', sub: 'This change order was already approved. We\'re on it!', color: '#22C55E' },
    'already-declined': { icon: '❌', title: 'Already Declined', sub: 'This change order was already declined.', color: '#EF4444' },
    'not-found':        { icon: '🔍', title: 'Link Expired', sub: 'This link is no longer valid. Please contact us directly.', color: '#6B7280' },
    'error':            { icon: '⚠️', title: 'Something went wrong', sub: 'Please contact us directly.', color: '#F59E0B' },
  };
  const m = msgs[type] || msgs['error'];
  const desc = co ? g(co, 'Description') : '';
  const cost = co ? g(co, 'Cost Impact') : '';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${m.title}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F4F5F7;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
  .card{background:#fff;border-radius:16px;padding:40px 32px;max-width:400px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .icon{font-size:56px;margin-bottom:16px}.title{font-size:24px;font-weight:800;color:#111827;margin-bottom:8px}
  .sub{font-size:15px;color:#6B7280;line-height:1.5;margin-bottom:20px}
  .detail{background:#F9FAFB;border-radius:10px;padding:14px;font-size:13px;color:#374151;text-align:left}
  .powered{font-size:12px;color:#9CA3AF;margin-top:24px}</style></head>
  <body><div class="card">
    <div class="icon">${m.icon}</div>
    <div class="title">${m.title}</div>
    <div class="sub">${m.sub}</div>
    ${desc ? `<div class="detail"><strong>Change:</strong> ${desc}${cost ? `<br><strong>Cost Impact:</strong> $${parseFloat(cost).toLocaleString()}` : ''}</div>` : ''}
    <div class="powered">Powered by ${companyName}</div>
  </div></body></html>`;
}

// ─── SUB PORTAL API ───────────────────────────────────────────────────────────
app.get('/api/sub/:name', async (req, res) => {
  try {
    const subName = decodeURIComponent(req.params.name).toLowerCase();
    const settings = await readSettings();

    // Get all phases assigned to this sub
    const phaseRows = await readTab('Job Phases');
    const myPhases  = phaseRows.filter(p => {
      const assigned = (g(p,'Assigned To','Assigned Name','assignedTo') || '').toLowerCase();
      const trade    = (g(p,'Trade','Assigned Trade') || '').toLowerCase();
      return assigned.includes(subName) || trade.includes(subName);
    });

    if (!myPhases.length) return res.status(404).json({ error: 'No phases found for this sub' });

    // Group by job and enrich with job data
    const jobRows = await readTab('Jobs');
    const jobMap  = {};
    jobRows.forEach(j => { jobMap[g(j,'Job ID') || ''] = j; });

    const phases = myPhases.map((p, i) => {
      const jobId  = g(p,'Job ID') || '';
      const job    = jobMap[jobId] || {};
      const status = g(p,'Status','Phase Status') || 'Pending';
      return {
        _row:      p._row || (i + 2),
        phaseId:   g(p,'Phase ID') || '',
        jobId,
        phaseName: g(p,'Phase','Phase Name') || '—',
        trade:     g(p,'Trade','Assigned Trade') || '',
        status,
        startDate: g(p,'Start Date','Phase Start') || '',
        endDate:   g(p,'End Date','Due Date','Phase End') || '',
        materials: g(p,'Materials Needed','Materials') || '',
        notes:     g(p,'Description','Notes') || '',
        // Job info
        clientFirst:  g(job,'First Name') || '',
        address:      g(job,'Street Address','Address') || '',
        city:         g(job,'City') || '',
        projectType:  g(job,'Service Type','Project Type') || '',
      };
    }).sort((a, b) => {
      // Sort: in-progress first, then pending by start date, then complete
      const order = { 'in progress': 0, 'active': 0, 'pending': 1, 'complete': 2, 'done': 2 };
      const ao = order[(a.status||'').toLowerCase()] ?? 1;
      const bo = order[(b.status||'').toLowerCase()] ?? 1;
      return ao - bo;
    });

    res.json({
      subName: decodeURIComponent(req.params.name),
      company: { name: settings.companyName, phone: settings.phone, email: settings.email },
      phases,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Sub marks a phase complete
app.post('/api/sub/phase/:row/complete', async (req, res) => {
  try {
    const row  = parseInt(req.params.row);
    const { notes } = req.body || {};
    if (isNaN(row) || row < 2) return res.status(400).json({ error: 'Invalid row' });
    await updateCell('Job Phases', row, 'Status', 'Complete');
    await updateCell('Job Phases', row, 'Completion Date', new Date().toLocaleDateString('en-US'));
    if (notes) await updateCell('Job Phases', row, 'Description', notes);

    // Text the client that this phase is done
    try {
      const phaseRows = await readTab('Job Phases');
      const phase     = phaseRows[row - 2];
      const phaseName = g(phase, 'Phase Name', 'Phase') || 'A phase';
      const jobId     = g(phase, 'Job ID') || '';
      if (jobId) {
        const jobRows = await readTab('Jobs');
        const job     = jobRows.find(j => g(j, 'Job ID') === jobId);
        const phone   = job ? g(job, 'Phone Number', 'Phone') : '';
        const firstName = job ? g(job, 'First Name') : '';
        if (phone) {
          const { textPerson } = require('./src/tools/notify');
          const msg = `Hey ${firstName || 'there'} 👋 Quick update on your project — the ${phaseName} phase just wrapped up! We'll keep you posted as we move to the next step. Any questions, just reply!`;
          await textPerson({ to: phone, message: msg });
        }
      }
    } catch (smsErr) { console.warn('Phase complete SMS failed:', smsErr.message); }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SUB PORTAL PAGE ──────────────────────────────────────────────────────────
app.get('/sub/:name', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sub.html'));
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

// ─── PHOTO LOG API ────────────────────────────────────────────────────────────

// Upload a photo (base64) for a job — stores in Google Drive, logs in Job Photos tab
app.post('/api/jobs/:row/photos', async (req, res) => {
  try {
    const row = parseInt(req.params.row);
    if (isNaN(row) || row < 2) return res.status(400).json({ error: 'Invalid row' });
    const { imageData, mimeType = 'image/jpeg', caption = '' } = req.body;
    if (!imageData) return res.status(400).json({ error: 'imageData required' });

    // Read job to get jobId
    const { readRow } = require('./src/tools/sheets');
    const job    = await readRow('Jobs', row);
    const jobId  = job?.['Job ID'] || `ROW${row}`;
    const clientName = `${job?.['First Name'] || ''} ${job?.['Last Name'] || ''}`.trim();

    // Upload to Google Drive
    const { google } = require('googleapis');
    const { Readable } = require('stream');
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const drive = google.drive({ version: 'v3', auth });

    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('gif') ? 'gif' : 'jpg';
    const filename = `${jobId}_${Date.now()}.${ext}`;
    const buffer = Buffer.from(imageData, 'base64');

    const file = await drive.files.create({
      requestBody: { name: filename },
      media: { mimeType, body: Readable.from(buffer) },
      fields: 'id',
    });
    const fileId = file.data.id;

    // Make it publicly readable
    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    const photoUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
    const timestamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

    // Append to Job Photos tab
    const sheets = getSheets();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Job Photos!A:F',
      valueInputOption: 'RAW',
      requestBody: { values: [[jobId, row, clientName, caption, photoUrl, timestamp]] },
    }).catch(async () => {
      // Tab may not exist — create it first via a write to row 1, then append
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: 'Job Photos!A1:F1',
        valueInputOption: 'RAW',
        requestBody: { values: [['Job ID', 'Job Row', 'Client Name', 'Caption', 'Photo URL', 'Timestamp']] },
      }).catch(() => {});
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'Job Photos!A:F',
        valueInputOption: 'RAW',
        requestBody: { values: [[jobId, row, clientName, caption, photoUrl, timestamp]] },
      }).catch(() => {});
    });

    res.json({ ok: true, photoUrl, fileId, timestamp });
  } catch (e) {
    console.error('Photo upload error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Get all photos for a job (by jobId — used by status page)
app.get('/api/jobs/:jobId/photos', async (req, res) => {
  try {
    const { jobId } = req.params;
    const sheets = getSheets();
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Job Photos!A:F',
    }).catch(() => ({ data: { values: [] } }));
    const rows   = result.data.values || [];
    if (rows.length < 2) return res.json([]);
    const headers = rows[0];
    const photos  = rows.slice(1)
      .filter(r => (r[0] || '').toUpperCase() === jobId.toUpperCase())
      .map(r => ({
        jobId:     r[0] || '',
        caption:   r[3] || '',
        photoUrl:  r[4] || '',
        timestamp: r[5] || '',
      }))
      .reverse(); // newest first
    res.json(photos);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PROPOSAL APPROVAL API ────────────────────────────────────────────────────

// Client clicks "Yes, Let's Do It!" in proposal email
app.get('/api/proposal/approve/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const [rows, settings] = await Promise.all([readTab('Jobs'), readSettings()]);
    const companyName = settings.companyName || 'Your Contractor';
    const job  = rows.find(r => g(r, 'Proposal Token', 'Proposal Approval Token') === token);
    if (!job) return res.status(404).send(proposalResponsePage('not-found', null, companyName));

    const status = g(job, 'Proposal Status', 'Proposal Sent') || '';
    if (status === 'Approved') return res.send(proposalResponsePage('already-approved', job, companyName));
    if (/declined|not right now/i.test(status)) return res.send(proposalResponsePage('already-declined', job, companyName));

    const jobRow = rows.indexOf(job) + 2;

    // Update proposal status
    await updateCell('Jobs', jobRow, ['Proposal Status', 'Proposal Sent'], 'Approved');
    await updateCell('Jobs', jobRow, ['Proposal Accepted Date', 'Proposal Approved Date'], new Date().toLocaleDateString('en-US'));
    await updateCell('Jobs', jobRow, ['Job Status', 'Status'], 'Contract Pending');

    // Auto-trigger contract generation
    try {
      const { route } = require('./src/agents/orchestrator');
      route('generate_contract', { rowNumber: jobRow }).catch(err =>
        console.error('Contract generation failed:', err.message)
      );
    } catch (_) {}

    // Notify owner urgently
    const { notifyOwner } = require('./src/tools/notify');
    const clientName  = `${g(job,'First Name')||''} ${g(job,'Last Name')||''}`.trim() || 'Client';
    const projectType = g(job,'Service Type','Project Type') || 'Project';
    const jobValue    = g(job,'Total Job Value','AI Estimate High','Estimate High') || '';
    await notifyOwner({
      subject: `🎉 Proposal Approved — ${clientName}!`,
      message: `${clientName} just approved their ${projectType} proposal!\n\nJob Value: ${jobValue ? '$' + jobValue : 'TBD'}\n\nThe contract is being generated now and will be ready for your review shortly.`,
      urgent: true,
      eventType: 'proposalApproved',
    });

    res.send(proposalResponsePage('approved', job, companyName));
  } catch (e) {
    logger.error('API', `Proposal approve failed: ${e.message}`);
    res.status(500).send(proposalResponsePage('error', null));
  }
});

// Client clicks "Not Right Now" in proposal email
app.get('/api/proposal/decline/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const [rows, settings] = await Promise.all([readTab('Jobs'), readSettings()]);
    const companyName = settings.companyName || 'Your Contractor';
    const job  = rows.find(r => g(r, 'Proposal Token', 'Proposal Approval Token') === token);
    if (!job) return res.status(404).send(proposalResponsePage('not-found', null, companyName));

    const jobRow = rows.indexOf(job) + 2;

    await updateCell('Jobs', jobRow, ['Proposal Status', 'Proposal Sent'], 'Declined');
    await updateCell('Jobs', jobRow, ['Job Status', 'Status'], 'Lost');

    const { notifyOwner } = require('./src/tools/notify');
    const clientName  = `${g(job,'First Name')||''} ${g(job,'Last Name')||''}`.trim() || 'Client';
    const projectType = g(job,'Service Type','Project Type') || 'Project';
    await notifyOwner({
      subject: `Proposal Declined — ${clientName}`,
      message: `${clientName} declined their ${projectType} proposal.\n\nThis sometimes means they need more time or have questions — worth a personal follow-up call.\n\nJob status updated to Lost.`,
      urgent: false,
      eventType: 'proposalDeclined',
    });

    res.send(proposalResponsePage('declined', job, companyName));
  } catch (e) {
    res.status(500).send(proposalResponsePage('error', null));
  }
});

function proposalResponsePage(type, job, companyName = 'Your Contractor') {
  const msgs = {
    'approved':         { icon: '🎉', title: 'You\'re In!', sub: 'Thanks for approving — we\'re excited to get started. We\'ll be in touch shortly with your contract and next steps.', color: '#22C55E' },
    'declined':         { icon: '👋', title: 'Got It', sub: 'No worries at all. If you change your mind or want to chat through any details, just reply to our email or give us a call. We\'re here when you\'re ready.', color: '#6B7280' },
    'already-approved': { icon: '✅', title: 'Already Approved!', sub: 'You\'re all set — your proposal has already been approved. We\'ll be in touch with next steps soon.', color: '#22C55E' },
    'already-declined': { icon: '👋', title: 'Already Noted', sub: 'You\'ve already declined this proposal. Reach out anytime if you change your mind!', color: '#6B7280' },
    'not-found':        { icon: '🔍', title: 'Link Expired', sub: 'This link is no longer valid. Please contact us directly and we\'ll get you sorted.', color: '#6B7280' },
    'error':            { icon: '⚠️', title: 'Something Went Wrong', sub: 'Please contact us directly and we\'ll take care of it right away.', color: '#F59E0B' },
  };
  const m = msgs[type] || msgs['error'];
  const projectType = job ? g(job, 'Service Type', 'Project Type') : '';
  const clientFirst = job ? (g(job,'First Name') || '') : '';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${m.title}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F4F5F7;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
  .card{background:#fff;border-radius:16px;padding:40px 32px;max-width:420px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .header{background:#0A2240;margin:-40px -32px 28px;padding:24px 32px;border-radius:16px 16px 0 0}
  .header-label{color:#BF9438;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px}
  .header-title{color:#fff;font-size:15px;font-weight:700}
  .icon{font-size:52px;margin-bottom:14px}.title{font-size:22px;font-weight:800;color:#111827;margin-bottom:10px}
  .sub{font-size:15px;color:#6B7280;line-height:1.6;margin-bottom:24px}
  .accent{display:inline-block;background:#F0FDF4;color:#15803D;font-size:13px;font-weight:600;padding:6px 16px;border-radius:999px;margin-bottom:20px}
  .powered{font-size:12px;color:#9CA3AF;margin-top:8px}</style></head>
  <body><div class="card">
    <div class="header">
      <div class="header-label">${companyName}</div>
      <div class="header-title">${projectType ? projectType + ' Proposal' : 'Project Proposal'}</div>
    </div>
    <div class="icon">${m.icon}</div>
    ${clientFirst && type === 'approved' ? `<div class="accent">Welcome aboard, ${clientFirst}! 🏠</div>` : ''}
    <div class="title">${m.title}</div>
    <div class="sub">${m.sub}</div>
    <div class="powered">Powered by ${companyName}</div>
  </div></body></html>`;
}

// ─── ANALYTICS: JOB PROFITABILITY ─────────────────────────────────────────────
app.get('/api/analytics/profitability', async (req, res) => {
  try {
    const [jobs, phases] = await Promise.all([readTab('Jobs'), readTab('Job Phases')]);

    const results = jobs
      .filter(j => g(j, 'Job ID'))
      .map(j => {
        const jobId       = g(j, 'Job ID');
        const clientName  = `${g(j,'First Name','')} ${g(j,'Last Name','')}`.trim();
        const projectType = g(j, 'Service Type', 'Project Type');
        const jobStatus   = g(j, 'Job Status', 'Status');
        const contractVal = parseFloat((g(j,'Total Job Value','Contract Amount','Job Value') || '0').replace(/[^0-9.]/g,'')) || 0;

        // Sum estimated cost from phases
        const jobPhases   = phases.filter(p => g(p, 'Job ID') === jobId);
        const estCost     = jobPhases.reduce((sum, p) => {
          return sum + (parseFloat((g(p,'Estimated Cost','Est Cost') || '0').replace(/[^0-9.]/g,'')) || 0);
        }, 0);
        const actualCost  = jobPhases.reduce((sum, p) => {
          return sum + (parseFloat((g(p,'Actual Cost','Actual') || '0').replace(/[^0-9.]/g,'')) || 0);
        }, 0);

        const margin      = contractVal > 0 ? Math.round(((contractVal - (actualCost || estCost)) / contractVal) * 100) : null;
        const overBudget  = actualCost > 0 && estCost > 0 && actualCost > estCost;
        const phasesDone  = jobPhases.filter(p => /complete/i.test(g(p,'Status',''))).length;

        return {
          jobId, clientName, projectType, jobStatus,
          contractVal, estCost, actualCost,
          margin, overBudget,
          totalPhases: jobPhases.length,
          phasesDone,
        };
      })
      .filter(j => j.contractVal > 0 || j.totalPhases > 0)
      .sort((a, b) => b.contractVal - a.contractVal);

    // Summary stats
    const total       = results.reduce((s, j) => s + j.contractVal, 0);
    const totalEst    = results.reduce((s, j) => s + j.estCost, 0);
    const totalActual = results.reduce((s, j) => s + j.actualCost, 0);
    const avgMargin   = results.filter(j => j.margin !== null).length > 0
      ? Math.round(results.filter(j => j.margin !== null).reduce((s, j) => s + j.margin, 0) / results.filter(j => j.margin !== null).length)
      : null;

    res.json({ jobs: results, summary: { total, totalEst, totalActual, avgMargin, jobCount: results.length } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ANALYTICS: LEAD SOURCES ───────────────────────────────────────────────────
app.get('/api/analytics/lead-sources', async (req, res) => {
  try {
    const [leads, jobs] = await Promise.all([readTab('Leads'), readTab('Jobs')]);

    const sourceMap = {};

    leads.forEach(l => {
      const source = g(l, 'How did you hear about us?', 'Lead Source', 'Source', 'Referral Source') || 'Unknown';
      const status = (g(l, 'Lead Status', 'Status') || '').toLowerCase();
      const converted = /convert/.test(status);

      if (!sourceMap[source]) {
        sourceMap[source] = { source, leads: 0, converted: 0, totalValue: 0, jobs: [] };
      }
      sourceMap[source].leads++;
      if (converted) sourceMap[source].converted++;
    });

    // Match converted leads to jobs for revenue
    jobs.forEach(j => {
      const source = g(j, 'Lead Source', 'How did you hear about us?', 'Source') || 'Unknown';
      const value  = parseFloat((g(j,'Total Job Value','Contract Amount','Job Value') || '0').replace(/[^0-9.]/g,'')) || 0;
      if (value > 0) {
        if (!sourceMap[source]) sourceMap[source] = { source, leads: 0, converted: 0, totalValue: 0, jobs: [] };
        sourceMap[source].totalValue += value;
      }
    });

    const results = Object.values(sourceMap)
      .map(s => ({
        ...s,
        conversionRate: s.leads > 0 ? Math.round((s.converted / s.leads) * 100) : 0,
        avgJobValue:    s.converted > 0 ? Math.round(s.totalValue / s.converted) : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    res.json(results);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ANALYTICS: TEAM PERFORMANCE ──────────────────────────────────────────────
app.get('/api/analytics/team', async (req, res) => {
  try {
    const [team, jobs, phases] = await Promise.all([
      readTab('Team'), readTab('Jobs'), readTab('Job Phases'),
    ]);

    const teamStats = team.map(t => {
      const name   = g(t, 'Name', 'Team Member');
      const role   = g(t, 'Role', 'Position');
      const active = g(t, 'Active', 'Is Active');

      // Jobs this person is assigned to (as salesperson or crew)
      const assignedJobs = jobs.filter(j =>
        g(j,'Salesperson','Sales Rep','Assigned Rep') === name
      );
      const closedJobs = assignedJobs.filter(j =>
        /contract|signed|active|progress|complete/i.test(g(j,'Job Status','Status','Contract Status'))
      );
      const totalRevenue = closedJobs.reduce((s, j) =>
        s + (parseFloat((g(j,'Total Job Value','Contract Amount','Job Value') || '0').replace(/[^0-9.]/g,'')) || 0), 0
      );

      // Phases assigned to this person
      const assignedPhases = phases.filter(p =>
        (g(p,'Assigned Name','Assigned To') || '').toLowerCase().includes((name || '').toLowerCase())
      );
      const donePhases = assignedPhases.filter(p => /complete/i.test(g(p,'Status','')));
      const ratings    = assignedPhases
        .map(p => parseFloat(g(p,'Phase Rating','Rating') || ''))
        .filter(n => !isNaN(n));
      const avgRating  = ratings.length > 0
        ? Math.round((ratings.reduce((s, n) => s + n, 0) / ratings.length) * 10) / 10
        : null;

      return {
        name, role, active,
        totalLeadsAssigned:   assignedJobs.length,
        jobsClosed:           closedJobs.length,
        totalRevenue,
        phasesAssigned:       assignedPhases.length,
        phasesDone:           donePhases.length,
        avgRating,
      };
    });

    res.json(teamStats);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ANALYTICS: WEATHER CHECK (manual trigger) ────────────────────────────────
app.post('/api/weather/check', async (req, res) => {
  try {
    const { runWeatherAlerts } = require('./src/triggers/scheduler');
    res.json({ ok: true, message: 'Weather check started' });
    runWeatherAlerts().catch(console.error);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── DAILY BRIEFING (manual trigger) ─────────────────────────────────────────
app.post('/api/briefing/send', async (req, res) => {
  try {
    const { runDailyBriefing } = require('./src/triggers/scheduler');
    res.json({ ok: true, message: 'Briefing sending…' });
    runDailyBriefing().catch(console.error);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── KICKOFF SCHEDULER ────────────────────────────────────────────────────────

// Send kickoff date options to client
app.post('/api/jobs/:row/kickoff-schedule', async (req, res) => {
  try {
    const row = parseInt(req.params.row);
    if (isNaN(row) || row < 2) return res.status(400).json({ error: 'Invalid row' });

    const { readRow } = require('./src/tools/sheets');
    const job = await readRow('Jobs', row);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const clientEmail = g(job, 'Email') || '';
    const clientFirst = g(job, 'First Name') || 'there';
    const projectType = g(job, 'Service Type', 'Project Type') || 'Project';
    const jobId       = g(job, 'Job ID') || `ROW${row}`;

    if (!clientEmail) return res.status(400).json({ error: 'No client email on job' });

    const settings   = await readSettings();
    const baseUrl    = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : (process.env.APP_URL || 'https://your-app.railway.app');

    // Generate 3 date options: ~1 week, ~2 weeks, ~3 weeks out
    // Skip weekends
    function nextWeekday(baseDate, minDays) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + minDays);
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
      return d;
    }
    const now = new Date();
    const dates = [
      nextWeekday(now, 7),
      nextWeekday(now, 14),
      nextWeekday(now, 21),
    ];
    const fmtDate = d => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const isoDate = d => d.toISOString().split('T')[0];

    const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#0A2240;padding:24px 28px;border-radius:12px 12px 0 0">
    <div style="color:#BF9438;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Project Kickoff</div>
    <div style="color:#ffffff;font-size:20px;font-weight:800">Let's Pick Your Start Date 🗓️</div>
  </div>
  <div style="background:#ffffff;padding:28px;border:1px solid #E5E7EB;border-top:none">
    <p style="font-size:15px;color:#374151;margin:0 0 20px">Hey ${clientFirst}! We're fired up to get started on your ${projectType}. Pick the start date that works best for you:</p>

    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px">
      ${dates.map(d => `
      <a href="${baseUrl}/api/kickoff/select/${jobId}/${isoDate(d)}" style="display:block;background:#F9FAFB;border:2px solid #E5E7EB;border-radius:12px;padding:18px 20px;text-decoration:none;color:#0A2240;font-size:16px;font-weight:700">
        📅 ${fmtDate(d)}
      </a>`).join('')}
    </div>

    <p style="font-size:13px;color:#6B7280;margin:0">None of these work? Just reply to this email with what does — we'll make it happen.</p>
  </div>
  <div style="padding:16px;text-align:center;font-size:12px;color:#9CA3AF">Powered by ${settings.companyName || 'Your Contractor'}</div>
</div>`.trim();

    const { sendEmail } = require('./src/tools/gmail');
    const threadId = g(job, 'Client Email Thread', 'Email Thread ID') || null;
    await sendEmail({
      to:      clientEmail,
      subject: `Let's pick your ${projectType} start date 🗓️`,
      body:    `Hey ${clientFirst}! Ready to get started on your ${projectType}. Pick a start date that works for you.`,
      html,
      threadId,
    });

    await updateCell('Jobs', row, ['Kickoff Schedule Sent', 'Kickoff Sent'], 'Yes');
    await updateCell('Jobs', row, ['Last Contact', 'Last Client Contact'], new Date().toLocaleDateString('en-US'));

    const { notifyOwner } = require('./src/tools/notify');
    await notifyOwner({
      subject: `Kickoff scheduling email sent — ${clientFirst}`,
      message: `Sent ${clientFirst} three kickoff date options for their ${projectType}. Dates offered: ${dates.map(fmtDate).join(', ')}.`,
    });

    res.json({ ok: true, datesOffered: dates.map(fmtDate) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Client selects a kickoff date from email link
app.get('/api/kickoff/select/:jobId/:date', async (req, res) => {
  try {
    const { jobId, date } = req.params;
    const [jobs, settings] = await Promise.all([readTab('Jobs'), readSettings()]);
    const companyName = settings.companyName || 'Your Contractor';
    const job  = jobs.find(j => g(j, 'Job ID') === jobId);
    if (!job) return res.status(404).send(kickoffResponsePage('not-found', null, date, companyName));

    const jobRow      = jobs.indexOf(job) + 2;
    const clientFirst = g(job, 'First Name') || 'there';
    const projectType = g(job, 'Service Type', 'Project Type') || 'Project';

    // Parse and format the date
    const d       = new Date(date + 'T12:00:00');
    const fmtDate = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    // Save to job record
    await updateCell('Jobs', jobRow, ['Site Visit Date', 'Kickoff Date', 'Start Date'], fmtDate);
    await updateCell('Jobs', jobRow, ['Job Status', 'Status'], 'Kickoff Scheduled');

    // Auto-create Google Calendar event for the kickoff
    try {
      if (calendarTool) {
        const calResult = await calendarTool.createKickoffEvent(job, date);
        if (calResult?.eventLink) {
          await updateCell('Jobs', jobRow, ['Kickoff Calendar Link', 'Calendar Event Link'], calResult.eventLink);
        }
      }
    } catch (calErr) {
      console.warn('Calendar event creation failed (non-fatal):', calErr.message);
    }

    // Notify owner urgently
    const { notifyOwner } = require('./src/tools/notify');
    await notifyOwner({
      subject: `🗓️ Kickoff Date Confirmed — ${clientFirst}!`,
      message: `${clientFirst} selected ${fmtDate} as their ${projectType} kickoff date.\n\nJob record has been updated. Make sure your crew is ready!`,
      urgent: true,
      eventType: 'kickoffConfirmed',
    });

    // Send confirmation to client
    const html = `
<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
  <div style="background:#0A2240;padding:24px 28px;border-radius:12px 12px 0 0">
    <div style="color:#BF9438;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">You're Confirmed!</div>
    <div style="color:#ffffff;font-size:20px;font-weight:800">🗓️ Kickoff: ${fmtDate}</div>
  </div>
  <div style="background:#ffffff;padding:28px;border:1px solid #E5E7EB;border-top:none;text-align:center">
    <div style="font-size:48px;margin-bottom:12px">🎉</div>
    <div style="font-size:18px;font-weight:800;color:#111827;margin-bottom:8px">You're all set, ${clientFirst}!</div>
    <div style="font-size:15px;color:#6B7280;line-height:1.6;margin-bottom:20px">We'll see you on <strong>${fmtDate}</strong> to kick off your ${projectType}. We'll follow up a day or two before to confirm everything.</div>
    <div style="background:#F0FDF4;border-radius:10px;padding:14px;font-size:13px;color:#15803D;font-weight:600">✅ Your project start date is confirmed</div>
  </div>
  <div style="padding:16px;text-align:center;font-size:12px;color:#9CA3AF">Powered by ${companyName}</div>
</div>`.trim();

    const { sendEmail } = require('./src/tools/gmail');
    const clientEmail = g(job, 'Email') || '';
    const threadId    = g(job, 'Client Email Thread', 'Email Thread ID') || null;
    if (clientEmail) {
      await sendEmail({ to: clientEmail, subject: `Confirmed: Your kickoff is ${fmtDate} 🗓️`, body: `You're confirmed! We'll see you on ${fmtDate} for your ${projectType} kickoff.`, html, threadId });
    }

    res.send(kickoffResponsePage('confirmed', job, fmtDate, companyName));
  } catch (e) {
    res.status(500).send(kickoffResponsePage('error', null, ''));
  }
});

function kickoffResponsePage(type, job, dateStr, companyName = 'Your Contractor') {
  const msgs = {
    'confirmed':  { icon: '🎉', title: 'Kickoff Confirmed!', sub: `Your start date is locked in — ${dateStr}. We'll be in touch a day before to confirm everything is ready.`, color: '#22C55E' },
    'not-found':  { icon: '🔍', title: 'Link Expired', sub: 'This link is no longer valid. Please contact us to schedule your start date.', color: '#6B7280' },
    'error':      { icon: '⚠️', title: 'Something Went Wrong', sub: 'Please contact us directly and we\'ll get your start date confirmed right away.', color: '#F59E0B' },
  };
  const m = msgs[type] || msgs['error'];
  const projectType = job ? g(job, 'Service Type', 'Project Type') : '';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${m.title}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F4F5F7;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
  .card{background:#fff;border-radius:16px;padding:40px 32px;max-width:420px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .header{background:#0A2240;margin:-40px -32px 28px;padding:24px 32px;border-radius:16px 16px 0 0}
  .header-label{color:#BF9438;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px}
  .header-title{color:#fff;font-size:15px;font-weight:700}.icon{font-size:52px;margin-bottom:14px}
  .title{font-size:22px;font-weight:800;color:#111827;margin-bottom:10px}.sub{font-size:15px;color:#6B7280;line-height:1.6}
  .powered{font-size:12px;color:#9CA3AF;margin-top:24px}</style></head>
  <body><div class="card">
    <div class="header"><div class="header-label">${companyName}</div><div class="header-title">${projectType || 'Your Project'}</div></div>
    <div class="icon">${m.icon}</div>
    <div class="title">${m.title}</div>
    <div class="sub">${m.sub}</div>
    <div class="powered">Powered by ${companyName}</div>
  </div></body></html>`;
}

// ─── CALENDAR SYNC API ────────────────────────────────────────────────────────
let calendarTool;
try { calendarTool = require('./src/tools/calendar'); } catch (_) {}

// List upcoming calendar events (next 60 days)
app.get('/api/calendar/events', async (req, res) => {
  try {
    if (!calendarTool) return res.json([]);
    const days   = parseInt(req.query.days || '60');
    const events = await calendarTool.listUpcomingEvents(days);
    const mapped = events.map(e => ({
      id:       e.id,
      title:    e.summary || '',
      start:    e.start?.dateTime || e.start?.date || '',
      end:      e.end?.dateTime   || e.end?.date   || '',
      location: e.location || '',
      link:     e.htmlLink || '',
      color:    e.colorId  || '7',
    }));
    res.json(mapped);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Sync all active jobs + phases to Google Calendar
app.post('/api/calendar/sync', async (req, res) => {
  try {
    if (!calendarTool) return res.status(503).json({ error: 'Calendar not configured' });
    res.json({ ok: true, message: 'Calendar sync started' });
    calendarTool.syncAllJobs()
      .then(r => logger.success('API', `Calendar sync done: ${r.created} events created`))
      .catch(e => logger.error('API', `Calendar sync failed: ${e.message}`));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create a single calendar event manually
app.post('/api/calendar/event', async (req, res) => {
  try {
    if (!calendarTool) return res.status(503).json({ error: 'Calendar not configured' });
    const { title, description, startDate, endDate, location, type } = req.body;
    if (!title || !startDate) return res.status(400).json({ error: 'title and startDate required' });
    const result = await calendarTool.createEvent({ title, description, location, startDate, endDate, colorId: calendarTool.COLORS[type] || '7' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Sync a single job's phases to calendar
app.post('/api/jobs/:row/sync-calendar', async (req, res) => {
  try {
    if (!calendarTool) return res.status(503).json({ error: 'Calendar not configured' });
    const row = parseInt(req.params.row);
    if (isNaN(row) || row < 2) return res.status(400).json({ error: 'Invalid row' });

    const { readRow } = require('./src/tools/sheets');
    const job = await readRow('Jobs', row);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const phases  = await readTab('Job Phases');
    const jobId   = g(job,'Job ID') || '';
    const jobPhases = phases.filter(p => g(p,'Job ID') === jobId);

    let created = 0;
    const links = [];

    // Kickoff event
    const kickoffDate = g(job,'Site Visit Date','Kickoff Date','Start Date');
    if (kickoffDate) {
      const r = await calendarTool.createKickoffEvent(job, kickoffDate);
      if (r) { created++; if (r.eventLink) links.push(r.eventLink); }
    }

    // Phase events
    for (const phase of jobPhases) {
      const r = await calendarTool.createPhaseEvent(phase, job);
      if (r) { created++; links.push(r.eventLink); }
    }

    res.json({ ok: true, created, links });
  } catch (e) { res.status(500).json({ error: e.message }); }
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

// ─── PWA ICON GENERATOR ───────────────────────────────────────────────────────
// Generates a PNG icon on the fly from SVG using sharp (if available) or
// falls back to serving the SVG with a PNG content-type hint.
app.get('/api/icon/:size', async (req, res) => {
  const size = parseInt(req.params.size) || 192;
  // Try sharp first (zero-config on Railway's Node image)
  try {
    const sharp = require('sharp');
    const fs    = require('fs');
    const svgPath = path.join(__dirname, 'public', 'icon.svg');
    const png = await sharp(fs.readFileSync(svgPath)).resize(size, size).png().toBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(png);
  } catch (_) {}
  // Fallback: redirect to SVG
  res.redirect('/icon.svg');
});

// Health check — always responds even if sheets API is down
app.get('/ping', (req, res) => res.send('pong'));

const PORT = process.env.PORT || 3000;
console.log(`Starting on PORT=${PORT}, SHEET_ID=${process.env.SHEET_ID ? 'set' : 'MISSING'}, GOOGLE_CLIENT_ID=${process.env.GOOGLE_CLIENT_ID ? 'set' : 'MISSING'}, ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING'}`);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ CRM running on port ${PORT}`);
  // Start cron scheduler after server is up
  if (startScheduler) {
    try { startScheduler(); }
    catch (e) { console.warn('Scheduler failed to start:', e.message); }
  }
});
