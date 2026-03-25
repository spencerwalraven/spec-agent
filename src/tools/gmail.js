/**
 * Gmail tool library — send, read threads, mark read
 */

require('dotenv').config();
const { google } = require('googleapis');

function getGmail() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth });
}

/**
 * Encode a subject line for RFC 2822 — handles emojis and non-ASCII safely.
 */
function encodeSubject(subject) {
  if (/[^\x00-\x7F]/.test(subject)) {
    return `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
  }
  return subject;
}

/**
 * Send an email (plain text).
 * Returns { messageId, threadId }
 */
async function sendEmail({ to, subject, body, threadId = null, replyToMessageId = null }) {
  const gmail = getGmail();

  // Build RFC 2822 message
  const headers = [
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
  ];
  if (threadId && replyToMessageId) {
    headers.push(`In-Reply-To: ${replyToMessageId}`);
    headers.push(`References: ${replyToMessageId}`);
  }
  const raw = Buffer.from(headers.join('\r\n') + '\r\n\r\n' + body)
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const params = {
    userId: 'me',
    requestBody: { raw },
  };
  if (threadId) params.requestBody.threadId = threadId;

  const res = await gmail.users.messages.send(params);
  return { messageId: res.data.id, threadId: res.data.threadId };
}

/**
 * Read all messages in a thread.
 * Returns array of { from, date, body } objects newest-last.
 */
async function readThread(threadId) {
  const gmail   = getGmail();
  const res     = await gmail.users.threads.get({ userId: 'me', id: threadId, format: 'full' });
  const messages = res.data.messages || [];
  return messages.map(msg => {
    const headers = msg.payload?.headers || [];
    const h = k => headers.find(x => x.name.toLowerCase() === k)?.value || '';
    const body = extractBody(msg.payload);
    return {
      messageId: msg.id,
      threadId:  msg.threadId,
      from:      h('from'),
      to:        h('to'),
      subject:   h('subject'),
      date:      h('date'),
      body,
    };
  });
}

/**
 * Mark a message as read.
 */
async function markAsRead(messageId) {
  const gmail = getGmail();
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: { removeLabelIds: ['UNREAD'] },
  });
  return 'Marked as read';
}

/**
 * Search inbox for unread messages matching a query.
 */
async function searchMessages(query, maxResults = 20) {
  const gmail = getGmail();
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults,
  });
  return res.data.messages || [];
}

// ─── HELPER ──────────────────────────────────────────────────────────────────

function extractBody(payload, depth = 0) {
  if (!payload || depth > 10) return '';
  // Prefer text/plain
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    try { return Buffer.from(payload.body.data, 'base64').toString('utf-8'); }
    catch (_) { return ''; }
  }
  // Walk parts
  if (payload.parts) {
    for (const p of payload.parts) {
      const text = extractBody(p);
      if (text) return text;
    }
  }
  // Fallback: any body data
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  return '';
}

// ─── AGENT TOOL WRAPPERS ─────────────────────────────────────────────────────

async function toolSendEmail({ to, subject, body, threadId }) {
  const result = await sendEmail({ to, subject, body, threadId });
  return `Email sent to ${to}. Thread ID: ${result.threadId}`;
}

async function toolReadThread({ threadId }) {
  const messages = await readThread(threadId);
  return JSON.stringify(messages, null, 2);
}

module.exports = {
  sendEmail, readThread, markAsRead, searchMessages,
  toolSendEmail, toolReadThread,
};
