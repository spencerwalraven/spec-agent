/**
 * SGC QuickBooks client
 *
 * Same OAuth flow as the main QB tool but tokens are stored in
 * src/data/sgc-qb-tokens.json so SGC's account stays completely
 * separate from other clients.
 *
 * Env vars needed (shared with main QB app):
 *   QUICKBOOKS_CLIENT_ID
 *   QUICKBOOKS_CLIENT_SECRET
 *   QUICKBOOKS_ENVIRONMENT   (production | sandbox)
 */

require('dotenv').config();
const fs     = require('fs');
const path   = require('path');
const { logger } = require('../utils/logger');

const QB_ENV        = process.env.QUICKBOOKS_ENVIRONMENT || 'production';
const CLIENT_ID     = process.env.QUICKBOOKS_CLIENT_ID     || '';
const CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET || '';

const QB_BASE  = QB_ENV === 'sandbox'
  ? 'https://sandbox-quickbooks.api.intuit.com'
  : 'https://quickbooks.api.intuit.com';

const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const AUTH_URL  = 'https://appcenter.intuit.com/connect/oauth2';
const SCOPE     = 'com.intuit.quickbooks.accounting';

const TOKEN_FILE = path.join(__dirname, '../data/sgc-qb-tokens.json');

// ─── TOKEN STORAGE (local JSON file) ─────────────────────────────────────────

function getTokens() {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return {};
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
  } catch { return {}; }
}

function saveTokens(tokens) {
  try {
    const dir = path.dirname(TOKEN_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  } catch (err) {
    logger.error('SGC-QB', `Failed to save tokens: ${err.message}`);
  }
}

// ─── OAUTH ────────────────────────────────────────────────────────────────────

function getAuthUrl(redirectUri) {
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    response_type: 'code',
    scope:         SCOPE,
    redirect_uri:  redirectUri,
    state:         'sgc',
  });
  return `${AUTH_URL}?${params}`;
}

async function exchangeCodeForTokens(code, realmId, redirectUri) {
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
      'Accept':        'application/json',
    },
    body: `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`,
  });
  if (!res.ok) throw new Error(`QB token exchange failed: ${await res.text()}`);
  const data = await res.json();
  const expiresAt = new Date(Date.now() + (data.expires_in - 60) * 1000).toISOString();
  const tokens = {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    realmId,
    expiresAt,
    companyName:  '',
  };
  // Try to grab company name
  try {
    const info = await qbRequest('GET', '/companyinfo/' + realmId, null, tokens.accessToken, realmId);
    tokens.companyName = info.CompanyInfo?.CompanyName || '';
  } catch (_) {}
  saveTokens(tokens);
  logger.success('SGC-QB', `Connected to QB: ${tokens.companyName} (realm: ${realmId})`);
  return tokens;
}

async function refreshAccessToken(refreshToken) {
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
      'Accept':        'application/json',
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });
  if (!res.ok) throw new Error(`QB token refresh failed: ${await res.text()}`);
  const data = await res.json();
  const expiresAt = new Date(Date.now() + (data.expires_in - 60) * 1000).toISOString();
  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt,
  };
}

async function getValidToken() {
  const tokens = getTokens();
  if (!tokens.refreshToken) throw new Error('QuickBooks not connected. Use the Connect QB button in your SGC assistant.');
  if (!tokens.realmId)      throw new Error('QuickBooks realm ID missing. Reconnect QuickBooks.');
  const expired = !tokens.accessToken || !tokens.expiresAt || new Date(tokens.expiresAt) <= new Date();
  if (expired) {
    logger.info('SGC-QB', 'Access token expired — refreshing…');
    const fresh = await refreshAccessToken(tokens.refreshToken);
    const updated = { ...tokens, ...fresh };
    saveTokens(updated);
    return { accessToken: updated.accessToken, realmId: updated.realmId };
  }
  return { accessToken: tokens.accessToken, realmId: tokens.realmId };
}

function isConnected() {
  const t = getTokens();
  return !!(t.refreshToken && t.realmId);
}

function getCompanyName() {
  return getTokens().companyName || '';
}

// ─── API REQUEST ──────────────────────────────────────────────────────────────

async function qbRequest(method, endpoint, body, accessTokenOverride, realmIdOverride) {
  let accessToken, realmId;
  if (accessTokenOverride) {
    accessToken = accessTokenOverride;
    realmId     = realmIdOverride;
  } else {
    ({ accessToken, realmId } = await getValidToken());
  }

  const url = `${QB_BASE}/v3/company/${realmId}${endpoint}?minorversion=73`;
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept':        'application/json',
      'Content-Type':  'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);

  if (res.status === 401) {
    // Retry once with fresh token
    const tokens = getTokens();
    const fresh  = await refreshAccessToken(tokens.refreshToken);
    saveTokens({ ...tokens, ...fresh });
    opts.headers['Authorization'] = `Bearer ${fresh.accessToken}`;
    const retry = await fetch(url, opts);
    if (!retry.ok) throw new Error(`QB API error ${retry.status}: ${await retry.text()}`);
    return retry.json();
  }
  if (!res.ok) throw new Error(`QB API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────

async function findOrCreateCustomer({ name, email }) {
  if (email) {
    const result = await qbRequest('GET', `/query?query=select * from Customer where PrimaryEmailAddr = '${email.replace(/'/g, "\\'")}'`);
    const existing = result.QueryResponse?.Customer?.[0];
    if (existing) {
      logger.info('SGC-QB', `Found existing customer: ${name} (ID: ${existing.Id})`);
      return existing.Id;
    }
  }
  // Search by name
  const nameResult = await qbRequest('GET', `/query?query=select * from Customer where DisplayName = '${name.replace(/'/g, "\\'")}'`);
  const byName = nameResult.QueryResponse?.Customer?.[0];
  if (byName) {
    logger.info('SGC-QB', `Found customer by name: ${name} (ID: ${byName.Id})`);
    return byName.Id;
  }
  // Create new
  const customer = { DisplayName: name };
  if (email) customer.PrimaryEmailAddr = { Address: email };
  const res = await qbRequest('POST', '/customer', { Customer: customer });
  const id = res.Customer?.Id;
  logger.success('SGC-QB', `Created QB customer: ${name} (ID: ${id})`);
  return id;
}

// ─── INVOICES ─────────────────────────────────────────────────────────────────

async function createInvoice({ customerName, customerEmail, amount, description, dueDate }) {
  const customerId = await findOrCreateCustomer({ name: customerName, email: customerEmail });
  const invoice = {
    CustomerRef: { value: String(customerId) },
    Line: [{
      Amount:          parseFloat(amount),
      DetailType:      'SalesItemLineDetail',
      SalesItemLineDetail: {
        ItemRef:     { value: '1', name: 'Services' },
        UnitPrice:   parseFloat(amount),
        Qty:         1,
      },
      Description: description,
    }],
    PrivateNote: `Created by SGC Admin Assistant`,
  };
  if (dueDate) invoice.DueDate = dueDate;
  const res      = await qbRequest('POST', '/invoice', { Invoice: invoice });
  const qbInv    = res.Invoice;
  const invoiceUrl = `https://app.qbo.intuit.com/app/invoice?txnId=${qbInv?.Id}`;
  logger.success('SGC-QB', `Created invoice #${qbInv?.DocNumber} for ${customerName} — $${amount}`);
  return {
    invoiceNumber: qbInv?.DocNumber,
    invoiceId:     qbInv?.Id,
    customer:      customerName,
    amount,
    description,
    dueDate:       dueDate || 'Net 30',
    viewUrl:       invoiceUrl,
  };
}

async function listOpenInvoices() {
  const res = await qbRequest('GET', `/query?query=select * from Invoice where Balance > '0' ORDERBY DueDate ASC MAXRESULTS 50`);
  const invoices = res.QueryResponse?.Invoice || [];
  return invoices.map(inv => ({
    invoiceNumber: inv.DocNumber,
    invoiceId:     inv.Id,
    customer:      inv.CustomerRef?.name,
    amount:        inv.TotalAmt,
    balance:       inv.Balance,
    dueDate:       inv.DueDate,
    overdue:       inv.DueDate && new Date(inv.DueDate) < new Date(),
  }));
}

async function getInvoiceStatus(invoiceNumber) {
  const res = await qbRequest('GET', `/query?query=select * from Invoice where DocNumber = '${invoiceNumber}'`);
  const inv = res.QueryResponse?.Invoice?.[0];
  if (!inv) return null;
  return {
    invoiceNumber: inv.DocNumber,
    customer:      inv.CustomerRef?.name,
    amount:        inv.TotalAmt,
    balance:       inv.Balance,
    paid:          inv.Balance === 0,
    dueDate:       inv.DueDate,
  };
}

module.exports = {
  getAuthUrl,
  exchangeCodeForTokens,
  isConnected,
  getCompanyName,
  getTokens,
  createInvoice,
  listOpenInvoices,
  getInvoiceStatus,
  findOrCreateCustomer,
};
