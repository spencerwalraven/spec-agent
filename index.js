require('dotenv').config();
const express = require('express');
const path    = require('path');
const { google } = require('googleapis');

// Default company ID — multi-tenant foundation (1 = default single-tenant install)
const COMPANY_ID = 1;

// ─── DB SERVICES ─────────────────────────────────────────────────────────────
const dbSettings = require('./src/services/settings');
const dbLeads    = require('./src/services/leads');
const dbClients  = require('./src/services/clients');
const dbJobs     = require('./src/services/jobs');
const dbTasks    = require('./src/services/tasks');
const dbTeam     = require('./src/services/team');
const dbInvoices = require('./src/services/invoices');
const dbMarketing = require('./src/services/marketing');

// Catch unhandled errors so they appear in Railway logs
process.on('uncaughtException',  e => console.error('UNCAUGHT EXCEPTION:', e));
process.on('unhandledRejection', e => console.error('UNHANDLED REJECTION:', e));

// ─── DATABASE AUTO-MIGRATION + AUTO-SEED ─────────────────────────────────────
if (process.env.DATABASE_URL) {
  const { pool } = require('./src/db');
  (async () => {
    try {
      // Check if schema exists
      await pool.query(`SELECT 1 FROM companies LIMIT 1`);
      console.log('* Database schema already up to date');
    } catch {
      console.log('🚀 Running database migration...');
      try {
        const { execSync } = require('child_process');
        execSync('node src/migrate.js', { stdio: 'inherit', cwd: __dirname });
      } catch (e) {
        console.error('❌ Migration error:', e.message);
      }
    }

    // Auto-seed if database is empty (first deploy)
    try {
      const result = await pool.query(`SELECT COUNT(*) FROM leads WHERE company_id = 1`);
      const count = parseInt(result.rows[0].count);
      if (count === 0 && process.env.AUTO_SEED !== 'false') {
        console.log('🌱 Database is empty — running seed...');
        const { execSync } = require('child_process');
        execSync('node src/seed.js', { stdio: 'inherit', cwd: __dirname });
        console.log('* Demo data loaded');
      }
    } catch (e) {
      console.warn('!  Auto-seed skipped:', e.message);
    }
  })();
} else {
  console.warn('!  DATABASE_URL not set — running without PostgreSQL (Sheets fallback active)');
}

// ─── AI AGENT SYSTEM ─────────────────────────────────────────────────────────
let webhookRouter, startScheduler, addSseClient, logger;
try {
  webhookRouter  = require('./src/triggers/webhooks');
  ({ startScheduler } = require('./src/triggers/scheduler'));
  ({ logger, addClient: addSseClient } = require('./src/utils/logger'));
  console.log('* AI Agent system loaded');
} catch (e) {
  console.warn('!  AI Agent system failed to load:', e.message);
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
    const session    = event.data.object;
    const jobRef     = session.metadata?.jobId;   // e.g. "JOB-003"
    const amountPaid = (session.amount_total || 0) / 100;
    const desc       = (session.metadata?.description || '').toLowerCase();
    const isFinal    = desc.includes('final') || desc.includes('balance');

    if (jobRef) {
      try {
        const job = await dbJobs.getJobByRef(jobRef);
        if (job) {
          // Mark the matching invoice paid in Postgres
          const invoices = await dbInvoices.getInvoicesForJob(job.id);
          const inv = invoices.find(i => isFinal
            ? i.invoiceType === 'final'
            : i.invoiceType === 'deposit'
          );
          if (inv) await dbInvoices.markInvoicePaid(inv.id);

          // Update job deposit_paid flag
          if (!isFinal) await dbJobs.updateJobField(job.id, 'notes',
            (job.notes ? job.notes + '\n' : '') + `Deposit paid via Stripe on ${new Date().toLocaleDateString('en-US')}`
          );

          const clientName = job.clientName || 'Client';
          const { notifyOwner } = require('./src/tools/notify');
          await notifyOwner({
            subject: `💰 Payment Received — ${clientName}`,
            message: `${clientName} just paid $${amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${isFinal ? '(final invoice)' : '(deposit)'} via Stripe.\n\nJob: ${job.title || job.service || 'Project'}\nJob Ref: ${jobRef}\n\nDatabase has been updated automatically.`,
            urgent: true,
            eventType: 'paymentReceived',
          });

          logger.success('Stripe', `Payment recorded: ${clientName} paid $${amountPaid} (${isFinal ? 'final' : 'deposit'})`);

          // Sync to QuickBooks if connected
          try {
            const qbMod = require('./src/tools/quickbooks');
            const qbInvoiceId = inv?.qbInvoiceId;
            if (qbInvoiceId) {
              qbMod.markInvoicePaid(qbInvoiceId, null, amountPaid, new Date().toLocaleDateString('en-US'))
                .then(() => logger.success('QB', `Stripe payment synced to QB for ${clientName}`))
                .catch(e  => logger.warn('QB', `Could not sync to QB: ${e.message}`));
            }
          } catch (_) {}
        }
      } catch (e) {
        logger.error('Stripe', `Failed to process payment webhook: ${e.message}`);
      }
    }
  }

  res.json({ received: true });
});

// ─── QUICKBOOKS WEBHOOK (raw body MUST come before express.json) ──────────────
app.post('/api/quickbooks/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  // Respond 200 immediately — QB retries if it doesn't get a fast response
  res.status(200).send('OK');

  try {
    let qb;
    try { qb = require('./src/tools/quickbooks'); } catch (_) { return; }

    const sig  = req.headers['intuit-signature'];
    const body = req.body;
    if (!qb.verifyWebhookSignature(body, sig)) {
      logger.warn('QB', 'Webhook signature verification failed');
      return;
    }

    const payload = JSON.parse(body.toString());
    const notifications = payload.eventNotifications || [];

    for (const notification of notifications) {
      const entities = notification.dataChangeEvent?.entities || [];
      for (const entity of entities) {
        if (entity.name === 'Payment' && (entity.operation === 'Create' || entity.operation === 'Update')) {
          handleQBPayment(notification.realmId, entity.id).catch(e =>
            logger.error('QB', `Payment handler failed: ${e.message}`)
          );
        }
        // Also process invoice updates (status changes, amount changes in QB)
        if (entity.name === 'Invoice' && entity.operation === 'Update') {
          try {
            const qb = require('./src/tools/quickbooks');
            await qb.processWebhookEvent({ eventNotifications: [notification] });
          } catch (e) { logger.warn('QB', `Invoice sync failed: ${e.message}`); }
        }
      }
    }
  } catch (err) {
    logger.error('QB', `Webhook processing failed: ${err.message}`);
  }
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

function signUserToken(name, role) {
  return crypto.createHmac('sha256', SESS_SECRET).update(`${name}|${role}`).digest('hex');
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    if (k) out[k.trim()] = decodeURIComponent(v.join('=').trim());
  });
  return out;
}

/** Returns { name, role } or null. */
function getAuthSession(req) {
  const cookie = parseCookies(req)[COOKIE_NAME] || '';
  if (!cookie) return null;

  // Cookie format: base64url(name).role.hmac
  const parts = cookie.split('.');
  if (parts.length === 3) {
    const [b64, role, hmac] = parts;
    let name;
    try { name = Buffer.from(b64, 'base64url').toString(); } catch { return null; }
    // Verify HMAC — signed with server secret, no password needed
    if (hmac === signUserToken(name, role)) return { name, role };
    return null;
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
  return getAuthSession(req) !== null;
}

function setSessionCookie(res, user) {
  const b64  = Buffer.from(user.name).toString('base64url');
  const hmac = signUserToken(user.name, user.role);
  const val  = `${b64}.${user.role}.${hmac}`;
  const isProduction = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie',
    `${COOKIE_NAME}=${val}; HttpOnly; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax${isProduction ? '; Secure' : ''}`
  );
}

// Paths that never require a login
const PUBLIC_PREFIXES = [
  '/login', '/ping',
  '/status.html', '/sub.html',
  '/status/', '/api/status/', '/sub/', '/api/sub/',
  '/api/proposal/approve', '/api/proposal/decline',
  '/api/change-order/approve', '/api/change-order/decline',
  '/api/kickoff/select',
  '/api/stripe/webhook',
  '/api/quickbooks/webhook',
  '/api/quickbooks/callback',
  '/webhook/sms',
  '/webhook/new-lead',
  '/webhook/calendly',
  '/webhook/gmail',
  '/webhook/trigger',
  '/pay',
  '/paid',
  '/api/pay/',
  '/api/sgc/field-report',
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

function requireAuth(req, res, next) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = getAuthSession(req);
  next();
}

function requireOwner(req, res, next) {
  if (!req.user || req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Owner access required' });
  }
  next();
}

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
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();

  // If no env var users, skip straight to DB check below

  // Check env var users — match by username (case-insensitive) or name, plus password
  let matchedUser = users.find(u =>
    (u.name.toLowerCase() === (username || '').toLowerCase() || !username) && u.password === password
  );

  // Also check team table for DB-managed logins (bcrypt)
  if (!matchedUser && process.env.DATABASE_URL && username) {
    try {
      const bcrypt = require('bcryptjs');
      const { getOne } = require('./src/db');
      const member = await getOne(
        `SELECT * FROM team WHERE company_id = 1 AND login_username = $1 AND status = 'active'`,
        [username.toLowerCase()]
      );
      if (member && member.login_password_hash) {
        const valid = await bcrypt.compare(password, member.login_password_hash);
        if (valid) {
          matchedUser = { name: member.name, password, role: member.login_role || 'field' };
        }
      }
    } catch (_) {}
  }

  if (matchedUser) {
    setSessionCookie(res, matchedUser);
    return res.redirect('/');
  }
  res.redirect('/login?error=1');
});

// Logout
app.get('/logout', (req, res) => {
  const isP = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${isP ? '; Secure' : ''}`);
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

// ─── API: JOB SITE ESTIMATE ─────────────────────────────────────────────────
// POST /api/estimate  — called by the Job Site Estimate form in the dashboard.
// Writes a new job to the Jobs tab, then fires the Pricing Agent.
app.post('/api/estimate', requireAuth, async (req, res) => {
  try {
    const { appendRow, getLastRow } = require('./src/tools/sheets-compat');
    const { route } = require('./src/agents/orchestrator');

    const {
      clientName = '', clientPhone = '', jobAddress = '',
      projectType = '', startDate = '', duration = '', notes = '', rooms = []
    } = req.body;

    if (!clientName) return res.status(400).json({ error: 'clientName is required' });

    // Build a human-readable scope description from the structured rooms array
    const scopeLines = rooms.map(r => {
      const items = r.scope.map(s =>
        s.measurement ? `${s.item} (${s.measurement} ${s.unit})` : s.item
      ).join(', ');
      return `${r.room} [${r.grade || 'standard'} grade]: ${items}`;
    }).join('\n');

    const description = [
      scopeLines,
      notes ? `\nNotes: ${notes}` : '',
      startDate ? `Start: ${startDate}` : '',
      duration ? `Duration: ${duration}` : '',
    ].filter(Boolean).join('\n').trim();

    // Parse name (support "First Last" or just one word)
    const nameParts = clientName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName  = nameParts.slice(1).join(' ') || '';

    // Create job using DB-native field names
    const dbJobs = require('./src/services/jobs');
    const dbClients = require('./src/services/clients');

    // Find or create client
    let client = null;
    if (firstName || lastName) {
      const fullName = `${firstName} ${lastName}`.trim();
      client = await dbClients.getClientByName(fullName);
      if (!client) {
        client = await dbClients.createClient({ name: fullName, phone: clientPhone, address: jobAddress });
      }
    }

    const job = await dbJobs.createJob({
      clientId:    client?.id || null,
      title:       projectType || 'Home Improvement',
      service:     projectType || 'Home Improvement',
      description: description,
      address:     jobAddress,
      status:      'pending',
    });

    const created = await dbJobs.getJob(job.id);
    const jobId   = created?.jobId || `JOB-${job.id}`;
    const newRow  = job.id;

    console.log(`[Estimate API] Created ${jobId} (id ${newRow}) — firing Pricing Agent`);

    // Fire the Pricing Agent asynchronously (don't await — respond immediately)
    route('estimate_ready', { rowNumber: newRow }).catch(err =>
      console.error('[Estimate API] Agent error:', err.message)
    );

    res.json({ ok: true, jobId, rowNumber: newRow, message: 'Estimate agent is running' });
  } catch (e) {
    console.error('[Estimate API] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

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
    const [leads, jobs] = await Promise.all([dbLeads.getLeads(), dbJobs.getJobs()]);
    const conversations = [];

    leads.forEach(l => {
      if (!l.emailThreadId) return;
      conversations.push({
        _row: l.id, source:'lead', name: l.name || '',
        email: l.email, threadId: l.emailThreadId,
        lastContact: l.lastContact, status: l.status,
        project: l.serviceRequested,
      });
    });

    jobs.forEach(j => {
      if (!j.emailThreadId) return;
      conversations.push({
        _row: j.id, source:'job', name: j.clientName || '',
        email: j.clientEmail, threadId: j.emailThreadId,
        jobId: j.jobRef, lastContact: j.updatedAt,
        status: j.status, project: j.service,
      });
    });

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
      dbLeads.getLeads(), dbJobs.getJobs(), dbClients.getClients(), dbSettings.readSettings(),
    ]);

    const now = new Date();
    const newLeadsThisMonth = leads.filter(l => {
      const d = new Date(l.createdAt);
      return !isNaN(d) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const activeJobs = jobs.filter(j => /progress|active/i.test(j.status)).length;

    let pipelineValue = 0;
    jobs.forEach(j => {
      const v = parseFloat(j.estimatedValue) || 0;
      if (v > 0 && !/complete/i.test(j.status)) pipelineValue += v;
    });

    const converted = leads.filter(l => /convert/i.test(l.status || l.leadStatus)).length;
    const conversionRate = leads.length > 0 ? Math.round((converted / leads.length) * 100) + '%' : '—';

    const activity = [];
    [...leads].reverse().slice(0, 5).forEach(l => {
      if (l.name) activity.push({
        text: `${l.name} — ${l.serviceRequested || 'new lead'}`,
        time: l.createdAt ? relativeTime(l.createdAt) : 'recently',
        color: scoreColor(l.score),
        type: 'lead',
      });
    });
    jobs.filter(j => /progress/i.test(j.status)).slice(0, 3).forEach(j => {
      if (j.clientName) activity.push({
        text: `${j.clientName} — ${j.service || 'job'} in progress`,
        time: j.startDate ? relativeTime(j.startDate) : '',
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
// ─── API: LEADS (PostgreSQL) ─────────────────────────────────────────────────
app.get('/api/leads', async (req, res) => {
  try { res.json(await dbLeads.getLeads()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/leads — create a new lead manually
app.post('/api/leads', requireAuth, async (req, res) => {
  try {
    const { name, email, phone, service, message, address, source } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const lead = await dbLeads.createLead({
      name, email: email || '', phone: phone || '',
      service: service || '', message: message || '',
      address: address || '', source: source || 'Manual Entry',
      status: 'new',
    });
    res.json({ ok: true, id: lead.id, ...lead });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/leads/:row/convert', async (req, res) => {
  try {
    await dbLeads.updateLeadStatus(parseInt(req.params.row), 'Converted');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/leads/:row/lost', async (req, res) => {
  try {
    await dbLeads.updateLeadStatus(parseInt(req.params.row), 'Lost');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/leads/:row/note', async (req, res) => {
  try {
    await dbLeads.updateLeadNote(parseInt(req.params.row), req.body.note || '');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: One-click demo setup (runs seed + creates kickoff template) ──────
// POST /api/admin/setup-demo
// Drops all data for company_id=1, reloads fresh Landcare demo data,
// creates a kickoff template Google Doc in Drive, and saves the ID to settings.
// Owner-only. Returns the kickoff template URL on success.
app.post('/api/admin/setup-demo', requireAuth, requireOwner, async (req, res) => {
  const steps = { migrate: null, seed: null, kickoff: null };
  try {
    // 1. Migrate (idempotent — only runs missing ALTER statements)
    try {
      const { execSync } = require('child_process');
      execSync('node src/migrate.js', { stdio: 'pipe', timeout: 60_000 });
      steps.migrate = 'ok';
    } catch (mErr) {
      steps.migrate = 'skipped: ' + (mErr.message || '').slice(0, 200);
    }

    // 2. Seed (drops + reloads company_id=1 data)
    try {
      const { seed } = require('./src/seed');
      await seed();
      steps.seed = 'ok';
    } catch (sErr) {
      steps.seed = 'failed: ' + sErr.message;
      return res.status(500).json({ ok: false, steps, error: 'Seed failed: ' + sErr.message });
    }

    // 3. Kickoff template — only if not already in settings
    try {
      const settings = await dbSettings.readSettings();
      if (settings.kickoffTemplateId) {
        steps.kickoff = 'already-configured: ' + settings.kickoffTemplateId;
      } else {
        const { createKickoffTemplate } = require('./scripts/create-kickoff-template');
        const result = await createKickoffTemplate();
        if (result?.docId) {
          await dbSettings.writeSettings({ ...settings, kickoffTemplateId: result.docId });
          steps.kickoff = 'created: ' + result.docUrl;
        } else {
          steps.kickoff = 'no-id-returned';
        }
      }
    } catch (kErr) {
      steps.kickoff = 'failed: ' + kErr.message;
      // Non-fatal — seed is done, demo will still work
    }

    res.json({ ok: true, steps, message: 'Demo setup complete. Refresh the page to see the data.' });
  } catch (e) {
    res.status(500).json({ ok: false, steps, error: e.message });
  }
});

// Generic lead field update (used by referral source dropdown, etc.)
app.post('/api/leads/:row', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.row);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid lead id' });
    const { field, value } = req.body;
    // Whitelist columns that can be updated this way
    const allowed = new Set([
      'name', 'email', 'phone', 'service', 'status', 'notes', 'score', 'score_label',
      'source', 'assigned_to', 'referral_client_id', 'address', 'last_contact_at',
    ]);
    if (!allowed.has(field)) return res.status(400).json({ error: `Field "${field}" not updatable` });
    const { query: dbQ } = require('./src/db');
    await dbQ(`UPDATE leads SET ${field} = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3`, [value, id, COMPANY_ID]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: UPDATE JOB STATUS ──────────────────────────────────────────────────
app.post('/api/jobs/:row/status', async (req, res) => {
  try {
    const jobId = parseInt(req.params.row);
    const newStatus = (req.body.status || '').toLowerCase();
    await dbJobs.updateJobStatus(jobId, req.body.status || '');

    // Auto-triggers based on status change
    if (newStatus === 'active' || newStatus === 'in progress') {
      // Auto-assign available equipment to this job
      try {
        const equip = await require('./src/services/equipment').getEquipment('available');
        const toAssign = equip.slice(0, 2); // Auto-assign first 2 available items
        for (const item of toAssign) {
          await require('./src/services/equipment').updateEquipmentStatus(item.id, 'in-use', 'Auto', jobId);
        }
        console.log(`Auto-assigned ${toAssign.length} equipment items to job ${jobId}`);
      } catch (eqErr) { console.log('Equipment auto-assign skipped:', eqErr.message); }
    }

    if (newStatus === 'completed' || newStatus === 'complete') {
      // Schedule review request (3 days after completion)
      try {
        const { updateOne } = require('./src/db');
        // Mark review as pending — the scheduler or next login will send it
        await updateOne(
          `UPDATE jobs SET review_requested = false, review_requested_at = NOW() + INTERVAL '3 days' WHERE id = $1 AND company_id = $2 AND (review_requested IS NULL OR review_requested = false)`,
          [jobId, 1]
        );
        console.log(`Review request scheduled for job ${jobId} (3 days)`);
      } catch (revErr) { console.log('Review scheduling skipped:', revErr.message); }
    }

    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/jobs — create a new job manually
app.post('/api/jobs', requireAuth, async (req, res) => {
  try {
    const { clientId, title, service, description, address, status, estimatedValue, startDate, endDate } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const job = await dbJobs.createJob({
      clientId: clientId || null,
      title, service: service || title,
      description: description || '', address: address || '',
      status: status || 'pending',
      estimatedValue: estimatedValue || null,
      startDate: startDate || null, endDate: endDate || null,
    });
    res.json({ ok: true, id: job.id, ...job });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: JOBS (PostgreSQL) ──────────────────────────────────────────────────
app.get('/api/jobs', async (req, res) => {
  try { res.json(await dbJobs.getJobs(req.query.status)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: JOB PHASES (PostgreSQL) ────────────────────────────────────────────
app.get('/api/phases', async (req, res) => {
  try {
    const { jobId } = req.query;
    if (!jobId) return res.json([]);
    res.json(await dbJobs.getPhases(parseInt(jobId)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/phases/:row/actual-cost', async (req, res) => {
  try {
    await dbJobs.updatePhaseActualCost(parseInt(req.params.row), req.body.actualCost);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/phases/:row/status', async (req, res) => {
  try {
    await dbJobs.updatePhaseStatus(parseInt(req.params.row), req.body.status);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/phases/:row/assign', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.row);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid phase ID' });
    const { assignedTo } = req.body;
    const { query: dbQ } = require('./src/db');
    await dbQ('UPDATE job_phases SET assigned_to = $1 WHERE id = $2', [assignedTo || null, id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: CLIENTS (PostgreSQL) ───────────────────────────────────────────────
app.get('/api/clients', async (req, res) => {
  try { res.json(await dbClients.getClients()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: CLIENT JOBS (all jobs for a specific client) ────────────────────────
app.get('/api/clients/:id/jobs', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid client ID' });
    const jobs = await dbJobs.getJobsForClient(id);
    // Also get phases for each job
    for (const job of jobs) {
      job.phases = await dbJobs.getPhases(job.id);
    }
    res.json(jobs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: CLIENT PHOTOS (all photos across all client's jobs) ─────────────────
app.get('/api/clients/:id/photos', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid client ID' });
    res.json(await dbJobs.getPhotosForClient(id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: JOB MATERIALS ───────────────────────────────────────────────────────
app.get('/api/jobs/:id/materials', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid job ID' });
    res.json(await dbJobs.getJobMaterials(id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/jobs/:id/materials', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid job ID' });
    const mat = await dbJobs.addJobMaterial(id, req.body);
    res.json(mat);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/jobs/:id/materials/:matId', requireAuth, async (req, res) => {
  try {
    const matId = parseInt(req.params.matId);
    if (isNaN(matId)) return res.status(400).json({ error: 'Invalid material ID' });
    await dbJobs.updateJobMaterial(matId, req.body);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/jobs/:id/materials/:matId', requireAuth, async (req, res) => {
  try {
    const matId = parseInt(req.params.matId);
    if (isNaN(matId)) return res.status(400).json({ error: 'Invalid material ID' });
    await dbJobs.deleteJobMaterial(matId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: LOG ACTUAL MATERIALS USED ──────────────────────────────────────────
app.post('/api/jobs/:id/materials/log-actuals', async (req, res) => {
  try {
    const { updateOne } = require('./src/db');
    const { actuals, loggedBy } = req.body; // actuals = [{ materialId, actualQty, actualUnitCost, actualTotal }]
    if (!actuals?.length) return res.status(400).json({ error: 'No actuals provided' });

    for (const a of actuals) {
      const estQty = parseFloat(a.estimatedQty) || 0;
      const actQty = parseFloat(a.actualQty) || 0;
      const variance = estQty > 0 ? Math.round(((actQty - estQty) / estQty) * 100) : 0;

      await updateOne(`
        UPDATE job_materials SET
          actual_quantity = $1, actual_unit_cost = $2, actual_total_cost = $3,
          logged_by = $4, logged_at = NOW(), variance_pct = $5
        WHERE id = $6 AND company_id = $7
      `, [a.actualQty, a.actualUnitCost, a.actualTotal, loggedBy || 'field', variance, a.materialId, 1]);
    }

    // Update job actual_value with sum of actual material costs
    const jobId = parseInt(req.params.id);
    const { getAll } = require('./src/db');
    const mats = await getAll('SELECT actual_total_cost FROM job_materials WHERE job_id = $1 AND company_id = $2 AND actual_total_cost IS NOT NULL', [jobId, 1]);
    const totalActual = mats.reduce((s, m) => s + (parseFloat((m.actual_total_cost || '0').replace(/[^0-9.-]/g, '')) || 0), 0);
    if (totalActual > 0) {
      await updateOne('UPDATE jobs SET material_cost = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3', [totalActual, jobId, 1]);
    }

    res.json({ ok: true, materialsLogged: actuals.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: MANUAL TIME ENTRY (for missed clock-ins) ───────────────────────────
app.post('/api/timeclock/manual', requireAuth, async (req, res) => {
  try {
    const { teamMemberName, jobId, jobName, date, hoursWorked, notes } = req.body;
    if (!teamMemberName || !hoursWorked) return res.status(400).json({ error: 'Name and hours required' });
    const clockIn = new Date(date || Date.now());
    const hours = parseFloat(hoursWorked);
    const clockOut = new Date(clockIn.getTime() + hours * 3600000);
    await query(`
      INSERT INTO time_clock (company_id, team_member_name, job_id, job_name, clock_in, clock_out, hours, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [1, teamMemberName, jobId || null, jobName || '', clockIn, clockOut, hours, notes || 'Manual entry']);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: OUTSTANDING INVOICES ────────────────────────────────────────────────
app.get('/api/invoices/outstanding', requireAuth, async (req, res) => {
  try {
    const { query: dbQ } = require('./src/db');
    const result = await dbQ(`
      SELECT i.*, j.job_ref, j.title AS job_title, c.name AS client_name
      FROM invoices i
      LEFT JOIN jobs j ON i.job_id = j.id
      LEFT JOIN clients c ON j.client_id = c.id
      WHERE i.company_id = $1 AND i.status != 'paid'
      ORDER BY i.due_date ASC NULLS LAST
    `, [req.companyId || 1]);
    const invoices = result.rows.map(r => {
      const now = new Date();
      const due = r.due_date ? new Date(r.due_date) : null;
      const daysOverdue = due ? Math.max(0, Math.floor((now - due) / 86400000)) : 0;
      return {
        id: r.id,
        jobId: r.job_id,
        jobRef: r.job_ref || '',
        jobTitle: r.job_title || '',
        clientName: r.client_name || '',
        invoiceType: r.invoice_type || 'invoice',
        amount: parseFloat(r.amount) || 0,
        status: r.status || 'pending',
        dueDate: r.due_date ? new Date(r.due_date).toLocaleDateString() : '',
        sentAt: r.sent_at ? new Date(r.sent_at).toLocaleDateString() : '',
        daysOverdue,
      };
    });
    res.json(invoices);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: APPROVE & SEND DOC TO CLIENT ────────────────────────────────────────
// ─── SYNCHRONOUS DOC GENERATION ─────────────────────────────────────────────
// POST /api/jobs/:row/generate-doc/:type  (type: proposal|estimate|contract|kickoff)
// Runs template generation synchronously. Returns the link immediately so
// the frontend doesn't need to poll for 90 seconds. Falls back to AI agent
// (async) if template isn't configured.
app.post('/api/jobs/:row/generate-doc/:type', requireAuth, async (req, res) => {
  try {
    const row = parseInt(req.params.row);
    const type = req.params.type;
    if (isNaN(row)) return res.status(400).json({ error: 'Invalid job row' });
    if (!['proposal', 'estimate', 'contract', 'kickoff'].includes(type)) {
      return res.status(400).json({ error: 'Invalid doc type' });
    }

    // Try template-based generation first (fast — ~3 seconds)
    let templateReason = '';
    try {
      const { generateFromTemplate } = require('./src/agents/template-doc-generator');
      const tpl = await generateFromTemplate(type, row);
      if (tpl.ok) {
        return res.json({ ok: true, mode: 'template', docUrl: tpl.docUrl, message: `${type} generated from template` });
      }
      templateReason = tpl.reason || 'unknown';
      console.log(`[generate-doc] Template skipped for ${type}: ${templateReason}`);
    } catch (tplErr) {
      templateReason = tplErr.message;
      console.error('[generate-doc] Template error:', tplErr.message, tplErr.stack);
    }

    // Fall back to fire-and-forget AI agent (slower, ~60-90 seconds)
    const { route } = require('./src/agents/orchestrator');
    const eventMap = {
      proposal: 'generate_proposal',
      estimate: 'estimate_ready',
      contract: 'generate_contract',
      kickoff:  'plan_project',
    };
    route(eventMap[type], { rowNumber: row }).catch(err =>
      console.error(`[generate-doc] AI agent ${type} failed:`, err.message)
    );

    res.json({ ok: true, mode: 'ai', templateReason, message: `${type} generating via AI — check back in 1-2 min` });
  } catch (e) {
    console.error('[generate-doc] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/jobs/:row/approve-send', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.row);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { type } = req.body;
    const job = await dbJobs.getJob(id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const client = job.clientId ? await dbClients.getClient(job.clientId) : null;
    const clientEmail = client?.email || job.clientEmail || '';
    if (!clientEmail) return res.status(400).json({ error: 'No client email found' });

    const settings = await dbSettings.readSettings();
    const companyName = settings.companyName || 'Your Company';
    const docLink = job[type + 'Link'] || '';

    let subject, body;
    if (type === 'proposal') {
      subject = 'Your ' + (job.service || job.title) + ' Proposal from ' + companyName;
      body = 'Hi ' + (client?.name || 'there') + ',\n\nWe\'ve put together a detailed proposal for your ' + (job.service || job.title) + ' project at ' + (job.address || 'your property') + '.\n\n' +
        (docLink ? 'View your proposal: ' + docLink + '\n\n' : '') +
        'We\'ve included 4 options at different price points so you can choose what fits best. Take a look and let us know which tier you\'d like to go with!\n\n' +
        (settings.emailSignature || companyName + '\n' + settings.phone);
      await dbJobs.updateJobField(id, 'proposal_status', 'Sent');
    } else if (type === 'contract') {
      subject = 'Your ' + (job.service || job.title) + ' Contract from ' + companyName;
      body = 'Hi ' + (client?.name || 'there') + ',\n\nYour contract for the ' + (job.service || job.title) + ' project is ready for review and signature.\n\n' +
        (docLink ? 'View your contract: ' + docLink + '\n\n' : '') +
        'Please review the terms and let us know if you have any questions.\n\n' +
        (settings.emailSignature || companyName + '\n' + settings.phone);
      await dbJobs.updateJobField(id, 'contract_status', 'Sent');
    } else if (type === 'estimate') {
      subject = 'Your ' + (job.service || job.title) + ' Estimate from ' + companyName;
      body = 'Hi ' + (client?.name || 'there') + ',\n\nHere\'s your detailed estimate for the ' + (job.service || job.title) + ' project.\n\n' +
        (docLink ? 'View your estimate: ' + docLink + '\n\n' : '') +
        'This includes a full breakdown of materials, labor, and timeline.\n\n' +
        (settings.emailSignature || companyName + '\n' + settings.phone);
      await dbJobs.updateJobField(id, 'estimate_status', 'Sent').catch(() => {});
    } else if (type === 'kickoff') {
      subject = 'Your ' + (job.service || job.title) + ' Kickoff Plan from ' + companyName;
      body = 'Hi ' + (client?.name || 'there') + ',\n\nYour kickoff plan is ready! This covers the timeline, your project team, what to expect each week, and what we need from you.\n\n' +
        (docLink ? 'View your kickoff plan: ' + docLink + '\n\n' : '') +
        'Take a look and reply with any questions. We\'re excited to get started.\n\n' +
        (settings.emailSignature || companyName + '\n' + settings.phone);
      await dbJobs.updateJobField(id, 'kickoff_status', 'Sent').catch(() => {});
    }

    const { sendEmail } = require('./src/tools/gmail');
    await sendEmail({ to: clientEmail, subject, body });

    // Log activity so the owner sees the send confirmation in the feed
    const { query: dbQ } = require('./src/db');
    await dbQ(
      `INSERT INTO activity_log (company_id, agent, action, detail, entity_type, entity_id) VALUES ($1,'OwnerAction','doc_approved_sent',$2,'job',$3)`,
      [COMPANY_ID, `${type.charAt(0).toUpperCase()+type.slice(1)} approved and sent to ${clientEmail}`, id]
    ).catch(() => {});

    res.json({ ok: true, message: type + ' sent to ' + clientEmail });
  } catch (e) {
    console.error('Approve & send error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── API: CLIENT 360 TIMELINE (PostgreSQL) ───────────────────────────────────
app.get('/api/clients/:name/timeline', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const events = await dbClients.getClientTimeline(name);
    res.json({ name, events, jobCount: events.filter(e => e.type === 'job').length });
  } catch (e) {
    console.error('Timeline error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── LEGACY TIMELINE (sheets fallback — remove after full migration) ─────────
app.get('/api/clients/:name/timeline_LEGACY_DISABLED', async (req, res) => {
  try {
    const name   = decodeURIComponent(req.params.name);
    const events = [];

    // Helper: read a tab and return raw rows (header + data)
    async function getSheet(tabName) {
      try {
        const rows = await readTab(tabName);
        // readTab returns objects — reconstruct raw rows for header-index lookups
        // Instead, just return the raw sheets response
        const sheets = getSheets();
        const r = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: `${tabName}!A:Z`,
        });
        return r.data.values || [];
      } catch (_) { return []; }
    }

    function nameMatch(a, b) {
      const al = (a || '').toLowerCase().trim();
      const bl = (b || '').toLowerCase().trim();
      return al && bl && (al.includes(bl) || bl.includes(al));
    }

    // 1. Lead data (Form Responses 1)
    const leadRows = await getSheet('Form Responses 1');
    const leadHeader = leadRows[0] || [];
    const lNameIdx   = leadHeader.findIndex(h => /name/i.test(h));
    const lDateIdx   = leadHeader.findIndex(h => /timestamp|date/i.test(h));
    const lSourceIdx = leadHeader.findIndex(h => /source|how/i.test(h));
    for (const row of leadRows.slice(1)) {
      if (!nameMatch(row[lNameIdx], name)) continue;
      events.push({
        type:   'lead',
        icon:   '👤',
        label:  'Lead submitted',
        detail: `Source: ${row[lSourceIdx] || 'Direct'}`,
        date:   row[lDateIdx] || '',
        color:  'gold',
      });
    }

    // 2. Jobs data
    const jobRows    = await getSheet('Jobs');
    const jobHeader  = jobRows[0] || [];
    const jClientIdx = jobHeader.findIndex(h => /client/i.test(h));
    const jTypeIdx   = jobHeader.findIndex(h => /project|service.?type|job.?type/i.test(h));
    const jStatusIdx = jobHeader.findIndex(h => /status/i.test(h));
    const jStartIdx  = jobHeader.findIndex(h => /start/i.test(h));
    const jIdIdx     = jobHeader.findIndex(h => /job.?id/i.test(h));
    const jValueIdx  = jobHeader.findIndex(h => /value|amount|price/i.test(h));
    const matchedJobs = [];
    for (const row of jobRows.slice(1)) {
      if (!nameMatch(row[jClientIdx], name)) continue;
      matchedJobs.push(row[jIdIdx] || '');
      events.push({
        type:   'job',
        icon:   '🔨',
        label:  `Job created: ${row[jTypeIdx] || 'Project'}`,
        detail: `${row[jStatusIdx] || 'Active'}${row[jValueIdx] ? ' · ' + row[jValueIdx] : ''}`,
        date:   row[jStartIdx] || '',
        color:  'green',
        jobId:  row[jIdIdx] || '',
      });
    }

    // 3. Invoices tab (if exists)
    const invoiceRows = await getSheet('Invoices');
    const invHeader   = invoiceRows[0] || [];
    const invClientIdx = invHeader.findIndex(h => /client/i.test(h));
    const invAmtIdx    = invHeader.findIndex(h => /amount|total/i.test(h));
    const invTypeIdx   = invHeader.findIndex(h => /type/i.test(h));
    const invDateIdx   = invHeader.findIndex(h => /date/i.test(h));
    const invStatusIdx = invHeader.findIndex(h => /status|paid/i.test(h));
    for (const row of invoiceRows.slice(1)) {
      if (!nameMatch(row[invClientIdx], name)) continue;
      const isPaid = (row[invStatusIdx] || '').toLowerCase().includes('paid');
      events.push({
        type:   'invoice',
        icon:   '💰',
        label:  `${row[invTypeIdx] || 'Invoice'} sent`,
        detail: `${row[invAmtIdx] || ''}${row[invStatusIdx] ? ' · ' + row[invStatusIdx] : ''}`,
        date:   row[invDateIdx] || '',
        color:  isPaid ? 'green' : 'gold',
      });
    }

    // 4. Job Photos tab (if exists)
    const photoRows = await getSheet('Job Photos');
    for (const row of photoRows.slice(1)) {
      const rowName = row[2] || ''; // clientName column
      if (!nameMatch(rowName, name)) continue;
      events.push({
        type:     'photo',
        icon:     '📸',
        label:    `Photo added: ${row[3] || 'Job photo'}`,
        detail:   row[0] || '',
        date:     row[5] || '',
        color:    'mist',
        photoUrl: row[4] || '',
      });
    }

    // 5. Sort all events by date descending (most recent first)
    events.sort((a, b) => {
      const da = a.date ? new Date(a.date) : new Date(0);
      const db = b.date ? new Date(b.date) : new Date(0);
      return db - da;
    });

    res.json({ name, events, jobCount: matchedJobs.length });
  } catch (e) {
    console.error('Timeline error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── API: TEAM (PostgreSQL) ──────────────────────────────────────────────────
app.get('/api/team', async (req, res) => {
  try { res.json(await dbTeam.getTeam()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/team — add a new team member
app.post('/api/team', async (req, res) => {
  try {
    const { name, role, email, phone, notes, trade, hourly_rate, employee_type } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const { insertOne } = require('./src/db');
    const member = await insertOne(`
      INSERT INTO team (company_id, name, role, email, phone, status, notes, trade, hourly_rate, employee_type)
      VALUES ($1,$2,$3,$4,$5,'active',$6,$7,$8,$9)
    `, [1, name, role || '', email || '', phone || '', notes || '', trade || '', hourly_rate || null, employee_type || 'w2']);
    res.json({ ok: true, id: member.id, ...member });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/team/:id — edit an existing team member
app.put('/api/team/:id', requireOwner, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { name, role, trade, hourly_rate, employee_type, phone, email, notes } = req.body;
    const { query: dbQuery } = require('./src/db');
    const sets = [];
    const vals = [];
    let idx = 1;
    if (name !== undefined)          { sets.push(`name = $${idx++}`);          vals.push(name); }
    if (role !== undefined)          { sets.push(`role = $${idx++}`);          vals.push(role); }
    if (trade !== undefined)         { sets.push(`trade = $${idx++}`);         vals.push(trade); }
    if (hourly_rate !== undefined)   { sets.push(`hourly_rate = $${idx++}`);   vals.push(hourly_rate); }
    if (employee_type !== undefined) { sets.push(`employee_type = $${idx++}`); vals.push(employee_type); }
    if (phone !== undefined)         { sets.push(`phone = $${idx++}`);         vals.push(phone); }
    if (email !== undefined)         { sets.push(`email = $${idx++}`);         vals.push(email); }
    if (notes !== undefined)         { sets.push(`notes = $${idx++}`);         vals.push(notes); }
    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
    sets.push(`updated_at = NOW()`);
    vals.push(id);
    await dbQuery(`UPDATE team SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/team/:id/set-login — set login credentials for a team member
// This stores hashed credentials in the team table so owner can manage logins from UI
app.post('/api/team/:id/set-login', requireOwner, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { username, password, role: loginRole } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 10);
    const { query } = require('./src/db');
    await query(
      `UPDATE team SET login_username = $1, login_password_hash = $2, login_role = $3, updated_at = NOW() WHERE id = $4`,
      [username.toLowerCase(), hash, loginRole || 'field', id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE team member (soft delete: mark as inactive + 'fired' status so jobs/history still reference them)
app.delete('/api/team/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { query: dbQ } = require('./src/db');
    // Soft delete: set status to 'inactive' and name suffix. Keep row to preserve FK integrity on time_clock/phases.
    await dbQ(`UPDATE team SET status = 'inactive', updated_at = NOW() WHERE id = $1 AND company_id = $2`, [id, COMPANY_ID]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/team/:row/toggle', async (req, res) => {
  try {
    await dbTeam.toggleMemberStatus(parseInt(req.params.row));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── TIME CLOCK ────────────────────────────────────────────────────────
// ─── API: TIME CLOCK (PostgreSQL) ────────────────────────────────────────────
app.get('/api/timeclock', requireAuth, async (req, res) => {
  try {
    const [team, punches, open] = await Promise.all([
      dbTeam.getTeam(),
      dbTeam.getTimeclock(req.query.date),
      dbTeam.getCurrentlyClocked(),
    ]);
    const openByName = {};
    open.forEach(p => { openByName[p.name] = p; });

    const members = team.map(m => {
      const myPunches = punches.filter(p => p.name === m.name);
      const openPunch = openByName[m.name];
      const todayMinutes = myPunches.reduce((sum, p) => sum + (parseFloat(p.hours) || 0) * 60, 0)
        + (openPunch ? (Date.now() - new Date(openPunch.clockIn)) / 60000 : 0);
      return {
        ...m,
        clockedIn:    !!openPunch,
        clockInTime:  openPunch?.clockIn || null,
        openPunchId:  openPunch?.id || null,
        todayHours:   (todayMinutes / 60).toFixed(1),
        punchCount:   myPunches.length,
      };
    });
    res.json({ members, punches, date: req.query.date || new Date().toISOString().slice(0,10) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/timeclock/punch', requireAuth, async (req, res) => {
  try {
    const { name, action, jobId, jobName } = req.body;
    if (!name || !action) return res.status(400).json({ error: 'name and action required' });

    let punch, qbSync = null;
    if (action === 'IN') {
      punch = await dbTeam.clockIn(name, jobId || null, jobName || '');
    } else {
      const open = await dbTeam.getLastOpenPunch(name);
      if (!open) return res.status(400).json({ error: 'No open punch found for ' + name });
      punch = await dbTeam.clockOut(open.id);

      // QuickBooks Payroll sync
      if (qb) {
        try {
          const qbStatus = await qb.getConnectionStatus();
          if (qbStatus.connected) {
            qbSync = await qb.createTimeActivity({
              employeeName: name,
              clockIn:  open.clock_in,
              clockOut: punch.clock_out,
              jobId:    jobId || open.job_id || null,
            });
            await dbTeam.markQbSynced(punch.id, qbSync?.id);
            logger.success('QB Payroll', `Time synced for ${name}: ${qbSync?.hours}h`);
          }
        } catch(qbErr) {
          logger.error('QB Payroll', `Sync failed for ${name}: ${qbErr.message}`);
        }
      }
    }
    res.json({ ok: true, name, action, punch, qbSync });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── API: ALERTS ────────────────────────────────────────────────────────────
app.get('/api/alerts', async (req, res) => {
  try {
    const [leads, jobs] = await Promise.all([dbLeads.getLeads(), dbJobs.getJobs()]);
    const alerts = [];

    leads.forEach(l => {
      const score = parseInt(l.score) || 0;
      const status = (l.status || '').toLowerCase();
      if (score >= 80 && status === 'new' && !l.lastContact && l.name) {
        alerts.push({ type:'urgent', priority:'high', icon:'!',
          title:'Hot lead not yet contacted',
          desc:`${l.name} · Score ${score}/100 · ${l.serviceRequested || 'new lead'}`,
          tag:`Lead: ${l.name}` });
      }
      const days = daysBetween(l.lastContact);
      if (days !== null && days >= 3 && !['converted','dead','lost'].includes(status) && l.name) {
        alerts.push({ type:'warning', priority:'medium', icon:'⏰',
          title:`No contact in ${days} days — ${l.name}`,
          desc:`Status: ${l.status || 'Unknown'} · Last contact: ${l.lastContact || 'never'}`,
          tag:`Lead: ${l.name}` });
      }
    });

    jobs.forEach(j => {
      const name = j.clientName || '';
      const contractStatus = (j.contractStatus || '').toLowerCase();
      const jobStatus = (j.status || '').toLowerCase();
      const jobId = j.jobId || j.jobRef || '';

      if (contractStatus.includes('sign')) {
        const daysSigned = daysBetween(j.contractSignedAt);
        if (daysSigned !== null && daysSigned > 3 && !j.depositPaid && name) {
          alerts.push({ type:'urgent', priority:'high', icon:'💰',
            title:`Deposit overdue — ${name}`,
            desc:`Contract signed ${daysSigned} days ago · Deposit still unpaid · ${j.service || ''}`,
            tag:jobId ? `Job: ${jobId}` : `Job: ${name}` });
        }
      }

      if (jobStatus.includes('progress') && name) {
        const daysSinceUpdate = daysBetween(j.updatedAt);
        if (daysSinceUpdate !== null && daysSinceUpdate >= 7) {
          alerts.push({ type:'warning', priority:'medium', icon:'📋',
            title:`No progress update this week — ${name}`,
            desc:`${j.service || 'Job'} is in progress`,
            tag:jobId ? `Job: ${jobId}` : `Job: ${name}` });
        }
      }

      const daysProposal = daysBetween(j.proposalSentAt);
      if (daysProposal !== null && daysProposal >= 5 && !contractStatus.includes('sign') && name && contractStatus && !contractStatus.includes('decline')) {
        alerts.push({ type:'warning', priority:'medium', icon:'',
          title:`Contract not signed — ${name}`,
          desc:`Proposal sent ${daysProposal} days ago · ${j.service || ''}`,
          tag:jobId ? `Job: ${jobId}` : `Job: ${name}` });
      }
    });

    const order = { high:0, medium:1, low:2 };
    alerts.sort((a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2));
    res.json(alerts);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: MARKETING ─────────────────────────────────────────────────────────
app.get('/api/marketing', async (req, res) => {
  try { res.json(await dbMarketing.getCampaigns()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/marketing', async (req, res) => {
  try {
    await dbMarketing.createCampaign(req.body);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/marketing/:row/launch', async (req, res) => {
  try {
    const id = parseInt(req.params.row);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    await dbMarketing.launchCampaign(id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: REVIEW REQUESTS ────────────────────────────────────────────────────
// Marks review as requested AND actually fires the SMS with a Google review link.
// Falls back to email if no phone number on file.
app.post('/api/jobs/:id/request-review', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    // Get job + client + settings
    const { getOne, updateOne, query: dbQ } = require('./src/db');
    const job = await getOne(
      `SELECT j.*, c.name AS client_name, c.email AS client_email, c.phone AS client_phone
       FROM jobs j LEFT JOIN clients c ON j.client_id = c.id
       WHERE j.id = $1 AND j.company_id = $2`,
      [id, COMPANY_ID]
    );
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const settings    = await dbSettings.readSettings();
    const companyName = settings.companyName || 'Our Team';
    const reviewLink  = settings.googleReviewLink || '';
    const firstName   = (job.client_name || 'there').split(' ')[0];

    if (!reviewLink) {
      return res.status(400).json({ error: 'Google Review Link not set in Settings' });
    }

    const smsMsg = `Hey ${firstName}! Thanks for choosing ${companyName} for your ${job.service || 'project'}. If we did a great job, would you mind leaving us a quick Google review? It really helps. ${reviewLink}`;

    let channel = null;
    let result  = null;

    // Prefer SMS (90%+ open rate)
    if (job.client_phone) {
      try {
        const sms = require('./src/tools/sms');
        await sms.sendSms(job.client_phone, smsMsg);
        // Log to conversations
        await dbQ(
          `INSERT INTO conversations (company_id, client_id, contact_name, contact_phone, direction, channel, body, status) VALUES ($1,$2,$3,$4,'outbound','sms',$5,'sent')`,
          [COMPANY_ID, job.client_id, job.client_name, job.client_phone, smsMsg]
        ).catch(() => {});
        channel = 'sms';
        result  = 'SMS sent to ' + job.client_phone;
      } catch (smsErr) {
        logger.warn('ReviewRequest', `SMS failed: ${smsErr.message}`);
      }
    }

    // Fallback to email
    if (!channel && job.client_email) {
      try {
        const { sendEmail } = require('./src/tools/gmail');
        await sendEmail({
          to: job.client_email,
          subject: `Would you leave us a Google review?`,
          body: smsMsg,
          html: `<p>Hey ${firstName},</p><p>Thanks for choosing ${companyName} for your ${job.service || 'project'}. If we did a great job, would you mind leaving us a quick Google review? It really helps small businesses like ours.</p><p><a href="${reviewLink}" style="background:#2D7A1E;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;margin-top:10px">Leave a Review</a></p><p>Thanks again!<br>— ${settings.ownerName || companyName}</p>`,
        });
        channel = 'email';
        result  = 'Email sent to ' + job.client_email;
      } catch (emailErr) {
        logger.warn('ReviewRequest', `Email failed: ${emailErr.message}`);
      }
    }

    if (!channel) {
      return res.status(400).json({ error: 'No phone or email on file for this client' });
    }

    // Mark review as requested
    await updateOne(
      `UPDATE jobs SET review_requested = true, review_requested_at = NOW() WHERE id = $1 AND company_id = $2`,
      [id, COMPANY_ID]
    );

    // Log activity
    await dbQ(
      `INSERT INTO activity_log (company_id, agent, action, detail, entity_type, entity_id) VALUES ($1,'ClientAgent','review_request',$2,'job',$3)`,
      [COMPANY_ID, `Review request ${channel} sent to ${job.client_name}`, id]
    ).catch(() => {});

    res.json({ success: true, channel, message: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: TEXT-TO-PAY ────────────────────────────────────────────────────────
// Sends a payment link via SMS for a given invoice. Uses existing Stripe +
// Twilio. Client taps link → Apple/Google Pay → done.
app.post('/api/invoices/:id/text-to-pay', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { getOne, query: dbQ } = require('./src/db');
    const inv = await getOne(
      `SELECT i.*, c.name AS client_name, c.phone AS client_phone, j.job_ref
       FROM invoices i
       LEFT JOIN jobs j ON i.job_id = j.id
       LEFT JOIN clients c ON j.client_id = c.id
       WHERE i.id = $1 AND i.company_id = $2`,
      [id, COMPANY_ID]
    );
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    if (!inv.client_phone) return res.status(400).json({ error: 'No phone number on file for this client' });

    const settings   = await dbSettings.readSettings();
    const companyName = settings.companyName || 'Us';
    const firstName  = (inv.client_name || 'there').split(' ')[0];
    const amount     = inv.amount ? '$' + Number(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
    const invoiceType = (inv.invoice_type || 'invoice').toLowerCase();

    // Build payment link — prefer Stripe if available
    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : (process.env.APP_URL || 'https://your-app.railway.app');
    const payUrl = inv.stripe_payment_link || `${baseUrl}/pay?invoice=${id}`;

    const msg = `Hi ${firstName} — your ${invoiceType} from ${companyName}${amount ? ' for ' + amount : ''} is ready. Pay securely here: ${payUrl}${inv.job_ref ? ' (' + inv.job_ref + ')' : ''}`;

    const sms = require('./src/tools/sms');
    await sms.sendSms(inv.client_phone, msg);

    // Log conversation + activity
    await dbQ(
      `INSERT INTO conversations (company_id, contact_name, contact_phone, direction, channel, body, status) VALUES ($1,$2,$3,'outbound','sms',$4,'sent')`,
      [COMPANY_ID, inv.client_name, inv.client_phone, msg]
    ).catch(() => {});
    await dbQ(
      `INSERT INTO activity_log (company_id, agent, action, detail, entity_type, entity_id) VALUES ($1,'PaymentAgent','text_to_pay',$2,'invoice',$3)`,
      [COMPANY_ID, `Text-to-pay link sent to ${inv.client_name} (${amount})`, id]
    ).catch(() => {});

    // Mark invoice as sent if not already
    if (inv.status === 'draft' || !inv.sent_at) {
      await dbQ(`UPDATE invoices SET status = 'sent', sent_at = NOW() WHERE id = $1`, [id]).catch(() => {});
    }

    res.json({ success: true, phone: inv.client_phone, amount, payUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── COMMISSION TRACKING ─────────────────────────────────────────────────────
// GET /api/team/:id/commissions — returns commission owed per job completed
app.get('/api/team/:id/commissions', requireAuth, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    if (isNaN(teamId)) return res.status(400).json({ error: 'Invalid id' });

    const { getOne, getAll } = require('./src/db');
    const member = await getOne('SELECT * FROM team WHERE id = $1 AND company_id = $2', [teamId, COMPANY_ID]);
    if (!member) return res.status(404).json({ error: 'Team member not found' });

    const commissionPct = parseFloat(member.commission_pct) || 0;

    // Find all jobs where this team member has a completed phase
    const phases = await getAll(
      `SELECT jp.*, j.id AS job_id, j.job_ref, j.title, j.estimated_value, j.actual_value, j.status AS job_status
       FROM job_phases jp
       LEFT JOIN jobs j ON jp.job_id = j.id
       WHERE jp.assigned_to = $1 AND j.company_id = $2 AND jp.status = 'completed'
       ORDER BY jp.completed_at DESC`,
      [member.name, COMPANY_ID]
    );

    // Group by job
    const byJob = {};
    phases.forEach(p => {
      if (!byJob[p.job_id]) {
        byJob[p.job_id] = {
          jobId: p.job_id, jobRef: p.job_ref, jobTitle: p.title,
          jobValue: parseFloat(p.actual_value || p.estimated_value) || 0,
          jobStatus: p.job_status,
          phasesCompleted: 0, phaseValue: 0,
        };
      }
      byJob[p.job_id].phasesCompleted++;
      byJob[p.job_id].phaseValue += parseFloat(p.estimated_cost) || 0;
    });

    // Calculate commission: commission_pct of the phase value (or job value if per-job commission)
    const commissions = Object.values(byJob).map(j => ({
      ...j,
      commissionAmount: Math.round((j.phaseValue * commissionPct / 100) * 100) / 100,
    }));

    const totalOwed = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);

    res.json({
      memberName: member.name, commissionPct,
      totalOwed: Math.round(totalOwed * 100) / 100,
      jobCount: commissions.length,
      jobs: commissions,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── EQUIPMENT MAINTENANCE ───────────────────────────────────────────────────
// GET /api/equipment/maintenance-alerts — returns equipment needing service soon
app.get('/api/equipment/maintenance-alerts', requireAuth, async (req, res) => {
  try {
    const { getAll } = require('./src/db');
    const rows = await getAll(
      `SELECT * FROM equipment WHERE company_id = $1 ORDER BY name`,
      [COMPANY_ID]
    );
    const alerts = rows.map(e => {
      const hoursOver  = e.next_service_hours && e.engine_hours >= e.next_service_hours;
      const milesOver  = e.next_service_miles && e.odometer_miles >= e.next_service_miles;
      const dateOver   = e.next_service_date && new Date(e.next_service_date) <= new Date();
      const hoursClose = e.next_service_hours && e.engine_hours >= e.next_service_hours * 0.9;
      const milesClose = e.next_service_miles && e.odometer_miles >= e.next_service_miles * 0.9;
      const needsService = hoursOver || milesOver || dateOver;
      const upcomingService = !needsService && (hoursClose || milesClose);
      return {
        id: e.id, name: e.name, type: e.type,
        engineHours: e.engine_hours, odometerMiles: e.odometer_miles,
        nextServiceHours: e.next_service_hours, nextServiceMiles: e.next_service_miles,
        nextServiceDate: e.next_service_date,
        lastServiceAt: e.last_service_at,
        status: needsService ? 'overdue' : upcomingService ? 'due-soon' : 'ok',
        message: hoursOver ? `${e.engine_hours}hrs — service overdue`
               : milesOver ? `${e.odometer_miles}mi — service overdue`
               : dateOver ? `Service date ${new Date(e.next_service_date).toLocaleDateString()} passed`
               : hoursClose ? `${e.next_service_hours - e.engine_hours}hrs until service`
               : milesClose ? `${e.next_service_miles - e.odometer_miles}mi until service`
               : '',
      };
    });
    const overdue    = alerts.filter(a => a.status === 'overdue');
    const dueSoon    = alerts.filter(a => a.status === 'due-soon');
    res.json({ alerts, overdue, dueSoon, totalCount: alerts.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/equipment/:id/log-service — record that service was done
app.post('/api/equipment/:id/log-service', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { nextServiceHours, nextServiceMiles, nextServiceDate } = req.body;
    const { query: dbQ } = require('./src/db');
    await dbQ(
      `UPDATE equipment SET last_service_at = NOW(),
         next_service_hours = $1, next_service_miles = $2, next_service_date = $3,
         updated_at = NOW()
       WHERE id = $4 AND company_id = $5`,
      [nextServiceHours || null, nextServiceMiles || null, nextServiceDate || null, id, COMPANY_ID]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── REFERRAL AUTO-REWARDS ───────────────────────────────────────────────────
// Called when a lead's deposit is marked paid.
// Checks: did this lead come from a referral? If yes, and reward not sent,
// auto-send thank-you + credit code to the referring client.
async function checkAndSendReferralReward(leadOrJobId, entityType = 'lead') {
  try {
    const { getOne, query: dbQ } = require('./src/db');
    const settings = await dbSettings.readSettings();
    const companyName = settings.companyName || 'Our Team';
    const rewardAmount = parseFloat(process.env.REFERRAL_REWARD_AMOUNT || 200);

    // Look up the lead (or via job → lead relation — keep simple: direct lead)
    const lead = entityType === 'lead'
      ? await getOne('SELECT * FROM leads WHERE id = $1 AND company_id = $2', [leadOrJobId, COMPANY_ID])
      : await getOne(
          `SELECT l.* FROM leads l
           INNER JOIN jobs j ON j.lead_id = l.id
           WHERE j.id = $1 AND l.company_id = $2`,
          [leadOrJobId, COMPANY_ID]
        ).catch(() => null);

    if (!lead || !lead.referral_client_id || lead.referral_reward_sent) return;

    // Look up the referring client
    const referrer = await getOne(
      'SELECT * FROM clients WHERE id = $1 AND company_id = $2',
      [lead.referral_client_id, COMPANY_ID]
    );
    if (!referrer) return;

    const firstName = (referrer.name || 'there').split(' ')[0];
    const msg = `Hi ${firstName} — thanks for referring ${lead.name} to ${companyName}! As a thank-you, we're crediting your account with $${rewardAmount} toward your next service. No code needed — we'll apply it automatically. You're the best!`;

    // Try SMS first, email fallback
    if (referrer.phone) {
      try {
        const sms = require('./src/tools/sms');
        await sms.sendSms(referrer.phone, msg);
      } catch (_) {
        if (referrer.email) {
          const { sendEmail } = require('./src/tools/gmail');
          await sendEmail({ to: referrer.email, subject: `Thank you for the referral — $${rewardAmount} credit`, body: msg }).catch(() => {});
        }
      }
    } else if (referrer.email) {
      const { sendEmail } = require('./src/tools/gmail');
      await sendEmail({ to: referrer.email, subject: `Thank you for the referral — $${rewardAmount} credit`, body: msg }).catch(() => {});
    }

    // Mark reward as sent
    await dbQ(
      `UPDATE leads SET referral_reward_sent = true, referral_reward_amount = $1 WHERE id = $2`,
      [rewardAmount, lead.id]
    );

    // Log activity
    await dbQ(
      `INSERT INTO activity_log (company_id, agent, action, detail, entity_type, entity_id) VALUES ($1,'MarketingAgent','referral_reward',$2,'client',$3)`,
      [COMPANY_ID, `Sent $${rewardAmount} referral reward to ${referrer.name} (referred ${lead.name})`, referrer.id]
    ).catch(() => {});

    logger.success('ReferralReward', `Sent $${rewardAmount} credit to ${referrer.name}`);
  } catch (e) {
    logger.warn('ReferralReward', `Skipped: ${e.message}`);
  }
}

// POST /api/referral/check/:leadId — manually trigger referral reward check
app.post('/api/referral/check/:leadId', requireAuth, async (req, res) => {
  await checkAndSendReferralReward(parseInt(req.params.leadId), 'lead');
  res.json({ ok: true });
});

// ─── PROPOSAL VIEW TRACKING ──────────────────────────────────────────────────
// GET /proposal-view/:jobId — tracking pixel wrapper. Client visits Google Doc,
// but we redirect them through this URL first to count the open.
app.get('/proposal-view/:jobId', async (req, res) => {
  try {
    const id = parseInt(req.params.jobId);
    if (isNaN(id)) return res.redirect('/');

    const { getOne, query: dbQ } = require('./src/db');
    const job = await getOne('SELECT proposal_link FROM jobs WHERE id = $1 AND company_id = $2', [id, COMPANY_ID]);

    // Increment view counter
    await dbQ(
      `UPDATE jobs SET
         proposal_views = COALESCE(proposal_views, 0) + 1,
         proposal_first_viewed_at = COALESCE(proposal_first_viewed_at, NOW()),
         proposal_last_viewed_at = NOW()
       WHERE id = $1`,
      [id]
    ).catch(() => {});

    // Log activity so the owner sees it on the feed
    await dbQ(
      `INSERT INTO activity_log (company_id, agent, action, detail, entity_type, entity_id) VALUES ($1,'JobAgent','proposal_viewed','Client viewed proposal','job',$2)`,
      [COMPANY_ID, id]
    ).catch(() => {});

    // Redirect to the actual Google Doc
    if (job?.proposal_link) return res.redirect(job.proposal_link);
    res.redirect('/');
  } catch (e) {
    res.redirect('/');
  }
});

// ─── API: CHECKLISTS ─────────────────────────────────────────────────────────
app.get('/api/jobs/:id/checklists', async (req, res) => {
  try {
    const { getAll } = require('./src/db');
    const rows = await getAll(
      `SELECT * FROM job_checklists WHERE job_id = $1 AND company_id = $2 ORDER BY checklist_type`,
      [parseInt(req.params.id), 1]
    );
    res.json(rows);
  } catch (e) { res.json([]); }
});

app.post('/api/jobs/:id/checklists', async (req, res) => {
  try {
    const { insertOne } = require('./src/db');
    await insertOne(
      `INSERT INTO job_checklists (company_id, job_id, checklist_type, items) VALUES ($1,$2,$3,$4)`,
      [1, parseInt(req.params.id), req.body.type, JSON.stringify(req.body.items)]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/checklists/:id', async (req, res) => {
  try {
    const { updateOne } = require('./src/db');
    const extra = req.body.completed ? ', completed_at = NOW(), completed_by = $3' : '';
    const params = [JSON.stringify(req.body.items), parseInt(req.params.id)];
    if (req.body.completed) params.push(req.body.completed_by || 'owner');
    await updateOne(`UPDATE job_checklists SET items = $1${extra} WHERE id = $2`, params);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: EQUIPMENT AUTO-ASSIGN ──────────────────────────────────────────────
app.post('/api/jobs/:id/auto-assign-equipment', async (req, res) => {
  try {
    const equipment = await require('./src/services/equipment').getEquipment('available');
    // Suggest available vehicles + equipment for the job
    const suggestions = equipment.slice(0, 3); // Top 3 available items
    res.json(suggestions);
  } catch (e) { res.json([]); }
});

// ─── API: APPROVALS ──────────────────────────────────────────────────────────
app.get('/api/approvals', async (req, res) => {
  try {
    const jobs = await dbJobs.getJobs();
    const items = [];
    jobs.forEach(j => {
      if (j.proposalStatus === 'Pending Approval') {
        items.push({ _row:j.id, jobId:j.jobRef, clientName:j.clientName, serviceType:j.service,
          jobValue:j.estimatedValue, type:'proposal', label:'Proposal', docLink:'' });
      }
      if (j.contractStatus === 'Pending Approval') {
        items.push({ _row:j.id, jobId:j.jobRef, clientName:j.clientName, serviceType:j.service,
          jobValue:j.estimatedValue, type:'contract', label:'Contract', docLink:'' });
      }
    });

    // Include pending email approvals from the queue
    try {
      const { getAll } = require('./src/db');
      const pendingEmails = await getAll(
        `SELECT * FROM pending_approvals WHERE company_id = 1 AND status = 'pending' ORDER BY created_at DESC`
      );
      pendingEmails.forEach(e => {
        items.push({
          _row: e.id, type: 'email', label: 'AI Email',
          clientName: e.recipient, subject: e.subject, body: e.body,
          agentName: e.agent_name, jobId: e.job_id,
          createdAt: e.created_at, approvalId: e.id,
        });
      });
    } catch (_) { /* pending_approvals table may not exist yet */ }

    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Approve and send a queued email
app.post('/api/approvals/:id/send', async (req, res) => {
  try {
    const { updateOne } = require('./src/db');
    await updateOne('UPDATE pending_approvals SET status = $1 WHERE id = $2', ['approved', parseInt(req.params.id)]);
    const { sendApprovedEmail } = require('./src/tools/gmail');
    const result = await sendApprovedEmail(parseInt(req.params.id));
    res.json({ ok: true, threadId: result.threadId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Reject a queued email
app.post('/api/approvals/:id/reject', async (req, res) => {
  try {
    const { updateOne } = require('./src/db');
    await updateOne('UPDATE pending_approvals SET status = $1 WHERE id = $2', ['rejected', parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/jobs/:row/approve', async (req, res) => {
  try {
    const id = parseInt(req.params.row);
    const { type } = req.body;
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const fieldMap = { proposal:'proposal_status', contract:'contract_status' };
    if (!fieldMap[type]) return res.status(400).json({ error: 'Unknown type' });
    await dbJobs.updateJobField(id, fieldMap[type], 'Approved');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/jobs/:row/flag', async (req, res) => {
  try {
    const id = parseInt(req.params.row);
    const { type, note } = req.body;
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const fieldMap = { proposal:'proposal_status', contract:'contract_status' };
    if (!fieldMap[type]) return res.status(400).json({ error: 'Unknown type' });
    await dbJobs.updateJobField(id, fieldMap[type], 'Flagged — Needs Revision');
    if (note) await dbJobs.updateJobField(id, 'notes', note);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: FIELD UPDATE (PM logs daily progress from job site) ────────────────
app.post('/api/jobs/:row/field-update', async (req, res) => {
  try {
    const id = parseInt(req.params.row);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { note, notifyClient } = req.body;
    if (!note) return res.status(400).json({ error: 'Note required' });

    const job = await dbJobs.getJob(id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const timestamp = new Date().toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
    const existingNotes = (job.notes || '').trim();
    const newNotes = existingNotes ? `${existingNotes}\n[${timestamp}]: ${note}` : `[${timestamp}]: ${note}`;
    await dbJobs.updateJobField(id, 'notes', newNotes);

    if (notifyClient) {
      const { route } = require('./src/agents/orchestrator');
      route('send_weekly_update', { rowNumber: id }).catch(err =>
        logger.error('API', `Field update notify failed: ${err.message}`)
      );
    }
    res.json({ ok: true, timestamp });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: SITE VISIT UPDATE (salesperson adds notes after walking property) ────
app.post('/api/jobs/:row/site-visit', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.row);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { notes, workAreas, squareFootage, qualityTier, lotSize,
            clientBudget, soilConditions, accessIssues, existingConditions, clientPreferences } = req.body;

    const updates = {};
    if (notes !== undefined)              updates.site_visit_notes = notes;
    if (workAreas !== undefined)          updates.work_areas = workAreas;
    if (squareFootage)                    updates.square_footage = parseInt(squareFootage) || null;
    if (qualityTier !== undefined)        updates.quality_tier = qualityTier;
    if (lotSize !== undefined)            updates.lot_size = lotSize;
    if (clientBudget !== undefined)       updates.client_budget = clientBudget;
    if (soilConditions !== undefined)     updates.soil_conditions = soilConditions;
    if (accessIssues !== undefined)       updates.access_issues = accessIssues;
    if (existingConditions !== undefined) updates.existing_conditions = existingConditions;
    if (clientPreferences !== undefined)  updates.client_preferences = clientPreferences;
    updates.site_visit_date = new Date().toISOString().split('T')[0];

    for (const [field, value] of Object.entries(updates)) {
      await dbJobs.updateJobField(id, field, value);
    }
    res.json({ ok: true, message: 'Site visit data saved' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: REGENERATE ESTIMATE (re-run pricing agent with updated data) ────────
app.post('/api/jobs/:row/regenerate-estimate', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.row);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { route } = require('./src/agents/orchestrator');
    route('estimate_ready', { rowNumber: id }).catch(err =>
      logger.error('API', `Regenerate estimate failed: ${err.message}`)
    );
    res.json({ ok: true, message: 'Estimate generation started — check back in 1-2 minutes' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: FIELD ISSUE FLAG (PM flags a problem, owner gets text + email) ─────
app.post('/api/jobs/:row/field-issue', async (req, res) => {
  try {
    const id = parseInt(req.params.row);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { issue, severity } = req.body;
    if (!issue) return res.status(400).json({ error: 'Issue description required' });

    const job = await dbJobs.getJob(id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const timestamp = new Date().toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
    const issueNote = `[${timestamp}] ! ISSUE FLAGGED: ${issue}`;
    const newNotes = job.notes ? `${job.notes}\n${issueNote}` : issueNote;
    await dbJobs.updateJobField(id, 'notes', newNotes);

    const { notifyOwner } = require('./src/tools/notify');
    await notifyOwner({
      subject: `! Issue Flagged — ${job.clientName || 'Client'} ${job.service || ''}`,
      message: `A field issue was flagged on the ${job.clientName || ''} job.\n\nSeverity: ${severity || 'Unknown'}\n\nIssue: ${issue}\n\nLogged at: ${timestamp}`,
      urgent: true, eventType: 'fieldIssue',
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: SETTINGS ───────────────────────────────────────────────────────────
// ── SETTINGS (PostgreSQL) ──────────────────────────────────────────────────
app.get('/api/settings', async (req, res) => {
  try { res.json(await dbSettings.readSettings()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', async (req, res) => {
  try { await dbSettings.writeSettings(req.body); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GOALS (PostgreSQL) ────────────────────────────────────────────────────
app.get('/api/goals', async (req, res) => {
  try { res.json(await dbSettings.readGoals()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/goals', async (req, res) => {
  try { await dbSettings.writeGoals(req.body); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Legacy webhook aliases — kept for backward compat with existing Make.com scenarios
app.post('/webhook/new-lead', async (req, res) => {
  res.status(200).json({ received: true });
  try {
    const { route } = require('./src/agents/orchestrator');
    const body = req.body || {};

    // If a DB lead id is provided directly, use it
    if (body.leadId || body.id) {
      const id = parseInt(body.leadId || body.id);
      if (!isNaN(id)) {
        route('new_lead', { rowNumber: id }).catch(console.error);
        return;
      }
    }

    // Legacy: rowNumber from Make.com scenarios (still supported during transition)
    if (body.rowNumber || body.row) {
      route('new_lead', { rowNumber: parseInt(body.rowNumber || body.row) }).catch(console.error);
      return;
    }

    // New: form data comes in directly — create lead in DB
    if (body.name || body.email || body.firstName) {
      const name = body.name || [body.firstName || '', body.lastName || ''].filter(Boolean).join(' ');
      const leadData = {
        name, email: body.email || '', phone: body.phone || '',
        source: body.source || body.leadSource || 'Website',
        serviceRequested: body.serviceRequested || body.projectType || body.service || '',
        notes: body.notes || body.message || '',
        status: 'New',
      };
      const newLead = await dbLeads.createLead(leadData);
      if (newLead?.id) {
        route('new_lead', { rowNumber: newLead.id }).catch(console.error);
      }
    }
  } catch (err) {
    console.error('Webhook new-lead error:', err.message);
  }
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

// POST /webhook/sms — Twilio inbound SMS handler
app.post('/webhook/sms', express.urlencoded({ extended: false }), async (req, res) => {
  // Always respond with empty TwiML immediately (Twilio requires fast response)
  res.set('Content-Type', 'text/xml');
  res.send('<Response></Response>');

  try {
    const from = req.body.From || '';  // E.164: +15551234567
    const body = (req.body.Body || '').trim();
    const to   = req.body.To   || '';

    if (!from || !body) return;

    logger.info('SMS', `Inbound from ${from}: ${body}`);

    const { query: dbQ } = require('./src/db');

    // Look up who sent this — check Leads then Clients
    let senderName = null, senderType = null, senderRow = null, senderEmail = null;
    const normalize = p => (p || '').replace(/\D/g, '').slice(-10);
    const fromNorm = normalize(from);

    // Search Leads
    const leadResult = await dbQ('SELECT id, name, email FROM leads WHERE company_id = $1', [COMPANY_ID]);
    for (const lead of leadResult.rows) {
      if (normalize(lead.phone) === fromNorm) {
        senderName = lead.name; senderEmail = lead.email; senderType = 'lead'; senderRow = lead.id;
        break;
      }
    }

    // Search Clients if not found
    if (!senderName) {
      const clientResult = await dbQ('SELECT id, name, email, phone FROM clients WHERE company_id = $1', [COMPANY_ID]);
      for (const client of clientResult.rows) {
        if (normalize(client.phone) === fromNorm) {
          senderName = client.name; senderEmail = client.email; senderType = 'client'; senderRow = client.id;
          break;
        }
      }
    }

    // Log to conversations table
    await dbQ(
      `INSERT INTO conversations (company_id, contact_name, contact_phone, contact_email, direction, channel, body, status, lead_id, client_id) VALUES ($1,$2,$3,$4,'inbound','sms',$5,'received',$6,$7)`,
      [COMPANY_ID, senderName || 'Unknown', from, senderEmail || '', body, senderType === 'lead' ? senderRow : null, senderType === 'client' ? senderRow : null]
    ).catch(() => {});

    // Notify owner of inbound SMS
    try {
      const sms = require('./src/tools/sms');
      // Don't loop — only notify if sender is not our own outbound number
      if (from !== process.env.TWILIO_PHONE) {
        await sms.textOwner(`SMS from ${senderName || from}: "${body}"`);
      }
    } catch(_) {}

    // Route to agent for auto-reply
    try {
      const orchestrator = require('./src/agents/orchestrator');
      await orchestrator.handleEvent('sms_reply', {
        from,
        body,
        senderName:  senderName  || 'Unknown',
        senderEmail: senderEmail || '',
        senderType:  senderType  || 'unknown',
        senderRow,
      });
    } catch(_) {}

  } catch(e) {
    logger.error('SMS Webhook', e.message);
  }
});

// GET /api/weather?address=... — check weather alerts for an address
app.get('/api/weather', requireAuth, async (req, res) => {
  try {
    const address = req.query.address || '';
    if (!address) return res.json({ alerts: [] });
    const { checkWeatherAlerts } = require('./src/tools/weather');
    const alerts = await checkWeatherAlerts(address);
    res.json({ alerts: alerts || [] });
  } catch(e) {
    res.json({ alerts: [] }); // Never fail the dashboard
  }
});

// GET /api/sms — get SMS conversation log
app.get('/api/sms', requireAuth, async (req, res) => {
  try {
    const { query: dbQ } = require('./src/db');
    const result = await dbQ(
      `SELECT * FROM conversations WHERE company_id = $1 AND channel = 'sms' ORDER BY created_at DESC LIMIT 100`,
      [COMPANY_ID]
    );
    const messages = result.rows.map(r => ({
      timestamp: r.created_at ? new Date(r.created_at).toISOString() : '',
      direction: r.direction || 'outbound',
      phone: r.contact_phone || '',
      name: r.contact_name || '',
      message: r.body || '',
      type: r.status || '',
    }));
    res.json(messages);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/sms/send — send an SMS from the dashboard
app.post('/api/sms/send', requireAuth, async (req, res) => {
  try {
    const { to, message, name } = req.body;
    if (!to || !message) return res.status(400).json({ error: 'to and message required' });

    const sms = require('./src/tools/sms');
    await sms.sendSms(to, message);

    // Log to Postgres
    const { query: dbQ } = require('./src/db');
    await dbQ(
      `INSERT INTO conversations (company_id, contact_name, contact_phone, direction, channel, body, status) VALUES ($1,$2,$3,'outbound','sms',$4,'sent')`,
      [COMPANY_ID, name || '', to, message]
    ).catch(() => {});

    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
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
      subject: `* Change Order Approved — ${g(co, 'Client Name')}`,
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
    'approved':         { icon: '*', title: 'Change Order Approved!', sub: 'Thank you — we\'ll get started on the updated scope right away.', color: '#22C55E' },
    'declined':         { icon: '❌', title: 'Change Order Declined', sub: 'No problem — we\'ll be in touch to discuss your options.', color: '#EF4444' },
    'already-approved': { icon: '*', title: 'Already Approved', sub: 'This change order was already approved. We\'re on it!', color: '#22C55E' },
    'already-declined': { icon: '❌', title: 'Already Declined', sub: 'This change order was already declined.', color: '#EF4444' },
    'not-found':        { icon: '🔍', title: 'Link Expired', sub: 'This link is no longer valid. Please contact us directly.', color: '#6B7280' },
    'error':            { icon: '!', title: 'Something went wrong', sub: 'Please contact us directly.', color: '#F59E0B' },
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
    const [settings, jobs] = await Promise.all([dbSettings.readSettings(), dbJobs.getJobs()]);

    // Get all phases across all jobs, filter to this sub
    const { getAll } = require('./src/db');
    const allPhases = await getAll(
      `SELECT p.*, j.address, j.service, j.client_id, c.name AS client_name
       FROM job_phases p
       JOIN jobs j ON p.job_id = j.id
       LEFT JOIN clients c ON j.client_id = c.id
       WHERE j.company_id = $1 AND (
         LOWER(p.assigned_to) LIKE $2
       ) ORDER BY p.status ASC, p.start_date ASC`,
      [1, `%${subName}%`]
    );

    if (!allPhases.length) return res.status(404).json({ error: 'No phases found for this sub' });

    const phases = allPhases.map(p => ({
      _row: p.id, phaseId: p.id, jobId: p.job_id,
      phaseName: p.name || '—', trade: p.assigned_to || '',
      status: p.status || 'Pending', startDate: p.start_date || '',
      endDate: p.end_date || '', materials: '', notes: p.description || '',
      clientFirst: (p.client_name || '').split(' ')[0] || '',
      address: p.address || '', city: '', projectType: p.service || '',
    })).sort((a, b) => {
      const order = { 'in progress':0, 'active':0, 'pending':1, 'complete':2, 'completed':2 };
      return (order[(a.status||'').toLowerCase()] ?? 1) - (order[(b.status||'').toLowerCase()] ?? 1);
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
    const id = parseInt(req.params.row);
    const { notes } = req.body || {};
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    await dbJobs.updatePhaseStatus(id, 'completed');
    if (notes) {
      const { query } = require('./src/db');
      await query(`UPDATE job_phases SET description=CONCAT(COALESCE(description,''), ' | Notes: ', $1), updated_at=NOW() WHERE id=$2`, [notes, id]);
    }
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
    const [job, settings] = await Promise.all([
      dbJobs.getJobByRef(jobId.toUpperCase()),
      dbSettings.readSettings(),
    ]);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const phases = await dbJobs.getPhases(job.id);
    const mappedPhases = phases.map(p => ({
      name: p.name, trade: p.assignedTo || '', status: p.status,
      start: p.startDate, end: p.endDate,
    }));
    const totalPhases = mappedPhases.length;
    const completePhases = mappedPhases.filter(p => p.status.toLowerCase().includes('complet')).length;
    const progressPct = totalPhases > 0 ? Math.round((completePhases / totalPhases) * 100) : 0;

    res.json({
      company: { name: settings.companyName || 'Your Contractor', phone: settings.phone || '', email: settings.email || '' },
      job: {
        id: job.jobRef, clientName: job.clientName || '', projectType: job.service || 'Service Project',
        status: job.status, startDate: job.startDate, endDate: job.endDate,
        lastUpdate: '', notes: job.notes || '', address: job.address || '',
      },
      phases: mappedPhases,
      progress: { total: totalPhases, complete: completePhases, pct: progressPct },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── CLIENT STATUS PAGE ───────────────────────────────────────────────────────
app.get('/status/:jobId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'status.html'));
});

// ─── CLIENT PAY PAGE API ──────────────────────────────────────────────────────
// GET /api/pay/:jobId — get payment info for client pay page (public — no auth)
app.get('/api/pay/:jobId', async (req, res) => {
  try {
    const jobRef = (req.params.jobId || '').toUpperCase();
    const { query: dbQ } = require('./src/db');

    // Find job by ref
    const jobResult = await dbQ('SELECT * FROM jobs WHERE UPPER(job_ref) = $1 AND company_id = $2', [jobRef, COMPANY_ID]);
    if (!jobResult.rows.length) return res.status(404).json({ error: 'Job not found' });
    const job = jobResult.rows[0];

    // Get invoices for this job
    const invResult = await dbQ('SELECT * FROM invoices WHERE job_id = $1 AND company_id = $2 ORDER BY created_at', [job.id, COMPANY_ID]);
    const deposit = invResult.rows.find(i => i.invoice_type === 'deposit');
    const final = invResult.rows.find(i => i.invoice_type === 'final');

    // Get company info
    const settings = await dbSettings.readSettings();

    res.json({
      jobId: job.job_ref,
      clientName: job.client_name || '',
      projectType: job.service || job.title || 'Project',
      status: job.status || '',
      depositAmount: deposit?.amount || job.deposit_amount || '',
      finalAmount: final?.amount || job.estimated_value || '',
      depositPaid: deposit?.status === 'paid' ? 'Paid' : '',
      finalPaid: final?.status === 'paid' ? 'Paid' : '',
      depositLink: deposit?.stripe_payment_link || '',
      finalLink: final?.stripe_payment_link || '',
      company: {
        name: settings.companyName || 'Your Company',
        phone: settings.phone || '',
        email: settings.email || '',
      },
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── CLIENT PAY PAGE ──────────────────────────────────────────────────────────
app.get('/pay/:jobId', (req, res) => {
  res.sendFile('pay.html', { root: path.join(__dirname, 'public') });
});

// ─── PAYMENT THANK-YOU PAGE ───────────────────────────────────────────────────
app.get('/paid', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Payment Received</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #0A0908; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 32px; }
    .icon { font-size: 64px; margin-bottom: 20px; }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
    p { color: rgba(255,255,255,.6); font-size: 15px; line-height: 1.6; }
    .gold { color: #BF9438; }
  </style>
</head>
<body>
  <div>
    <div class="icon">*</div>
    <h1>Payment Received!</h1>
    <p>Thank you — your payment has been processed.<br>You'll receive a confirmation email shortly.</p>
    <p style="margin-top:20px;font-size:13px" class="gold">Powered by SPEC Systems</p>
  </div>
</body>
</html>`);
});

// ─── PHOTO LOG API ────────────────────────────────────────────────────────────

// Upload a photo (base64) for a job — stores in Google Drive, logs in Job Photos tab
app.post('/api/jobs/:row/photos', async (req, res) => {
  try {
    const jobId = parseInt(req.params.row);
    if (isNaN(jobId)) return res.status(400).json({ error: 'Invalid job ID' });
    const { imageData, mimeType = 'image/jpeg', caption = '', photoType = 'progress' } = req.body;
    if (!imageData) return res.status(400).json({ error: 'imageData required' });

    // Upload to Google Drive
    const { google } = require('googleapis');
    const { Readable } = require('stream');
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const drive = google.drive({ version: 'v3', auth });

    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('gif') ? 'gif' : 'jpg';
    const filename = `JOB-${jobId}_${Date.now()}.${ext}`;
    const buffer = Buffer.from(imageData, 'base64');

    const file = await drive.files.create({
      requestBody: { name: filename },
      media: { mimeType, body: Readable.from(buffer) },
      fields: 'id',
    });
    const fileId = file.data.id;

    await drive.permissions.create({
      fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    const photoUrl = `https://lh3.googleusercontent.com/d/${fileId}`;

    // Save to Postgres
    const { query: dbQuery } = require('./src/db');
    await dbQuery(
      `INSERT INTO photos (company_id, job_id, url, caption, photo_type, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6)`,
      [COMPANY_ID, jobId, photoUrl, caption, photoType, req.currentUser?.name || 'Unknown']
    );

    res.json({ ok: true, photoUrl, fileId });
  } catch (e) {
    console.error('Photo upload error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Get all photos for a job
app.get('/api/jobs/:jobId/photos', async (req, res) => {
  try {
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) return res.json([]);
    const { query: dbQuery } = require('./src/db');
    const result = await dbQuery(
      `SELECT id, url AS "photoUrl", caption, photo_type AS type, uploaded_by, created_at AS timestamp FROM photos WHERE job_id = $1 AND company_id = $2 ORDER BY created_at DESC`,
      [jobId, COMPANY_ID]
    );
    res.json(result.rows);
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
    'already-approved': { icon: '*', title: 'Already Approved!', sub: 'You\'re all set — your proposal has already been approved. We\'ll be in touch with next steps soon.', color: '#22C55E' },
    'already-declined': { icon: '👋', title: 'Already Noted', sub: 'You\'ve already declined this proposal. Reach out anytime if you change your mind!', color: '#6B7280' },
    'not-found':        { icon: '🔍', title: 'Link Expired', sub: 'This link is no longer valid. Please contact us directly and we\'ll get you sorted.', color: '#6B7280' },
    'error':            { icon: '!', title: 'Something Went Wrong', sub: 'Please contact us directly and we\'ll take care of it right away.', color: '#F59E0B' },
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
    const { query: dbQuery } = require('./src/db');
    const jobRows = await dbQuery(`
      SELECT j.id, j.job_ref, j.title, j.service, j.status, j.client_name,
        j.estimated_value, j.actual_value, j.material_cost, j.labor_cost,
        COALESCE(
          (SELECT SUM(COALESCE(estimated_cost,0)) FROM job_phases WHERE job_id = j.id), 0
        ) as phase_est_cost,
        COALESCE(
          (SELECT SUM(COALESCE(actual_cost,0)) FROM job_phases WHERE job_id = j.id), 0
        ) as phase_actual_cost,
        (SELECT COUNT(*) FROM job_phases WHERE job_id = j.id) as total_phases,
        (SELECT COUNT(*) FROM job_phases WHERE job_id = j.id AND status = 'completed') as phases_done
      FROM jobs j WHERE j.company_id = 1 AND j.estimated_value > 0
      ORDER BY j.estimated_value DESC
    `);

    const results = jobRows.rows.map(j => {
      const contractVal = parseFloat(j.estimated_value) || 0;
      const estCost = parseFloat(j.phase_est_cost) || parseFloat(j.material_cost || 0) + parseFloat(j.labor_cost || 0);
      const actualCost = parseFloat(j.phase_actual_cost) || 0;
      const margin = contractVal > 0 ? Math.round(((contractVal - (actualCost || estCost)) / contractVal) * 100) : null;

      return {
        jobId: j.job_ref, clientName: j.client_name || '', projectType: j.service || j.title,
        jobStatus: j.status, contractVal, estCost, actualCost, margin,
        overBudget: actualCost > 0 && estCost > 0 && actualCost > estCost,
        totalPhases: parseInt(j.total_phases), phasesDone: parseInt(j.phases_done),
      };
    });

    const total = results.reduce((s, j) => s + j.contractVal, 0);
    const totalEst = results.reduce((s, j) => s + j.estCost, 0);
    const totalActual = results.reduce((s, j) => s + j.actualCost, 0);
    const withMargin = results.filter(j => j.margin !== null);
    const avgMargin = withMargin.length > 0 ? Math.round(withMargin.reduce((s, j) => s + j.margin, 0) / withMargin.length) : null;

    res.json({ jobs: results, summary: { total, totalEst, totalActual, avgMargin, jobCount: results.length } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ANALYTICS: LEAD SOURCES ───────────────────────────────────────────────────
app.get('/api/analytics/lead-sources', async (req, res) => {
  try {
    const { query: dbQuery } = require('./src/db');
    const leadRows = await dbQuery(`SELECT source, status FROM leads WHERE company_id = 1`);
    const jobRows = await dbQuery(`SELECT source, estimated_value FROM jobs WHERE company_id = 1 AND estimated_value > 0`);

    const sourceMap = {};
    leadRows.rows.forEach(l => {
      const source = l.source || 'Unknown';
      const converted = /convert/i.test(l.status || '');
      if (!sourceMap[source]) sourceMap[source] = { source, leads: 0, converted: 0, totalValue: 0 };
      sourceMap[source].leads++;
      if (converted) sourceMap[source].converted++;
    });

    jobRows.rows.forEach(j => {
      const source = j.source || 'Unknown';
      const value = parseFloat(j.estimated_value) || 0;
      if (!sourceMap[source]) sourceMap[source] = { source, leads: 0, converted: 0, totalValue: 0 };
      sourceMap[source].totalValue += value;
    });

    const results = Object.values(sourceMap)
      .map(s => ({
        ...s,
        conversionRate: s.leads > 0 ? Math.round((s.converted / s.leads) * 100) : 0,
        avgJobValue: s.converted > 0 ? Math.round(s.totalValue / s.converted) : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    res.json(results);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ANALYTICS: TEAM PERFORMANCE ──────────────────────────────────────────────
app.get('/api/analytics/revenue-by-month', async (req, res) => {
  try {
    const { query: dbQuery } = require('./src/db');
    const result = await dbQuery(`
      SELECT DATE_TRUNC('month', COALESCE(end_date, start_date, created_at)) AS month,
             SUM(COALESCE(actual_value, estimated_value, 0)) AS revenue,
             COUNT(*) AS job_count
      FROM jobs WHERE company_id = 1 AND status IN ('completed','Complete','Invoiced','in_progress','In Progress','Active')
      GROUP BY month ORDER BY month DESC LIMIT 6
    `);
    const data = result.rows.map(r => {
      const d = new Date(r.month);
      const label = d.toLocaleString('en-US', { month: 'short' });
      const val = parseFloat(r.revenue) || 0;
      return { label, value: val, label2: val >= 1000 ? '$' + Math.round(val/1000) + 'k' : '$' + val, jobs: parseInt(r.job_count) };
    }).reverse();
    res.json(data);
  } catch (e) { res.json([]); }
});

app.get('/api/analytics/referrals', async (req, res) => {
  try {
    const { query: dbQuery } = require('./src/db');
    const result = await dbQuery(`
      SELECT c.id, c.name AS client_name, c.referral_count,
             COUNT(l.id) AS actual_referrals,
             SUM(CASE WHEN l.budget IS NOT NULL THEN l.budget ELSE 0 END) AS referral_value
      FROM clients c
      LEFT JOIN leads l ON l.referral_client_id = c.id AND l.company_id = 1
      WHERE c.company_id = 1
      GROUP BY c.id, c.name, c.referral_count
      HAVING COUNT(l.id) > 0 OR COALESCE(c.referral_count, 0) > 0
      ORDER BY GREATEST(COUNT(l.id), COALESCE(c.referral_count, 0)) DESC
      LIMIT 10
    `);
    res.json(result.rows.map(r => ({
      name: r.client_name,
      count: Math.max(parseInt(r.actual_referrals) || 0, parseInt(r.referral_count) || 0),
      value: parseFloat(r.referral_value) || 0
    })));
  } catch (e) { res.json([]); }
});

app.get('/api/analytics/funnel', async (req, res) => {
  try {
    const { query: dbQuery } = require('./src/db');
    const result = await dbQuery(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE LOWER(status) NOT IN ('new')) AS contacted,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('qualified','proposal sent','consultation booked','converted','won')) AS qualified,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('proposal sent','consultation booked','converted','won')) AS proposal,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('converted','won')) AS won
      FROM leads WHERE company_id = 1
    `);
    const r = result.rows[0] || {};
    res.json([
      { label: 'Total Leads', value: parseInt(r.total) || 0 },
      { label: 'Contacted', value: parseInt(r.contacted) || 0 },
      { label: 'Qualified', value: parseInt(r.qualified) || 0 },
      { label: 'Proposal Sent', value: parseInt(r.proposal) || 0 },
      { label: 'Won', value: parseInt(r.won) || 0 },
    ]);
  } catch (e) { res.json([]); }
});

app.get('/api/analytics/team', async (req, res) => {
  try {
    const { query: dbQuery } = require('./src/db');
    const teamRows = await dbQuery(`SELECT id, name, role, hourly_rate FROM team WHERE company_id = 1 AND status = 'active'`);
    const phaseRows = await dbQuery(`SELECT assigned_to, status, estimated_cost, actual_cost FROM job_phases WHERE job_id IN (SELECT id FROM jobs WHERE company_id = 1)`);
    const clockRows = await dbQuery(`SELECT team_member_name, hours FROM time_clock WHERE company_id = 1`);

    const teamStats = teamRows.rows.map(t => {
      const name = t.name;
      const role = t.role;
      const active = g(t, 'Active', 'Is Active');

      const assignedPhases = phaseRows.rows.filter(p => p.assigned_to === name);
      const donePhases = assignedPhases.filter(p => p.status === 'completed');
      const totalHours = clockRows.rows.filter(c => c.team_member_name === name).reduce((s, c) => s + (parseFloat(c.hours) || 0), 0);
      const hourlyRate = parseFloat(t.hourly_rate) || 0;

      return {
        name, role, active: true,
        phasesAssigned: assignedPhases.length,
        phasesDone: donePhases.length,
        totalHours: Math.round(totalHours * 10) / 10,
        hourlyRate,
        laborCost: Math.round(totalHours * hourlyRate),
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

    const { readRow } = require('./src/tools/sheets-compat');
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
    <div style="background:#F0FDF4;border-radius:10px;padding:14px;font-size:13px;color:#15803D;font-weight:600">* Your project start date is confirmed</div>
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
    'error':      { icon: '!', title: 'Something Went Wrong', sub: 'Please contact us directly and we\'ll get your start date confirmed right away.', color: '#F59E0B' },
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

// ─── API: TODAY'S SCHEDULE ────────────────────────────────────────────────────
// Combines Google Calendar (if configured) with Leads appointments + Job start dates.
// Used by the dashboard schedule strip so it always has data even without Calendar auth.
app.get('/api/schedule/today', async (req, res) => {
  try {
    const todayStr = new Date().toDateString();
    const events   = [];

    // 1. Try Google Calendar first
    try {
      if (calendarTool) {
        const calEvents = await calendarTool.listUpcomingEvents(2);
        calEvents.forEach(e => {
          const start = e.start?.dateTime || e.start?.date || '';
          if (!start) return;
          if (new Date(start).toDateString() !== todayStr) return;
          events.push({
            id:       e.id,
            title:    e.summary || 'Meeting',
            start,
            end:      e.end?.dateTime || e.end?.date || '',
            location: e.location || '',
            link:     e.htmlLink || '',
            color:    e.colorId || '7',
            source:   'calendar',
          });
        });
      }
    } catch (_) {}

    // 2. Leads with appointments today
    try {
      const leads = await readTab('Leads');
      leads.forEach((l, i) => {
        const appt = g(l, 'Appointment Date', 'Call Scheduled Date', 'Consultation Date', 'Site Visit Date');
        if (!appt) return;
        try {
          const d = new Date(appt);
          if (isNaN(d) || d.toDateString() !== todayStr) return;
          const name = `${g(l,'First Name')} ${g(l,'Last Name')}`.trim() || 'Lead';
          const proj = g(l,'Service Requested','Service Type','Project Type') || '';
          const timeStr = appt.includes('T') ? appt : new Date(appt + 'T10:00:00').toISOString();
          events.push({
            id:     `lead-${i+2}`,
            title:  `${name}${proj ? ' — ' + proj : ''} (Consultation)`,
            start:  timeStr,
            end:    '',
            location: [g(l,'Street Address','Address'),g(l,'City')].filter(Boolean).join(', '),
            link:   '',
            color:  '10', // green
            source: 'lead',
          });
        } catch (_) {}
      });
    } catch (_) {}

    // 3. Jobs starting today or with kickoff today
    try {
      const jobs = await readTab('Jobs');
      jobs.forEach((j, i) => {
        const startDate = g(j,'Site Visit Date','Kickoff Date','Start Date');
        if (!startDate) return;
        try {
          const d = new Date(startDate);
          if (isNaN(d) || d.toDateString() !== todayStr) return;
          const name  = `${g(j,'First Name')} ${g(j,'Last Name')}`.trim() || 'Client';
          const proj  = g(j,'Service Type','Project Type') || 'Job';
          const jobId = g(j,'Job ID') || '';
          const timeStr = startDate.includes('T') ? startDate : new Date(startDate + 'T08:00:00').toISOString();
          events.push({
            id:     `job-${i+2}`,
            title:  `${name} — ${proj}${jobId ? ' ('+jobId+')' : ''}`,
            start:  timeStr,
            end:    '',
            location: [g(j,'Street Address','Address'),g(j,'City')].filter(Boolean).join(', '),
            link:   '',
            color:  '1', // red/tomato for job starts
            source: 'job',
          });
        } catch (_) {}
      });
    } catch (_) {}

    // Sort by time
    events.sort((a, b) => new Date(a.start) - new Date(b.start));
    res.json(events);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── WEATHER FORECAST ───────────────────────────────────────────────────────
// Returns a 5-day forecast for the company's primary address.
// Uses Open-Meteo (free, no API key required). Graceful fallback if offline.
app.get('/api/weather', async (req, res) => {
  try {
    const s = await dbSettings.readSettings();
    const address = (req.query.address || s.address || '').trim();
    if (!address) return res.json({ ok: false, reason: 'No company address set in Settings' });

    // Geocode (shares cache with route optimizer)
    const coords = await geocodeAddress(address);
    if (!coords) return res.json({ ok: false, reason: 'Could not geocode address' });

    // Open-Meteo: free, no API key
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=5`;
    const apiRes = await fetch(url);
    if (!apiRes.ok) return res.json({ ok: false, reason: 'Weather API unavailable' });
    const data = await apiRes.json();

    // WMO weather code → label + emoji-free icon name
    const codeMap = {
      0: ['Clear', 'sun'], 1: ['Mostly clear', 'sun'], 2: ['Partly cloudy', 'cloud-sun'], 3: ['Overcast', 'cloud'],
      45: ['Fog', 'cloud'], 48: ['Fog', 'cloud'],
      51: ['Drizzle', 'rain'], 53: ['Drizzle', 'rain'], 55: ['Drizzle', 'rain'],
      61: ['Rain', 'rain'], 63: ['Rain', 'rain'], 65: ['Heavy rain', 'rain'],
      71: ['Snow', 'snow'], 73: ['Snow', 'snow'], 75: ['Heavy snow', 'snow'],
      80: ['Showers', 'rain'], 81: ['Showers', 'rain'], 82: ['Heavy showers', 'rain'],
      95: ['Thunderstorm', 'storm'], 96: ['Thunderstorm', 'storm'], 99: ['Thunderstorm', 'storm'],
    };

    const days = (data.daily?.time || []).map((date, i) => {
      const code = data.daily.weather_code[i];
      const [label, icon] = codeMap[code] || ['Unknown', 'cloud'];
      const high = Math.round(data.daily.temperature_2m_max[i]);
      const low  = Math.round(data.daily.temperature_2m_min[i]);
      const precip = data.daily.precipitation_probability_max[i] ?? 0;
      const wind = Math.round(data.daily.wind_speed_10m_max[i] || 0);
      const badForWork = code >= 61 || wind > 25; // rain/storm/snow or high wind
      return { date, label, icon, high, low, precip, wind, badForWork };
    });

    res.json({ ok: true, location: address, days });
  } catch (e) { res.json({ ok: false, reason: e.message }); }
});

// ─── ROUTE OPTIMIZATION ─────────────────────────────────────────────────────
// Greedy nearest-neighbor TSP using Google Maps Geocoding cache + Haversine.
// POST /api/schedule/optimize  { events: [{title,location,start,...}] }
// Returns events re-sequenced for minimum total drive distance.
// Also returns total miles and estimated drive time saved vs naive time-order.
const _geocodeCache = new Map();

async function geocodeAddress(address) {
  if (!address || !address.trim()) return null;
  const key = address.trim().toLowerCase();
  if (_geocodeCache.has(key)) return _geocodeCache.get(key);

  // Use OpenStreetMap Nominatim (free, no key required) with graceful fallback
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'User-Agent': 'SPEC-Agent-CRM/1.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    _geocodeCache.set(key, coords);
    return coords;
  } catch (_) {
    return null;
  }
}

function haversineMiles(a, b) {
  if (!a || !b) return 9999;
  const R = 3958.8; // Earth radius in miles
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

app.post('/api/schedule/optimize', requireAuth, async (req, res) => {
  try {
    const { events, startAddress } = req.body || {};
    if (!Array.isArray(events) || events.length < 2) {
      return res.json({ events: events || [], totalMiles: 0, savedMiles: 0, note: 'Not enough stops to optimize' });
    }

    // Geocode everything (origin + all event locations)
    const origin = await geocodeAddress(startAddress || '');
    const geocoded = await Promise.all(events.map(async (e) => ({
      ...e,
      coords: e.location ? await geocodeAddress(e.location) : null,
    })));

    // Compute miles for the ORIGINAL sequence (as delivered — sorted by time)
    const sequenceMiles = (seq) => {
      let total = 0;
      let prev = origin;
      for (const ev of seq) {
        if (ev.coords && prev) total += haversineMiles(prev, ev.coords);
        prev = ev.coords || prev;
      }
      return total;
    };
    const originalMiles = sequenceMiles(geocoded);

    // Greedy nearest-neighbor starting from origin (or first event if no origin)
    const unvisited = geocoded.filter(e => e.coords); // skip events without addresses
    const unplaceable = geocoded.filter(e => !e.coords);
    const optimized = [];
    let cursor = origin || (unvisited[0] && unvisited[0].coords);

    while (unvisited.length) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const d = haversineMiles(cursor, unvisited[i].coords);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      const next = unvisited.splice(bestIdx, 1)[0];
      optimized.push(next);
      cursor = next.coords;
    }

    // Append events we couldn't geocode at the end (preserve original time order)
    optimized.push(...unplaceable);

    const optimizedMiles = sequenceMiles(optimized);
    const savedMiles     = Math.max(0, originalMiles - optimizedMiles);
    // Estimate: 30 mph average urban/suburban = 2 min per mile
    const savedMinutes   = Math.round(savedMiles * 2);

    // Strip internal coords before returning
    const cleaned = optimized.map(({ coords, ...rest }) => rest);
    res.json({
      events: cleaned,
      totalMiles: Math.round(optimizedMiles * 10) / 10,
      originalMiles: Math.round(originalMiles * 10) / 10,
      savedMiles: Math.round(savedMiles * 10) / 10,
      savedMinutes,
      skippedCount: unplaceable.length,
      message: savedMiles > 0
        ? `Saved ~${Math.round(savedMiles * 10) / 10} miles and ~${savedMinutes} min of driving`
        : 'Current sequence is already near-optimal',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── API: INVENTORY / JOB MATERIALS ──────────────────────────────────────────
// Reads the Job Materials tab. Pass ?jobId=JOB-001 to filter to a single job.
app.get('/api/inventory', async (req, res) => {
  try {
    const { jobId } = req.query;
    const rows = await readTab('Job Materials');

    const items = rows
      .filter(r => !jobId || (g(r,'Job ID') || '').toUpperCase() === jobId.toUpperCase())
      .map((r, i) => ({
        _row:       r._row || i + 2,
        jobId:      g(r, 'Job ID'),
        jobRow:     g(r, 'Job Row'),
        clientName: g(r, 'Client Name'),
        category:   g(r, 'Category'),
        item:       g(r, 'Item'),
        quantity:   g(r, 'Quantity'),
        unitCost:   g(r, 'Unit Cost'),
        totalCost:  g(r, 'Total Cost'),
        bestSource: g(r, 'Best Source'),
        updatedAt:  g(r, 'Last Updated'),
      }));

    // Group by job for convenience
    const byJob = {};
    items.forEach(it => {
      const key = it.jobId || 'Unknown';
      if (!byJob[key]) byJob[key] = { jobId: it.jobId, jobRow: it.jobRow, clientName: it.clientName, items: [], updatedAt: it.updatedAt };
      byJob[key].items.push(it);
    });

    res.json({ items, byJob: Object.values(byJob) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: EQUIPMENT ───────────────────────────────────────────────────────────
const dbEquipment = require('./src/services/equipment');

// GET /api/equipment — list all equipment
app.get('/api/equipment', async (req, res) => {
  try {
    const { status } = req.query;
    const items = await dbEquipment.getEquipment(status || null);
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/equipment — create new equipment item
app.post('/api/equipment', async (req, res) => {
  try {
    const item = await dbEquipment.createEquipment(req.body);
    res.json({ ok: true, id: item.id, ...item });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/equipment/:row — update equipment item
app.put('/api/equipment/:row', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.row, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid equipment id' });
    // Map camelCase → snake_case for DB
    const data = {};
    if (req.body.name           !== undefined) data.name          = req.body.name;
    if (req.body.category       !== undefined) data.category      = req.body.category;
    if (req.body.serialNumber   !== undefined) data.serial_number = req.body.serialNumber;
    if (req.body.makeModel      !== undefined) data.serial_number = req.body.makeModel; // legacy alias
    if (req.body.status         !== undefined) data.status        = req.body.status;
    if (req.body.assignedTo     !== undefined) data.assigned_to   = req.body.assignedTo;
    if (req.body.assignedJob    !== undefined) data.assigned_job  = req.body.assignedJob;
    if (req.body.notes          !== undefined) data.notes         = req.body.notes;
    if (req.body.condition      !== undefined) data.condition     = req.body.condition;
    if (req.body.purchaseCost   !== undefined) data.purchase_cost = req.body.purchaseCost;
    if (req.body.value          !== undefined) data.purchase_cost = req.body.value;      // legacy alias
    await dbEquipment.updateEquipment(id, data);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/equipment/:row — soft delete (set status to retired)
app.delete('/api/equipment/:row', async (req, res) => {
  try {
    const id = parseInt(req.params.row, 10);
    await dbEquipment.updateEquipmentStatus(id, 'retired', null, null);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/equipment/:row/assign — assign equipment to a job
app.post('/api/equipment/:row/assign', async (req, res) => {
  try {
    const id = parseInt(req.params.row, 10);
    const { jobId, assignedTo } = req.body;
    await dbEquipment.updateEquipmentStatus(id, 'in-use', assignedTo || null, jobId || null);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/equipment/:row/release — release equipment from job
app.post('/api/equipment/:row/release', async (req, res) => {
  try {
    const id = parseInt(req.params.row, 10);
    await dbEquipment.updateEquipmentStatus(id, 'available', null, null);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

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

    const { readRow } = require('./src/tools/sheets-compat');
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

// ─── QUICKBOOKS INTEGRATION ───────────────────────────────────────────────────
let qb;
try { qb = require('./src/tools/quickbooks'); } catch (_) {}

// Check connection status
app.get('/api/quickbooks/status', async (req, res) => {
  try {
    if (!qb) return res.json({ connected: false, error: 'QuickBooks module not loaded' });
    const status = await qb.getConnectionStatus();
    res.json(status);
  } catch (e) { res.json({ connected: false, error: e.message }); }
});

// Pull outstanding invoices from QuickBooks for dashboard
app.get('/api/quickbooks/invoices', async (req, res) => {
  try {
    if (!qb) return res.json([]);
    const invoices = await qb.getOutstandingInvoices();
    res.json(invoices);
  } catch (e) { res.json([]); }
});

// Pull revenue summary from QuickBooks
app.get('/api/quickbooks/revenue', async (req, res) => {
  try {
    if (!qb) return res.json({ totalRevenue: 0, paymentCount: 0 });
    const summary = await qb.getRevenueSummary(req.query.start, req.query.end);
    res.json(summary);
  } catch (e) { res.json({ totalRevenue: 0, paymentCount: 0 }); }
});

// Push time clock entry to QuickBooks payroll
app.post('/api/quickbooks/time-entry', async (req, res) => {
  try {
    if (!qb) return res.status(400).json({ error: 'QuickBooks not connected' });
    const result = await qb.createTimeActivity(req.body);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Start OAuth flow — redirect to QuickBooks authorization page
app.get('/api/quickbooks/connect', (req, res) => {
  try {
    if (!qb) return res.status(503).send('QuickBooks not configured');
    const baseUrl    = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`);
    const redirectUri = `${baseUrl}/api/quickbooks/callback`;
    const authUrl = qb.buildAuthUrl(redirectUri, 'spec-crm-' + Date.now());
    res.redirect(authUrl);
  } catch (e) { res.status(500).send('OAuth error: ' + e.message); }
});

// OAuth callback — exchange code for tokens and save
app.get('/api/quickbooks/callback', async (req, res) => {
  try {
    const { code, realmId, error } = req.query;
    if (error) return res.send(`<script>window.opener?.postMessage({qbError:'${error}'},'*');window.close()</script>`);
    if (!code || !realmId) return res.status(400).send('Missing code or realmId');

    const baseUrl     = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`);
    const redirectUri = `${baseUrl}/api/quickbooks/callback`;

    const tokens = await qb.exchangeCodeForTokens(code, realmId, redirectUri);
    logger.success('QB', `Connected to QuickBooks: ${tokens.companyName} (${realmId})`);

    // Close popup and notify parent
    res.send(`<!DOCTYPE html><html><body><script>
      if(window.opener){window.opener.postMessage({qbConnected:true,company:'${(tokens.companyName||'').replace(/'/g,"\\'")}'},'*');window.close();}
      else{document.body.innerHTML='<p style="font-family:sans-serif;padding:40px">QuickBooks connected! You can close this window.</p>';}
    </script></body></html>`);
  } catch (e) {
    logger.error('QB', `OAuth callback failed: ${e.message}`);
    res.send(`<script>window.opener?.postMessage({qbError:'${e.message.replace(/'/g,"\\'")}'},'*');window.close()</script>`);
  }
});

// Disconnect QuickBooks
app.post('/api/quickbooks/disconnect', async (req, res) => {
  try {
    const { writeSettings } = require('./src/tools/sheets-compat');
    await writeSettings({ 'QB Access Token': '', 'QB Refresh Token': '', 'QB Realm ID': '', 'QB Token Expiry': '', 'QB Company Name': '' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Manually sync a job's invoices to QB
app.post('/api/jobs/:row/sync-quickbooks', async (req, res) => {
  try {
    if (!qb) return res.status(503).json({ error: 'QuickBooks not configured' });
    const row = parseInt(req.params.row);
    if (isNaN(row) || row < 2) return res.status(400).json({ error: 'Invalid row' });

    const { readRow } = require('./src/tools/sheets-compat');
    const job = await readRow('Jobs', row);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    res.json({ ok: true, message: 'QB sync started' });
    syncJobToQB(job, row).catch(e => logger.error('QB', `Manual sync failed: ${e.message}`));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Sync a job's invoices to QuickBooks (called by agents and manual sync)
async function syncJobToQB(job, row) {
  if (!qb) return;
  try {
    const firstName   = g(job, 'First Name') || '';
    const lastName    = g(job, 'Last Name')  || '';
    const email       = g(job, 'Email')      || '';
    const phone       = g(job, 'Phone Number', 'Phone') || '';
    const address     = g(job, 'Street Address', 'Address') || '';
    const city        = g(job, 'City')  || '';
    const state       = g(job, 'State') || '';
    const zip         = g(job, 'Zip Code', 'Zip') || '';
    const jobId       = g(job, 'Job ID') || `ROW${row}`;
    const projectType = g(job, 'Service Type', 'Project Type') || 'Project';
    const clientName  = `${firstName} ${lastName}`.trim();

    // Find or create QB customer
    const customerId = await qb.findOrCreateCustomer({ firstName, lastName, email, phone, address, city, state, zip });

    // Save QB Customer ID to job row for future reference
    await updateCell('Jobs', row, ['QB Customer ID'], String(customerId)).catch(() => {});

    const results = [];

    // Sync deposit invoice if it exists and no QB invoice ID yet
    const depositAmount = g(job, 'Deposit Amount');
    const depositQbId   = g(job, 'QB Deposit Invoice ID', 'QB Invoice ID');
    if (depositAmount && !depositQbId) {
      const inv = await qb.createInvoice({
        customerId,
        amount:      depositAmount,
        description: `${projectType} — Deposit (${jobId})`,
        jobId,
        invoiceType: 'Deposit',
      });
      await updateCell('Jobs', row, ['QB Deposit Invoice ID'], String(inv.qbInvoiceId)).catch(() => {});
      results.push('Deposit invoice created in QB: #' + inv.invoiceNumber);
      logger.success('QB', `Deposit invoice synced for ${clientName} — QB #${inv.invoiceNumber}`);
    }

    // Sync final invoice if it exists and no QB invoice ID yet
    const totalValue  = g(job, 'Total Job Value', 'Contract Amount', 'Job Value');
    const finalQbId   = g(job, 'QB Final Invoice ID');
    if (totalValue && !finalQbId) {
      const depositNum = parseFloat(String(depositAmount || '0').replace(/[$,]/g, '')) || 0;
      const totalNum   = parseFloat(String(totalValue).replace(/[$,]/g, '')) || 0;
      const finalAmount = depositNum > 0 ? totalNum - depositNum : totalNum;
      if (finalAmount > 0) {
        const inv = await qb.createInvoice({
          customerId,
          amount:      String(finalAmount),
          description: `${projectType} — Final Invoice (${jobId})`,
          jobId,
          invoiceType: 'Final',
        });
        await updateCell('Jobs', row, ['QB Final Invoice ID'], String(inv.qbInvoiceId)).catch(() => {});
        results.push('Final invoice created in QB: #' + inv.invoiceNumber);
        logger.success('QB', `Final invoice synced for ${clientName} — QB #${inv.invoiceNumber}`);
      }
    }

    return results;
  } catch (err) {
    logger.error('QB', `syncJobToQB failed for row ${row}: ${err.message}`);
    throw err;
  }
}

// Handle incoming QB payment notification — find the job and update CRM
async function handleQBPayment(realmId, paymentId) {
  try {
    // Fetch payment details from QB
    const paymentRes = await qb.qbRequest('GET', `/payment/${paymentId}`);
    const payment    = paymentRes.Payment;
    if (!payment) return;

    const amount  = payment.TotalAmt || 0;
    const txnDate = payment.TxnDate  || new Date().toLocaleDateString('en-US');

    // Find which invoice(s) this payment covers
    const linkedInvoiceIds = [];
    (payment.Line || []).forEach(line => {
      (line.LinkedTxn || []).forEach(txn => {
        if (txn.TxnType === 'Invoice') linkedInvoiceIds.push(txn.TxnId);
      });
    });

    if (!linkedInvoiceIds.length) return;

    // Find job rows with matching QB Invoice IDs
    const jobs = await readTab('Jobs');
    for (const qbInvoiceId of linkedInvoiceIds) {
      const jobRow = jobs.find(j =>
        g(j, 'QB Deposit Invoice ID') === qbInvoiceId ||
        g(j, 'QB Final Invoice ID')   === qbInvoiceId
      );
      if (!jobRow) continue;

      const rowNum     = jobs.indexOf(jobRow) + 2;
      const isDeposit  = g(jobRow, 'QB Deposit Invoice ID') === qbInvoiceId;
      const clientName = `${g(jobRow,'First Name','')} ${g(jobRow,'Last Name','')}`.trim();
      const today      = new Date().toLocaleDateString('en-US');

      if (isDeposit) {
        await updateCell('Jobs', rowNum, ['Deposit Paid', 'Deposit Invoice Paid'], 'Yes');
        await updateCell('Jobs', rowNum, ['Deposit Paid Date'], today);
        logger.success('QB', `Deposit marked paid for ${clientName} via QB webhook`);
      } else {
        await updateCell('Jobs', rowNum, ['Final Invoice Paid', 'Final Paid'], 'Yes');
        await updateCell('Jobs', rowNum, ['Final Paid Date', 'Final Invoice Paid Date'], today);
        logger.success('QB', `Final invoice marked paid for ${clientName} via QB webhook`);
      }

      // Notify owner
      const { notifyOwner } = require('./src/tools/notify');
      await notifyOwner({
        subject: '💰 QB Payment Received — ' + clientName,
        message: `QuickBooks just recorded a payment of $${Number(amount).toLocaleString()} from ${clientName}.\n\nType: ${isDeposit ? 'Deposit' : 'Final Invoice'}\nDate: ${txnDate}\n\nCRM has been updated automatically.`,
        urgent: true,
        eventType: 'paymentReceived',
      }).catch(() => {});
    }
  } catch (err) {
    logger.error('QB', `handleQBPayment failed: ${err.message}`);
  }
}

// ─── SGC STANDALONE PAGE ─────────────────────────────────────────────────────
app.get('/sgc', (req, res) => res.sendFile(path.join(__dirname, 'public', 'sgc.html')));

// ─── SGC OPS DASHBOARD ────────────────────────────────────────────────────────
app.get('/sgc-ops', (req, res) => res.sendFile(path.join(__dirname, 'public', 'sgc-ops.html')));

app.get('/api/sgc/ops/subs', async (req, res) => {
  try {
    const agent = require('./src/agents/sgc-admin-agent');
    const [subs] = await Promise.all([agent.sgcReadTab('2025 SubCons')]);
    const mapped = subs.map(s => ({
      _row:        s._row,
      name:        s['Name'] || s['Company Name'] || s['SUB'] || '',
      company:     s['Company'] || s['Company Name'] || '',
      trade:       s['Trade'] || s['Specialty'] || s['TRADE'] || '',
      email:       s['Email'] || s['EMAIL'] || '',
      w9:          s['W9 Received '] || s['W9 Received'] || s['W-9'] || '',
      btOnboarded: s['BT Onboarding'] || s['Buildertrend'] || '',
      needs1099:   s['1099 needed'] || s['1099 Needed'] || '',
      sent1099:    s['1099 Sent'] || '',
      totalPaid:   s['2025 Total'] || s['Total Paid'] || s['2025 Total Paid'] || '',
      notes:       s['NOTES'] || s['Notes'] || '',
    })).filter(s => s.name);
    res.json({ subs: mapped });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── SGC SUB COMPLIANCE CELL UPDATE ──────────────────────────────────────────
app.patch('/api/sgc/ops/subs', async (req, res) => {
  try {
    const { row, field, value } = req.body;
    if (!row || !field) return res.status(400).json({ error: 'row and field required' });
    const agent = require('./src/agents/sgc-admin-agent');
    await agent.sgcUpdateCell('2025 SubCons', row, field, value);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/sgc/ops/insurance', async (req, res) => {
  try {
    const agent = require('./src/agents/sgc-admin-agent');
    const tasks = await agent.sgcReadTab('Insurance Tasks');
    res.json({ tasks });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/sgc/ops/jobs', async (req, res) => {
  try {
    const agent = require('./src/agents/sgc-admin-agent');
    const jobs = await agent.sgcReadTab('SGC');
    const active = jobs.filter(j => (j['Job Status '] || j['Job Status'] || '').trim().toLowerCase() === 'in progress');
    res.json({ jobs: active.map(j => ({ job: j['#'], customer: j['Customer'], status: j['Job Status '] || j['Job Status'], thru: j['Thru'] })) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── SGC FIELD REPORTS GET (Dashboard) ────────────────────────────────────────
app.get('/api/sgc/ops/field-reports', async (req, res) => {
  try {
    const agent = require('./src/agents/sgc-admin-agent');
    const [rows, workerRows] = await Promise.all([
      agent.sgcReadTab('Field Reports'),
      agent.sgcReadTab('SGC Workers').catch(() => []),
    ]);
    const workers = workerRows.map(w => ({
      _row:  w._row,
      name:  w['Name']  || '',
      email: w['Email'] || '',
      phone: w['Phone'] || '',
    })).filter(w => w.name);
    res.json({ reports: rows, workers });
  } catch (e) {
    res.json({ reports: [], workers: [] });
  }
});

// ─── SGC MONDAY MEETING PREP ─────────────────────────────────────────────────
app.get('/api/sgc/ops/meeting', async (req, res) => {
  try {
    const agent = require('./src/agents/sgc-admin-agent');
    const sgcQB = require('./src/tools/sgc-quickbooks');
    const [subs, insuranceTasks] = await Promise.all([
      agent.sgcReadTab('2025 SubCons'),
      agent.sgcReadTab('Insurance Tasks'),
    ]);

    const total     = subs.length;
    const missingW9 = subs.filter(s => !['yes','Yes','YES'].includes((s['W9 Received '] || s['W9 Received'] || '').trim())).length;
    const missingBT = subs.filter(s => !['yes','Yes','YES'].includes((s['BT Onboarding'] || s['Buildertrend'] || '').trim())).length;
    const needs1099 = subs.filter(s => ['yes','Yes','YES'].includes((s['1099 needed'] || s['1099 Needed'] || '').trim())).length;
    const sent1099  = subs.filter(s => ['yes','Yes','YES'].includes((s['1099 Sent'] || '').trim())).length;
    const compliant = subs.filter(s => {
      const w9 = (s['W9 Received '] || s['W9 Received'] || '').trim().toLowerCase();
      const bt = (s['BT Onboarding'] || s['Buildertrend'] || '').trim().toLowerCase();
      return w9 === 'yes' && bt === 'yes';
    }).length;
    const compliance = { total, missingW9, missingBT, needs1099, sent1099, compliant };

    const now = new Date(); now.setHours(0,0,0,0);
    const expirations = { past: [], d30: [], d60: [], d90: [], beyond: [] };
    for (const task of insuranceTasks) {
      const dueRaw = task['Due Date'] || task['Expiration'] || task['Date'] || '';
      if (!dueRaw) continue;
      const due = new Date(dueRaw); if (isNaN(due)) continue;
      due.setHours(0,0,0,0);
      const days = Math.ceil((due - now) / 86400000);
      const item = { task: task['Task'] || task['Item'] || 'Unnamed', due: dueRaw, days, status: task['Status'] || '' };
      if (days < 0)        expirations.past.push(item);
      else if (days <= 30) expirations.d30.push(item);
      else if (days <= 60) expirations.d60.push(item);
      else if (days <= 90) expirations.d90.push(item);
      else                 expirations.beyond.push(item);
    }

    let invoices = null, expenses = null, materials = null, qbError = null;
    if (sgcQB.isConnected()) {
      try {
        const rawInvoices = await sgcQB.listOpenInvoices();
        const today = new Date(); today.setHours(0,0,0,0);
        invoices = rawInvoices.map(inv => {
          const due = inv.dueDate ? new Date(inv.dueDate) : null;
          const daysOverdue = due ? Math.ceil((today - due) / 86400000) : 0;
          let bucket = 'Current';
          if (daysOverdue > 90)      bucket = '90+';
          else if (daysOverdue > 60) bucket = '61–90';
          else if (daysOverdue > 30) bucket = '31–60';
          else if (daysOverdue > 0)  bucket = '1–30';
          return { ...inv, daysOverdue, bucket };
        });

        const expStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        const expEnd   = new Date().toISOString().split('T')[0];
        const expRes   = await sgcQB.qbRequest('GET', `/query?query=select * from Purchase where TxnDate >= '${expStart}' and TxnDate <= '${expEnd}' MAXRESULTS 50`);
        const purchases = expRes.QueryResponse?.Purchase || [];
        expenses = purchases.map(p => ({
          id: p.Id, date: p.TxnDate,
          vendor: p.EntityRef?.name || 'Unknown Vendor',
          amount: p.TotalAmt,
          account: p.AccountRef?.name || '',
          memo: p.PrivateNote || p.Memo || '',
          needsInfo: !p.PrivateNote && !p.Memo,
        }));
        materials = purchases.filter(p => {
          const acct = (p.AccountRef?.name || '').toLowerCase();
          return acct.includes('material') || acct.includes('supply') || acct.includes('supplies') || acct.includes('lumber') || acct.includes('hardware');
        }).map(p => ({
          date: p.TxnDate, vendor: p.EntityRef?.name || 'Unknown',
          amount: p.TotalAmt, memo: p.PrivateNote || p.Memo || '',
        }));
      } catch (qbErr) {
        // sgc-quickbooks sets _forceDisconnected on invalid_grant automatically
        qbError = 'not_connected';
      }
    } else {
      qbError = 'not_connected';
    }

    res.json({ compliance, expirations, invoices, expenses, materials, qbError });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── SGC FIELD REPORT WEBHOOK (Tally → Google Sheet) ─────────────────────────
app.post('/api/sgc/field-report', async (req, res) => {
  try {
    const payload = req.body;
    // Parse Tally webhook format
    const fields  = (payload?.data?.fields || []);
    const get     = (label) => {
      const f = fields.find(f => f.label && f.label.toLowerCase().includes(label.toLowerCase()));
      return f ? (Array.isArray(f.value) ? f.value.join(', ') : String(f.value || '')) : '';
    };

    const report = {
      'Submitted At': new Date().toISOString(),
      'Name':         get('name'),
      'Date':         get('date'),
      'Job Name / Address': get('job'),
      'Work Completed Today': get('work completed'),
      'Issues or Delays': get('issues'),
      'Materials Purchased': get('materials'),
      'Plan for Tomorrow': get('plan'),
      'Admin Follow Up': get('admin') || get('follow up'),
    };

    // Write to Google Sheet "Field Reports" tab
    const SGC_SHEET_ID = process.env.SGC_SHEET_ID;
    if (SGC_SHEET_ID) {
      const { google } = require('googleapis');
      const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
      const sheets = google.sheets({ version: 'v4', auth });

      const headers = Object.keys(report);
      const values  = Object.values(report);

      // Ensure "Field Reports" tab exists with headers
      try {
        const check = await sheets.spreadsheets.values.get({
          spreadsheetId: SGC_SHEET_ID,
          range: 'Field Reports!A1:Z1',
        });
        if (!check.data.values || !check.data.values[0]?.length) {
          // Tab exists but has no headers — write them
          await sheets.spreadsheets.values.update({
            spreadsheetId: SGC_SHEET_ID,
            range: 'Field Reports!A1',
            valueInputOption: 'RAW',
            requestBody: { values: [headers] },
          });
        }
      } catch (_) {
        // Tab doesn't exist — create it, then add headers
        try {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SGC_SHEET_ID,
            requestBody: { requests: [{ addSheet: { properties: { title: 'Field Reports' } } }] },
          });
          await sheets.spreadsheets.values.update({
            spreadsheetId: SGC_SHEET_ID,
            range: 'Field Reports!A1',
            valueInputOption: 'RAW',
            requestBody: { values: [headers] },
          });
        } catch (createErr) {
          logger.warn('SGC-FieldReport', `Tab create failed: ${createErr.message}`);
        }
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId: SGC_SHEET_ID,
        range: 'Field Reports!A1',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [values] },
      });
    }

    logger.info('SGC-FieldReport', `Report received from ${report['Name']} for ${report['Job Name / Address']}`);
    res.json({ ok: true });
  } catch (e) {
    logger.error('SGC-FieldReport', `Webhook error: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ─── SGC QUICKBOOKS OAUTH ─────────────────────────────────────────────────────
app.get('/api/sgc/quickbooks/connect', (req, res) => {
  try {
    const sgcQb = require('./src/tools/sgc-quickbooks');
    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`);
    const redirectUri = `${baseUrl}/api/sgc/quickbooks/callback`;
    res.redirect(sgcQb.getAuthUrl(redirectUri));
  } catch (e) {
    res.status(500).send(`QB connect error: ${e.message}`);
  }
});

app.get('/api/sgc/quickbooks/callback', async (req, res) => {
  try {
    const { code, realmId, error } = req.query;
    if (error) return res.send(`QuickBooks error: ${error}`);
    if (!code || !realmId) return res.status(400).send('Missing code or realmId');
    const sgcQb = require('./src/tools/sgc-quickbooks');
    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`);
    const redirectUri = `${baseUrl}/api/sgc/quickbooks/callback`;
    const tokens = await sgcQb.exchangeCodeForTokens(code, realmId, redirectUri);
    res.send(`<html><body style="font-family:sans-serif;padding:40px;background:#0a0a0a;color:#f0f0f0">
      <h2 style="color:#C9A84C">* QuickBooks Connected!</h2>
      <p>Connected to: <strong>${tokens.companyName || 'Your QB Company'}</strong></p>
      <p style="color:#888">This window will close automatically…</p>
      <script>
        if (window.opener) window.opener.postMessage('qb-connected', '*');
        setTimeout(() => window.close(), 2000);
      </script>
    </body></html>`);
  } catch (e) {
    res.status(500).send(`QB callback error: ${e.message}`);
  }
});

app.get('/api/sgc/quickbooks/status', (req, res) => {
  try {
    const sgcQb = require('./src/tools/sgc-quickbooks');
    res.json({ connected: sgcQb.isConnected(), company: sgcQb.getCompanyName() });
  } catch (e) {
    res.json({ connected: false, error: e.message });
  }
});

// Temporary token export — used once to copy tokens into Railway env vars
app.get('/api/sgc/quickbooks/export-tokens', (req, res) => {
  if (req.query.secret !== (process.env.WEBHOOK_SECRET || '')) return res.status(403).json({ error: 'Forbidden' });
  try {
    const sgcQb = require('./src/tools/sgc-quickbooks');
    res.json(sgcQb.getTokens());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/sgc/quickbooks/disconnect', (req, res) => {
  try {
    const fs   = require('fs');
    const path = require('path');
    const file = path.join(__dirname, 'src/data/sgc-qb-tokens.json');
    if (fs.existsSync(file)) fs.unlinkSync(file);
    res.json({ disconnected: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── SGC FULL ROUTER (workers, CRUD, budget, docs, chat, briefing, etc.) ─────
// Mounts AFTER index.js routes so duplicates resolve to index.js versions,
// but all missing routes (workers, add/delete, budget, docs, chat) are handled here.
try {
  const createSgcRouter = require('./src/routes/sgc-ops');
  app.use(createSgcRouter({ requireAuth, requireOwner, logger, appDir: __dirname }));
} catch (e) {
  logger.warn('SGC', `Could not mount sgc-ops router: ${e.message}`);
}

// ─── SGC OPS SETTINGS ────────────────────────────────────────────────────────
const SGC_SETTINGS_FILE = path.join(__dirname, 'src/data/sgc-ops-settings.json');

function loadSgcSettings() {
  try {
    if (fs.existsSync(SGC_SETTINGS_FILE)) return JSON.parse(fs.readFileSync(SGC_SETTINGS_FILE, 'utf8'));
  } catch (_) {}
  return { reminderTime: '18:00', reminderEnabled: true, ownerEmail: '' };
}

function saveSgcSettings(s) {
  try { fs.writeFileSync(SGC_SETTINGS_FILE, JSON.stringify(s, null, 2)); } catch (_) {}
}

app.get('/api/sgc/ops/settings', (req, res) => res.json(loadSgcSettings()));

app.post('/api/sgc/ops/settings', (req, res) => {
  const current = loadSgcSettings();
  const updated = { ...current, ...req.body };
  saveSgcSettings(updated);
  // Reschedule cron if time or enabled changed
  if (req.body.reminderTime !== undefined || req.body.reminderEnabled !== undefined) {
    scheduleSgcReminder(updated);
  }
  res.json({ ok: true, settings: updated });
});

// ─── SGC FIELD REPORT REMINDER CRON (dynamic) ────────────────────────────────
let _sgcReminderTask = null;

async function runSgcReminder() {
  logger.info('SGC-Cron', 'Running field report reminder…');
  try {
    const agent           = require('./src/agents/sgc-admin-agent');
    const { sendEmail }   = require('./src/tools/gmail');
    const { notifyOwner } = require('./src/tools/notify');
    const settings = loadSgcSettings();
    const rows = await agent.sgcReadTab('Field Reports');
    const todayStr = new Date().toLocaleDateString('en-US');
    const todayReports = rows.filter(r => {
      const sub = r['Submitted At'] || r['Date'] || '';
      return sub && new Date(sub).toLocaleDateString('en-US') === todayStr;
    });
    const submittedNames = todayReports.map(r => (r['Name'] || '').trim().toLowerCase());
    const workerRows = await agent.sgcReadTab('SGC Workers').catch(() => []);
    const workers = workerRows.map(w => ({ name: w['Name']||'', email: w['Email']||'' })).filter(w => w.name);
    const missing  = workers.filter(w => !submittedNames.some(n => n.includes(w.name.toLowerCase())));
    const tallyUrl = process.env.SGC_TALLY_FORM_URL || process.env.SGC_TALLY_URL || 'https://tally.so/r/2EL9Wg';
    const dayName  = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    let sent = 0;
    for (const w of missing) {
      if (!w.email) continue;
      try {
        await sendEmail({
          to: w.email,
          subject: `⏰ Reminder: Please fill out your field report for ${dayName}`,
          body: `Hi ${w.name.split(' ')[0]},\n\nWe haven't received your field report for today yet.\n\nIt only takes 2 minutes:\n${tallyUrl}\n\nThank you!\nScottsdale General Contracting`,
        });
        sent++;
      } catch (e) { logger.warn('SGC-Remind', `Email failed for ${w.name}: ${e.message}`); }
    }
    const ownerEmail = settings.ownerEmail || process.env.SGC_OWNER_EMAIL || '';
    const missingList = missing.length ? missing.map(w => `✗ ${w.name}`).join('\n') : 'None — all submitted!';
    await notifyOwner({
      subject: `📋 SGC Field Report Summary — ${todayStr}`,
      message: `Submitted: ${todayReports.length}\nMissing: ${missing.length}\n\n${missingList}${sent > 0 ? `\n\nReminder emails sent to ${sent} worker(s).` : ''}`,
      urgent: missing.length > 0,
      ownerEmail: ownerEmail || undefined,
      eventType: 'fieldReportReminder',
    });
    logger.success('SGC-Cron', `Done — ${todayReports.length} submitted, ${missing.length} missing, ${sent} emails sent`);
  } catch (e) { logger.error('SGC-Cron', `Reminder failed: ${e.message}`); }
}

function scheduleSgcReminder(settings) {
  try {
    const cron = require('node-cron');
    if (_sgcReminderTask) { _sgcReminderTask.stop(); _sgcReminderTask = null; }
    if (!settings.reminderEnabled) {
      logger.info('SGC-Cron', 'Field report reminder disabled');
      return;
    }
    const [h, m] = (settings.reminderTime || '18:00').split(':').map(Number);
    const expr = `${m} ${h} * * 1-5`; // Mon–Fri at HH:MM Arizona time
    _sgcReminderTask = cron.schedule(expr, runSgcReminder, { timezone: 'America/Phoenix' });
    logger.info('SGC-Cron', `Field report reminder scheduled for ${settings.reminderTime} weekdays (Arizona time)`);
  } catch (e) {
    logger.warn('SGC-Cron', `Could not schedule reminder: ${e.message}`);
  }
}

// Start with saved settings
scheduleSgcReminder(loadSgcSettings());

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

// ─── STARTUP SHEET VALIDATION ─────────────────────────────────────────────────
async function validateSheetSchema() {
  if (!process.env.SHEET_ID) {
    logger.warn('Startup', '!  SHEET_ID not set — skipping schema validation');
    return;
  }
  try {
    const { readTab } = require('./src/tools/sheets-compat');

    const REQUIRED = {
      Leads: ['name', 'email', 'phone', 'leadStatus', 'leadScore'],
      Jobs:  ['title', 'clientName', 'status', 'estimatedValue'],
      Settings: [], // settings is key-value, not columnar — just check it's readable
    };

    let allOk = true;
    for (const [tab, requiredCols] of Object.entries(REQUIRED)) {
      try {
        const rows = await readTab(tab);
        if (rows.length === 0) {
          logger.warn('Startup', `!  "${tab}" tab is empty — add data before using agents`);
          continue;
        }
        // Check headers from first row's keys
        const headers = Object.keys(rows[0]).filter(k => !k.startsWith('_'));
        const missing = requiredCols.filter(c => !headers.includes(c));
        if (missing.length > 0) {
          logger.warn('Startup', `!  "${tab}" tab is missing columns: ${missing.join(', ')}`);
          allOk = false;
        } else if (requiredCols.length > 0) {
          logger.success('Startup', `* "${tab}" tab schema OK`);
        }
      } catch (err) {
        logger.warn('Startup', `!  Could not read "${tab}" tab: ${err.message}`);
        allOk = false;
      }
    }

    if (allOk) logger.success('Startup', '* Sheet schema validation passed');
  } catch (err) {
    logger.warn('Startup', `Sheet validation skipped: ${err.message}`);
  }
}

// ── RECURRING JOBS ────────────────────────────────────────────────────────────
// GET /api/recurring — list all recurring job templates
app.get('/api/recurring', requireAuth, async (req, res) => {
  try {
    const { query: dbQ } = require('./src/db');
    const result = await dbQ(`
      SELECT r.*, c.name AS client_name_lookup
      FROM recurring_jobs r
      LEFT JOIN clients c ON r.client_id = c.id
      WHERE r.company_id = $1 ORDER BY r.next_run ASC
    `, [COMPANY_ID]);
    const items = result.rows.map(r => ({
      row: r.id, id: r.id,
      clientId: r.client_id || null,
      clientName: r.client_name_lookup || r.title || '',
      title: r.title || '',
      serviceType: r.service || '',
      frequency: r.frequency || '',
      nextDate: r.next_run ? new Date(r.next_run).toLocaleDateString() : '',
      price: r.estimated_value ? '$' + Number(r.estimated_value).toLocaleString('en-US', { maximumFractionDigits: 0 }) + '/visit' : '',
      notes: r.template_notes || '',
      status: r.status || 'Active',
      lastRun: r.last_run ? new Date(r.last_run).toLocaleDateString() : ''
    }));
    res.json(items);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/recurring — create a new recurring job
app.post('/api/recurring', requireAuth, async (req, res) => {
  try {
    const { query: dbQ } = require('./src/db');
    const { clientName, serviceType, frequency, nextDate, price, notes } = req.body;
    if (!clientName || !serviceType || !frequency) return res.status(400).json({ error: 'clientName, serviceType, frequency required' });
    await dbQ(
      `INSERT INTO recurring_jobs (company_id, title, service, frequency, next_run, estimated_value, template_notes, status) VALUES ($1,$2,$3,$4,$5,$6,$7,'active')`,
      [COMPANY_ID, clientName, serviceType, frequency, nextDate || null, parseFloat(price) || null, notes || '']
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/recurring/:row — remove a recurring service
app.delete('/api/recurring/:row', requireAuth, async (req, res) => {
  try {
    const { query: dbQ } = require('./src/db');
    const id = parseInt(req.params.row);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    await dbQ('DELETE FROM recurring_jobs WHERE id = $1 AND company_id = $2', [id, COMPANY_ID]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/recurring/:row/run — manually trigger a recurring job (creates a job entry)
app.post('/api/recurring/:row/run', requireAuth, async (req, res) => {
  try {
    const { query: dbQ } = require('./src/db');
    const id = parseInt(req.params.row);
    const rj = await dbQ('SELECT * FROM recurring_jobs WHERE id = $1 AND company_id = $2', [id, COMPANY_ID]);
    if (!rj.rows.length) return res.status(404).json({ error: 'Recurring job not found' });
    const rec = rj.rows[0];

    // Create a new job from the template
    const jobRef = 'JOB-' + Date.now().toString().slice(-5);
    const newJob = await dbQ(
      `INSERT INTO jobs (company_id, job_ref, title, service, status, estimated_value, start_date) VALUES ($1,$2,$3,$4,'active',$5,NOW()) RETURNING id`,
      [COMPANY_ID, jobRef, rec.title, rec.service, rec.estimated_value]
    );

    // Update last run
    await dbQ('UPDATE recurring_jobs SET last_run = NOW(), next_run = next_run + INTERVAL \'1\' || $1 WHERE id = $2',
      [rec.frequency === 'Weekly' ? ' week' : rec.frequency === 'Bi-Weekly' ? ' 2 weeks' : rec.frequency === 'Monthly' ? ' month' : ' 3 months', id]
    ).catch(() => {
      // Fallback: just update last_run
      dbQ('UPDATE recurring_jobs SET last_run = NOW() WHERE id = $1', [id]);
    });

    res.json({ ok: true, jobId: jobRef, newJobId: newJob.rows[0]?.id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── TASKS ─────────────────────────────────────────────────────────────────────

async function getTasks(sheets, ssId) {
  try {
    const r = await sheets.spreadsheets.values.get({ spreadsheetId: ssId, range: 'Tasks!A:J' });
    const rows = (r.data.values || []).slice(1).filter(r => r[0]);
    return rows.map((r, i) => ({
      row:        i + 2,
      title:      r[0] || '',
      assignedTo: r[1] || '',
      dueDate:    r[2] || '',
      priority:   r[3] || 'Normal', // High / Normal / Low
      status:     r[4] || 'Open',   // Open / Complete
      clientName: r[5] || '',
      jobId:      r[6] || '',
      notes:      r[7] || '',
      createdAt:  r[8] || '',
      completedAt:r[9] || '',
    }));
  } catch(_) { return []; }
}

// ─── API: TASKS (PostgreSQL) ─────────────────────────────────────────────────
app.get('/api/tasks', requireAuth, async (req, res) => {
  try { res.json(await dbTasks.getTasks(req.query.status)); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tasks', requireAuth, async (req, res) => {
  try {
    if (!req.body.title) return res.status(400).json({ error: 'title required' });
    const task = await dbTasks.createTask(req.body);
    res.json({ ok: true, task });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tasks/:row/complete', requireAuth, async (req, res) => {
  try {
    await dbTasks.completeTask(parseInt(req.params.row));
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/tasks/:row', requireAuth, async (req, res) => {
  try {
    await dbTasks.deleteTask(parseInt(req.params.row));
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── API: ANALYTICS (PostgreSQL) ─────────────────────────────────────────────
app.get('/api/analytics', async (req, res) => {
  try {
    const { query } = require('./src/db');
    const [leads, jobs, invoices] = await Promise.all([
      dbLeads.getLeads(), dbJobs.getJobs(),
      query(`SELECT * FROM invoices WHERE company_id = $1 AND status = 'paid'`, [1]).then(r => r.rows),
    ]);

    const now = new Date();
    const thisMonth = leads.filter(l => {
      const d = new Date(l.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const totalRevenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);
    const activeJobs = jobs.filter(j => /active|progress/i.test(j.status)).length;
    const completedJobs = jobs.filter(j => /complet/i.test(j.status)).length;
    const converted = leads.filter(l => /convert/i.test(l.status)).length;

    res.json({
      totalLeads: leads.length,
      newLeadsThisMonth: thisMonth,
      convertedLeads: converted,
      conversionRate: leads.length > 0 ? ((converted / leads.length) * 100).toFixed(1) + '%' : '0%',
      activeJobs,
      completedJobs,
      totalRevenue,
      averageJobValue: completedJobs > 0 ? (totalRevenue / completedJobs).toFixed(0) : 0,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN: ONE-TIME SEED ENDPOINT ───────────────────────────────────────────
// Visit /admin/seed in browser to load demo data. Protected by SEED_SECRET env var.
app.get('/admin/seed', async (req, res) => {
  const secret = process.env.SEED_SECRET || 'spec-seed-2024';
  if (req.query.key !== secret) {
    return res.status(403).send('Forbidden — add ?key=YOUR_SEED_SECRET to the URL');
  }
  try {
    const { execSync } = require('child_process');
    execSync('node src/seed.js', { stdio: 'pipe', cwd: __dirname });
    res.send('<h2>* Demo data loaded!</h2><p>Refresh your CRM dashboard to see demo data.</p><a href="/">Go to Dashboard</a>');
  } catch (e) {
    res.status(500).send(`<h2>❌ Seed failed</h2><pre>${e.message}</pre>`);
  }
});

// ─── SGC ADMIN ASSISTANT ─────────────────────────────────────────────────────
app.post('/api/sgc/briefing', async (req, res) => {
  try {
    const { runSGCMorningBriefing } = require('./src/jobs/sgc-briefing');
    const result = await runSGCMorningBriefing();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/sgc/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    const sgcAgent = require('./src/agents/sgc-admin-agent');
    const reply = await sgcAgent.chat(message, history || []);
    res.json({ reply });
  } catch (e) {
    console.error('SGC chat error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── AI CHAT ─────────────────────────────────────────────────────────────────
app.post('/api/chat', requireAuth, async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ error: 'messages array required' });
    }
    const chatAgent = require('./src/agents/chat-agent');
    const settings = await dbSettings.readSettings();
    const reply = await chatAgent.chat(messages, settings.companyName || 'your business');
    res.json({ reply });
  } catch (e) {
    console.error('Chat error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
console.log(`Starting on PORT=${PORT}, SHEET_ID=${process.env.SHEET_ID ? 'set' : 'MISSING'}, GOOGLE_CLIENT_ID=${process.env.GOOGLE_CLIENT_ID ? 'set' : 'MISSING'}, ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING'}`);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`* CRM running on port ${PORT}`);
  // Validate sheet schema in background (non-blocking)
  setTimeout(() => validateSheetSchema(), 3000);
  // Start cron scheduler after server is up
  if (startScheduler) {
    try { startScheduler(); }
    catch (e) { console.warn('Scheduler failed to start:', e.message); }
  }
});
