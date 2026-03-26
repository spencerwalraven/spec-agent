/**
 * QuickBooks Online API client
 * Handles OAuth token management, customer sync, invoice creation, and payment sync.
 * Tokens stored in the Settings sheet so they persist across deploys.
 */

require('dotenv').config();
const { logger } = require('../utils/logger');

const QB_ENV     = process.env.QUICKBOOKS_ENVIRONMENT || 'production';
const CLIENT_ID  = process.env.QUICKBOOKS_CLIENT_ID     || '';
const CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET || '';
const WEBHOOK_TOKEN = process.env.QUICKBOOKS_WEBHOOK_TOKEN  || '';

const QB_BASE = QB_ENV === 'sandbox'
  ? 'https://sandbox-quickbooks.api.intuit.com'
  : 'https://quickbooks.api.intuit.com';

const TOKEN_URL  = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const AUTH_URL   = 'https://appcenter.intuit.com/connect/oauth2';
const SCOPE      = 'com.intuit.quickbooks.accounting';

// ─── TOKEN MANAGEMENT ─────────────────────────────────────────────────────────

async function getTokens() {
  try {
    const { readSettings } = require('./sheets');
    const s = await readSettings();
    return {
      accessToken:  s['QB Access Token']  || '',
      refreshToken: s['QB Refresh Token'] || process.env.QUICKBOOKS_REFRESH_TOKEN || '',
      realmId:      s['QB Realm ID']      || process.env.QUICKBOOKS_REALM_ID      || '',
      expiresAt:    s['QB Token Expiry']  || '',
      companyName:  s['QB Company Name']  || '',
    };
  } catch (_) {
    return { accessToken: '', refreshToken: '', realmId: '', expiresAt: '', companyName: '' };
  }
}

async function saveTokens(tokens) {
  try {
    const { writeSettings } = require('./sheets');
    await writeSettings({
      'QB Access Token':  tokens.accessToken  || '',
      'QB Refresh Token': tokens.refreshToken || '',
      'QB Realm ID':      tokens.realmId      || '',
      'QB Token Expiry':  tokens.expiresAt    || '',
      'QB Company Name':  tokens.companyName  || '',
    });
  } catch (err) {
    logger.error('QuickBooks', `Failed to save tokens: ${err.message}`);
  }
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
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const expiresAt = new Date(Date.now() + (data.expires_in - 60) * 1000).toISOString();
  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt,
  };
}

async function getValidToken() {
  const tokens = await getTokens();
  if (!tokens.refreshToken) throw new Error('QuickBooks not connected. Go to Settings → Connect QuickBooks.');
  if (!tokens.realmId)      throw new Error('QuickBooks realm ID missing. Reconnect in Settings.');

  // Refresh if expired or missing
  const expired = !tokens.accessToken || !tokens.expiresAt || new Date(tokens.expiresAt) <= new Date();
  if (expired) {
    logger.info('QuickBooks', 'Access token expired — refreshing…');
    const fresh = await refreshAccessToken(tokens.refreshToken);
    const updated = { ...tokens, ...fresh };
    await saveTokens(updated);
    return { accessToken: updated.accessToken, realmId: updated.realmId };
  }
  return { accessToken: tokens.accessToken, realmId: tokens.realmId };
}

// ─── EXCHANGE CODE FOR TOKENS (after OAuth callback) ─────────────────────────

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
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  const expiresAt = new Date(Date.now() + (data.expires_in - 60) * 1000).toISOString();

  // Fetch company info
  let companyName = '';
  try {
    const info = await qbRequest('GET', '/companyinfo/' + realmId, null, data.access_token, realmId);
    companyName = info.CompanyInfo?.CompanyName || '';
  } catch (_) {}

  const tokens = {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    realmId,
    expiresAt,
    companyName,
  };
  await saveTokens(tokens);
  return tokens;
}

// ─── CORE API REQUEST ──────────────────────────────────────────────────────────

async function qbRequest(method, path, body, accessTokenOverride, realmIdOverride) {
  let accessToken, realmId;
  if (accessTokenOverride) {
    accessToken = accessTokenOverride;
    realmId     = realmIdOverride;
  } else {
    ({ accessToken, realmId } = await getValidToken());
  }

  const base = path.startsWith('/companyinfo') ? QB_BASE : `${QB_BASE}/v3/company/${realmId}`;
  const url  = `${base}${path}${path.includes('?') ? '&' : '?'}minorversion=65`;

  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type':  'application/json',
      'Accept':        'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });

  if (res.status === 401) {
    // Token may have just expired — force refresh once
    const fresh = await refreshAccessToken((await getTokens()).refreshToken);
    await saveTokens({ ...(await getTokens()), ...fresh });
    const retry = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${fresh.accessToken}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!retry.ok) throw new Error(`QB API ${retry.status} after retry`);
    return retry.json();
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`QB API ${res.status}: ${err.slice(0, 300)}`);
  }
  return res.json();
}

// ─── CUSTOMER ─────────────────────────────────────────────────────────────────

async function findOrCreateCustomer({ firstName, lastName, email, phone, address, city, state, zip }) {
  const displayName = `${firstName || ''} ${lastName || ''}`.trim() || email || 'Unknown Client';

  // Search by email first
  if (email) {
    try {
      const query  = `select * from Customer where PrimaryEmailAddr = '${email.replace(/'/g, "\\'")}'`;
      const result = await qbRequest('GET', `/query?query=${encodeURIComponent(query)}`);
      const existing = result.QueryResponse?.Customer?.[0];
      if (existing) {
        logger.info('QuickBooks', `Found existing customer: ${displayName} (ID: ${existing.Id})`);
        return existing.Id;
      }
    } catch (_) {}
  }

  // Create new customer
  const customer = {
    DisplayName:       displayName + (email ? '' : ` - ${Date.now()}`), // QB requires unique DisplayName
    GivenName:         firstName || '',
    FamilyName:        lastName  || '',
    PrimaryEmailAddr:  email ? { Address: email } : undefined,
    PrimaryPhone:      phone ? { FreeFormNumber: phone } : undefined,
    BillAddr: (address || city) ? {
      Line1:      address || '',
      City:       city    || '',
      CountrySubDivisionCode: state || '',
      PostalCode: zip   || '',
      Country:    'US',
    } : undefined,
  };

  const res = await qbRequest('POST', '/customer', { Customer: customer });
  const id  = res.Customer?.Id;
  logger.success('QuickBooks', `Created QB customer: ${displayName} (ID: ${id})`);
  return id;
}

// ─── INVOICE ──────────────────────────────────────────────────────────────────

async function createInvoice({ customerId, amount, description, jobId, dueDate, invoiceType }) {
  const dueDateStr = dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const invoice = {
    CustomerRef: { value: String(customerId) },
    DueDate:     dueDateStr,
    PrivateNote: `SPEC CRM | Job: ${jobId} | Type: ${invoiceType}`,
    Line: [
      {
        Amount:     parseFloat(String(amount).replace(/[$,]/g, '')) || 0,
        DetailType: 'SalesItemLineDetail',
        Description: description || `${invoiceType} Invoice — ${jobId}`,
        SalesItemLineDetail: {
          ItemRef:    { value: '1', name: 'Services' }, // QB default Services item
          Qty:        1,
          UnitPrice:  parseFloat(String(amount).replace(/[$,]/g, '')) || 0,
        },
      },
    ],
  };

  const res = await qbRequest('POST', '/invoice', { Invoice: invoice });
  const qbInvoice = res.Invoice;
  logger.success('QuickBooks', `Created QB invoice #${qbInvoice?.DocNumber} for ${description} (ID: ${qbInvoice?.Id})`);
  return {
    qbInvoiceId:  qbInvoice?.Id,
    invoiceNumber: qbInvoice?.DocNumber,
    invoiceUrl:   `https://app.qbo.intuit.com/app/invoice?txnId=${qbInvoice?.Id}`,
  };
}

async function getInvoice(qbInvoiceId) {
  const res = await qbRequest('GET', `/invoice/${qbInvoiceId}`);
  return res.Invoice;
}

async function markInvoicePaid(qbInvoiceId, customerId, amount, paymentDate) {
  const dateStr = paymentDate || new Date().toISOString().split('T')[0];
  const amountNum = parseFloat(String(amount).replace(/[$,]/g, '')) || 0;

  const payment = {
    CustomerRef: { value: String(customerId) },
    TotalAmt:    amountNum,
    TxnDate:     dateStr,
    Line: [
      {
        Amount: amountNum,
        LinkedTxn: [{ TxnId: String(qbInvoiceId), TxnType: 'Invoice' }],
      },
    ],
  };

  const res = await qbRequest('POST', '/payment', { Payment: payment });
  logger.success('QuickBooks', `Marked QB invoice ${qbInvoiceId} as paid`);
  return res.Payment;
}

// ─── WEBHOOK VERIFICATION ─────────────────────────────────────────────────────

function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!WEBHOOK_TOKEN) return true; // not configured — skip verification
  try {
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', WEBHOOK_TOKEN).update(rawBody).digest('base64');
    return expected === signatureHeader;
  } catch (_) {
    return false;
  }
}

// ─── STATUS CHECK ─────────────────────────────────────────────────────────────

async function getConnectionStatus() {
  try {
    const tokens = await getTokens();
    if (!tokens.refreshToken) return { connected: false };
    // Try a lightweight API call
    await getValidToken(); // refreshes if needed
    return {
      connected:   true,
      companyName: tokens.companyName || 'QuickBooks Company',
      realmId:     tokens.realmId,
      environment: QB_ENV,
    };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

// ─── OAUTH URL BUILDER ────────────────────────────────────────────────────────

function buildAuthUrl(redirectUri, state) {
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    response_type: 'code',
    scope:         SCOPE,
    redirect_uri:  redirectUri,
    state:         state || 'spec-crm',
  });
  return `${AUTH_URL}?${params.toString()}`;
}

module.exports = {
  buildAuthUrl,
  exchangeCodeForTokens,
  findOrCreateCustomer,
  createInvoice,
  getInvoice,
  markInvoicePaid,
  verifyWebhookSignature,
  getConnectionStatus,
  qbRequest,
  getTokens,
};
