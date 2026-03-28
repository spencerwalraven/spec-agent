require('dotenv').config();
const express = require('express');
const path    = require('path');
const { google } = require('googleapis');

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
      console.log('✅ Database schema already up to date');
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
        console.log('✅ Demo data loaded');
      }
    } catch (e) {
      console.warn('⚠️  Auto-seed skipped:', e.message);
    }
  })();
} else {
  console.warn('⚠️  DATABASE_URL not set — running without PostgreSQL (Sheets fallback active)');
}

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
        if (entity.name === 'Payment' && entity.operation === 'Create') {
          // A payment was created in QB — find which invoice it covers
          handleQBPayment(notification.realmId, entity.id).catch(e =>
            logger.error('QB', `Payment handler failed: ${e.message}`)
          );
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
  '/sgc',
  '/api/sgc/',
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

    const converted = leads.filter(l => /convert/i.test(l.status)).length;
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

// ─── API: UPDATE JOB STATUS ──────────────────────────────────────────────────
app.post('/api/jobs/:row/status', async (req, res) => {
  try {
    await dbJobs.updateJobStatus(parseInt(req.params.row), req.body.status || '');
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

// ─── API: CLIENTS (PostgreSQL) ───────────────────────────────────────────────
app.get('/api/clients', async (req, res) => {
  try { res.json(await dbClients.getClients()); }
  catch (e) { res.status(500).json({ error: e.message }); }
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

    const hash = crypto.createHmac('sha256', SESS_SECRET).update(password).digest('hex');
    const { query } = require('./src/db');
    await query(
      `UPDATE team SET login_username = $1, login_password_hash = $2, login_role = $3, updated_at = NOW() WHERE id = $4`,
      [username.toLowerCase(), hash, loginRole || 'field', id]
    );
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
        alerts.push({ type:'urgent', priority:'high', icon:'🔥',
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
        alerts.push({ type:'warning', priority:'medium', icon:'📄',
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

app.post('/api/marketing/:row/launch', async (req, res) => {
  try {
    const id = parseInt(req.params.row);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    await dbMarketing.launchCampaign(id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
    res.json(items);
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
    const { notes, measurements, squareFootage, qualityTier } = req.body;

    const updates = {};
    if (notes)         updates.site_visit_notes = notes;
    if (measurements)  updates.site_visit_measurements = measurements;
    if (squareFootage) updates.square_footage = parseInt(squareFootage);
    if (qualityTier)   updates.quality_tier = qualityTier;
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
    const issueNote = `[${timestamp}] ⚠️ ISSUE FLAGGED: ${issue}`;
    const newNotes = job.notes ? `${job.notes}\n${issueNote}` : issueNote;
    await dbJobs.updateJobField(id, 'notes', newNotes);

    const { notifyOwner } = require('./src/tools/notify');
    await notifyOwner({
      subject: `⚠️ Issue Flagged — ${job.clientName || 'Client'} ${job.service || ''}`,
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

    const sheets = app.locals.sheets;
    const ssId   = process.env.SHEET_ID;

    // Look up who sent this — check Leads tab first, then Clients tab
    let senderName  = null;
    let senderType  = null; // 'lead' or 'client'
    let senderRow   = null;
    let senderEmail = null;

    // Normalize phone for comparison (strip to digits only)
    const normalize = p => (p || '').replace(/\D/g, '').slice(-10);
    const fromNorm  = normalize(from);

    // Search Leads
    try {
      const leadRes  = await sheets.spreadsheets.values.get({ spreadsheetId: ssId, range: 'Leads!A:Z' });
      const leadRows = leadRes.data.values || [];
      const header   = leadRows[0] || [];
      const phoneIdx = header.findIndex(h => /phone/i.test(h));
      const nameIdx  = header.findIndex(h => /name/i.test(h));
      const emailIdx = header.findIndex(h => /email/i.test(h));
      for (let i = 1; i < leadRows.length; i++) {
        const row = leadRows[i];
        if (normalize(row[phoneIdx]) === fromNorm) {
          senderName  = row[nameIdx]  || 'Unknown';
          senderEmail = row[emailIdx] || '';
          senderType  = 'lead';
          senderRow   = i + 1;
          break;
        }
      }
    } catch(_) {}

    // Search Clients if not found in leads
    if (!senderName) {
      try {
        const clientRes  = await sheets.spreadsheets.values.get({ spreadsheetId: ssId, range: 'Clients!A:Z' });
        const clientRows = clientRes.data.values || [];
        const header     = clientRows[0] || [];
        const phoneIdx   = header.findIndex(h => /phone/i.test(h));
        const nameIdx    = header.findIndex(h => /name/i.test(h));
        const emailIdx   = header.findIndex(h => /email/i.test(h));
        for (let i = 1; i < clientRows.length; i++) {
          const row = clientRows[i];
          if (normalize(row[phoneIdx]) === fromNorm) {
            senderName  = row[nameIdx]  || 'Unknown';
            senderEmail = row[emailIdx] || '';
            senderType  = 'client';
            senderRow   = i + 1;
            break;
          }
        }
      } catch(_) {}
    }

    // Log to SMS Log tab
    try {
      const timestamp = new Date().toISOString();
      await sheets.spreadsheets.values.append({
        spreadsheetId: ssId,
        range: 'SMS Log!A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[timestamp, 'INBOUND', from, senderName || 'Unknown', body, senderType || 'unknown', '']] }
      });
    } catch(e) {
      // Create header and try again
      try {
        await sheets.spreadsheets.values.update({
          spreadsheetId: ssId, range: 'SMS Log!A1:G1',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['Timestamp', 'Direction', 'Phone', 'Name', 'Message', 'Type', 'Agent Response']] }
        });
        await sheets.spreadsheets.values.append({
          spreadsheetId: ssId, range: 'SMS Log!A:G',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[new Date().toISOString(), 'INBOUND', from, senderName || 'Unknown', body, senderType || 'unknown', '']] }
        });
      } catch(_) {}
    }

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
    const sheets = req.app.locals.sheets;
    const ssId   = req.session.sheetId;
    let rows = [];
    try {
      const r = await sheets.spreadsheets.values.get({ spreadsheetId: ssId, range: 'SMS Log!A:G' });
      rows = (r.data.values || []).slice(1).filter(r => r[0]);
    } catch(_) {}

    const messages = rows.map(r => ({
      timestamp: r[0] || '',
      direction: r[1] || 'OUTBOUND',
      phone:     r[2] || '',
      name:      r[3] || '',
      message:   r[4] || '',
      type:      r[5] || '',
    })).reverse(); // Most recent first

    res.json(messages);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sms/send — send an SMS from the dashboard
app.post('/api/sms/send', requireAuth, async (req, res) => {
  try {
    const { to, message, name } = req.body;
    if (!to || !message) return res.status(400).json({ error: 'to and message required' });

    const sms = require('./src/tools/sms');
    await sms.sendSms(to, message);

    // Log it
    const sheets    = req.app.locals.sheets;
    const ssId      = req.session.sheetId;
    const timestamp = new Date().toISOString();
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: ssId, range: 'SMS Log!A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[timestamp, 'OUTBOUND', to, name || '', message, '', '']] }
      });
    } catch(_) {}

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
        id: job.jobRef, clientName: job.clientName || '', projectType: job.service || 'Remodeling Project',
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
    const jobId  = (req.params.jobId || '').toUpperCase();
    const sheets = app.locals.sheets;
    const ssId   = process.env.SHEET_ID;

    // Find job in Jobs tab
    const jobRes  = await sheets.spreadsheets.values.get({ spreadsheetId: ssId, range: 'Jobs!A:Z' });
    const jobRows = jobRes.data.values || [];
    const header  = jobRows[0] || [];

    const idIdx        = header.findIndex(h => /job.?id/i.test(h));
    const clientIdx    = header.findIndex(h => /client.*name|name.*client/i.test(h));
    const typeIdx      = header.findIndex(h => /project.*type|type.*project|service/i.test(h));
    const statusIdx    = header.findIndex(h => /^status$/i.test(h));
    const depAmtIdx    = header.findIndex(h => /deposit.*amount|amount.*deposit/i.test(h));
    const finalAmtIdx  = header.findIndex(h => /final.*amount|total.*amount|contract.*value/i.test(h));
    const depPaidIdx   = header.findIndex(h => /deposit.*paid|dep.*paid/i.test(h));
    const finalPaidIdx = header.findIndex(h => /final.*paid|invoice.*paid/i.test(h));
    const depLinkIdx   = header.findIndex(h => /deposit.*link|stripe.*deposit/i.test(h));
    const finalLinkIdx = header.findIndex(h => /final.*link|stripe.*final/i.test(h));

    const row = jobRows.slice(1).find(r => (r[idIdx] || '').toUpperCase() === jobId);
    if (!row) return res.status(404).json({ error: 'Job not found' });

    // Get company info from Settings
    let company = { name: 'Your Contractor', phone: '', email: '' };
    try {
      const settingsRes = await sheets.spreadsheets.values.get({ spreadsheetId: ssId, range: 'Settings!A:B' });
      const sRows = settingsRes.data.values || [];
      const setting = (key) => (sRows.find(r => r[0] === key) || [])[1] || '';
      company = {
        name:  setting('Company Name') || 'Your Contractor',
        phone: setting('Phone')        || '',
        email: setting('Email')        || '',
      };
    } catch(_) {}

    res.json({
      jobId,
      clientName:    row[clientIdx]    || '',
      projectType:   row[typeIdx]      || 'Project',
      status:        row[statusIdx]    || '',
      depositAmount: row[depAmtIdx]    || '',
      finalAmount:   row[finalAmtIdx]  || '',
      depositPaid:   row[depPaidIdx]   || '',
      finalPaid:     row[finalPaidIdx] || '',
      depositLink:   row[depLinkIdx]   || '',
      finalLink:     row[finalLinkIdx] || '',
      company,
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
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
    <div class="icon">✅</div>
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
    const row = parseInt(req.params.row);
    if (isNaN(row) || row < 2) return res.status(400).json({ error: 'Invalid row' });
    const { imageData, mimeType = 'image/jpeg', caption = '' } = req.body;
    if (!imageData) return res.status(400).json({ error: 'imageData required' });

    // Read job to get jobId
    const { readRow } = require('./src/tools/sheets-compat');
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
app.put('/api/equipment/:row', async (req, res) => {
  try {
    const id = parseInt(req.params.row, 10);
    // Map camelCase → snake_case for DB
    const data = {};
    if (req.body.name       !== undefined) data.name        = req.body.name;
    if (req.body.category   !== undefined) data.category    = req.body.category;
    if (req.body.makeModel  !== undefined) data.serial_number = req.body.makeModel;
    if (req.body.status     !== undefined) data.status      = req.body.status;
    if (req.body.assignedTo !== undefined) data.assigned_to = req.body.assignedTo;
    if (req.body.assignedJob !== undefined) data.assigned_job = req.body.assignedJob;
    if (req.body.notes      !== undefined) data.notes       = req.body.notes;
    if (req.body.condition  !== undefined) data.condition   = req.body.condition;
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
    const projectType = g(job, 'Service Type', 'Project Type') || 'Remodeling';
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
    logger.warn('Startup', '⚠️  SHEET_ID not set — skipping schema validation');
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
          logger.warn('Startup', `⚠️  "${tab}" tab is empty — add data before using agents`);
          continue;
        }
        // Check headers from first row's keys
        const headers = Object.keys(rows[0]).filter(k => !k.startsWith('_'));
        const missing = requiredCols.filter(c => !headers.includes(c));
        if (missing.length > 0) {
          logger.warn('Startup', `⚠️  "${tab}" tab is missing columns: ${missing.join(', ')}`);
          allOk = false;
        } else if (requiredCols.length > 0) {
          logger.success('Startup', `✅ "${tab}" tab schema OK`);
        }
      } catch (err) {
        logger.warn('Startup', `⚠️  Could not read "${tab}" tab: ${err.message}`);
        allOk = false;
      }
    }

    if (allOk) logger.success('Startup', '✅ Sheet schema validation passed');
  } catch (err) {
    logger.warn('Startup', `Sheet validation skipped: ${err.message}`);
  }
}

// ── RECURRING JOBS ────────────────────────────────────────────────────────────
// GET /api/recurring — list all recurring job templates
app.get('/api/recurring', requireAuth, async (req, res) => {
  try {
    const sheets = req.app.locals.sheets;
    const ssId   = req.session.sheetId;
    let rows = [];
    try {
      const r = await sheets.spreadsheets.values.get({
        spreadsheetId: ssId,
        range: 'Recurring Jobs!A:J'
      });
      rows = (r.data.values || []).slice(1).filter(r => r[0]);
    } catch(e) { /* tab may not exist */ }

    const items = rows.map((r, i) => ({
      row:         i + 2,
      clientName:  r[0] || '',
      address:     r[1] || '',
      serviceType: r[2] || '',
      frequency:   r[3] || '', // Weekly / Bi-Weekly / Monthly / Quarterly
      nextDate:    r[4] || '',
      price:       r[5] || '',
      assignedTo:  r[6] || '',
      notes:       r[7] || '',
      status:      r[8] || 'Active',
      lastRun:     r[9] || ''
    }));
    res.json(items);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/recurring — create a new recurring job
app.post('/api/recurring', requireAuth, async (req, res) => {
  try {
    const sheets = req.app.locals.sheets;
    const ssId   = req.session.sheetId;
    const { clientName, address, serviceType, frequency, nextDate, price, assignedTo, notes } = req.body;
    if (!clientName || !serviceType || !frequency) return res.status(400).json({ error: 'clientName, serviceType, frequency required' });

    const row = [clientName, address||'', serviceType, frequency, nextDate||'', price||'', assignedTo||'', notes||'', 'Active', ''];

    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: ssId, range: 'Recurring Jobs!A:J',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] }
      });
    } catch(e) {
      // Create header first
      await sheets.spreadsheets.values.update({
        spreadsheetId: ssId, range: 'Recurring Jobs!A1:J1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['Client Name','Address','Service Type','Frequency','Next Date','Price','Assigned To','Notes','Status','Last Run']] }
      });
      await sheets.spreadsheets.values.append({
        spreadsheetId: ssId, range: 'Recurring Jobs!A:J',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] }
      });
    }
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/recurring/:row/run — manually trigger a recurring job (creates a job entry)
app.post('/api/recurring/:row/run', requireAuth, async (req, res) => {
  try {
    const sheets = req.app.locals.sheets;
    const ssId   = req.session.sheetId;
    const rowNum = parseInt(req.params.row);

    // Get this recurring job
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId: ssId, range: `Recurring Jobs!A${rowNum}:J${rowNum}`
    });
    const data = (r.data.values || [[]])[0];
    const clientName  = data[0] || '';
    const serviceType = data[2] || '';
    const price       = data[5] || '';
    const assignedTo  = data[6] || '';

    // Create a new job entry
    const jobId    = 'JOB-' + Date.now().toString().slice(-5);
    const today    = new Date().toISOString().split('T')[0];
    const newJobRow = [jobId, clientName, data[1]||'', serviceType, today, '', 'Active', price, '', assignedTo, '', '', '', ''];

    await sheets.spreadsheets.values.append({
      spreadsheetId: ssId, range: 'Jobs!A:N',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [newJobRow] }
    });

    // Update last run date
    await sheets.spreadsheets.values.update({
      spreadsheetId: ssId, range: `Recurring Jobs!J${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[today]] }
    });

    res.json({ ok: true, jobId });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
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
    res.send('<h2>✅ Demo data loaded!</h2><p>Refresh your CRM dashboard to see Summit Remodeling data.</p><a href="/">Go to Dashboard</a>');
  } catch (e) {
    res.status(500).send(`<h2>❌ Seed failed</h2><pre>${e.message}</pre>`);
  }
});

// ─── SGC ADMIN ASSISTANT ─────────────────────────────────────────────────────
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
  console.log(`✅ CRM running on port ${PORT}`);
  // Validate sheet schema in background (non-blocking)
  setTimeout(() => validateSheetSchema(), 3000);
  // Start cron scheduler after server is up
  if (startScheduler) {
    try { startScheduler(); }
    catch (e) { console.warn('Scheduler failed to start:', e.message); }
  }
});
