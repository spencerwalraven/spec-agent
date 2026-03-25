/**
 * Gmail Push Notifications via Google Pub/Sub
 *
 * How it works:
 *   1. We call Gmail watch() → Gmail publishes to a Pub/Sub topic on every new email
 *   2. Pub/Sub pushes to our /webhook/gmail-push endpoint
 *   3. We decode the message, fetch new emails via Gmail history API
 *   4. Route any replies to the orchestrator
 *
 * Gmail watch expires every 7 days — the scheduler renews it daily.
 *
 * One-time Google Cloud setup (do this once per client):
 *   1. Enable Gmail API + Pub/Sub API in GCP console
 *   2. Create a Pub/Sub topic: "spec-crm-gmail"
 *   3. Add publisher role: gmail-api-push@system.gserviceaccount.com → topic
 *   4. Create a Push subscription → https://YOUR_RAILWAY_URL/webhook/gmail-push
 *   5. Call POST /api/setup/gmail-watch to start the watch
 */

require('dotenv').config();
const { google } = require('googleapis');

const TOPIC_NAME = process.env.PUBSUB_TOPIC || 'projects/spec-crm/topics/spec-crm-gmail';

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

/**
 * Start (or renew) Gmail push watch.
 * Call this once to set up, then daily to renew (watch expires every 7 days).
 */
async function startWatch() {
  const gmail = google.gmail({ version: 'v1', auth: getAuth() });
  const res = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName: TOPIC_NAME,
      labelIds: ['INBOX'],
      labelFilterBehavior: 'INCLUDE',
    },
  });
  console.log('[GmailWatch] Watch active until:', new Date(parseInt(res.data.expiration)).toISOString());
  return res.data;
}

/**
 * Stop Gmail watch (call when tearing down).
 */
async function stopWatch() {
  const gmail = google.gmail({ version: 'v1', auth: getAuth() });
  await gmail.users.stop({ userId: 'me' });
  console.log('[GmailWatch] Watch stopped');
}

/**
 * Given a historyId from a Pub/Sub push, fetch all new messages since that point.
 * Returns array of full message objects.
 */
async function getNewMessages(startHistoryId) {
  const gmail = google.gmail({ version: 'v1', auth: getAuth() });

  // List history since the given historyId
  let res;
  try {
    res = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      historyTypes: ['messageAdded'],
      labelId: 'INBOX',
    });
  } catch (err) {
    // historyId expired or too old — not an error we can recover from
    console.warn('[GmailWatch] History not available for historyId', startHistoryId, '—', err.message);
    return [];
  }

  const history = res.data.history || [];
  const messageIds = new Set();
  for (const h of history) {
    for (const m of (h.messagesAdded || [])) {
      messageIds.add(m.message.id);
    }
  }

  if (!messageIds.size) return [];

  // Fetch full message details
  const messages = [];
  for (const id of messageIds) {
    try {
      const msg = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
      messages.push(msg.data);
    } catch (_) {}
  }
  return messages;
}

/**
 * Extract key headers from a Gmail message object.
 */
function parseMessage(msg) {
  const headers = msg.payload?.headers || [];
  const h = k => headers.find(x => x.name.toLowerCase() === k)?.value || '';

  // Check if this is a reply (has In-Reply-To header)
  const inReplyTo = h('in-reply-to');
  const references = h('references');
  const isReply    = !!(inReplyTo || references);

  // Extract body text
  let body = '';
  function extractBody(payload) {
    if (!payload) return;
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      return;
    }
    for (const p of (payload.parts || [])) extractBody(p);
  }
  extractBody(msg.payload);

  return {
    messageId: msg.id,
    threadId:  msg.threadId,
    from:      h('from'),
    to:        h('to'),
    subject:   h('subject'),
    date:      h('date'),
    inReplyTo,
    isReply,
    body,
    // Label check — skip sent/drafts
    labelIds:  msg.labelIds || [],
  };
}

module.exports = { startWatch, stopWatch, getNewMessages, parseMessage };
