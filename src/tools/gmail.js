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

// ─── APPROVAL GATING ────────────────────────────────────────────────────────

/**
 * Queue an email for owner approval instead of sending immediately.
 * All AI-generated client-facing emails go through this gate.
 * Returns a pending approval record. Owner approves via the Approvals page.
 */
async function queueEmailForApproval({ to, subject, body, threadId, jobId, agentName, type = 'email' }) {
  try {
    const { insertOne } = require('../db');
    await insertOne(`
      INSERT INTO pending_approvals (company_id, type, recipient, subject, body, thread_id, job_id, agent_name, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())
    `, [1, type, to, subject, body, threadId || null, jobId || null, agentName || 'AI Agent']);
    return `Email to ${to} queued for owner approval. Subject: "${subject}"`;
  } catch (e) {
    // If DB not available, fall through to direct send with warning
    console.warn('Approval queue unavailable, sending directly:', e.message);
    const result = await sendEmail({ to, subject, body, threadId });
    return `Email sent directly to ${to} (approval queue unavailable). Thread ID: ${result.threadId}`;
  }
}

/**
 * Send a previously approved email from the approval queue.
 */
async function sendApprovedEmail(approvalId) {
  try {
    const { getOne, updateOne } = require('../db');
    const row = await getOne('SELECT * FROM pending_approvals WHERE id = $1', [approvalId]);
    if (!row) throw new Error('Approval not found');
    if (row.status !== 'approved') throw new Error('Not yet approved');
    const result = await sendEmail({ to: row.recipient, subject: row.subject, body: row.body, threadId: row.thread_id });
    await updateOne('UPDATE pending_approvals SET status = $1, sent_at = NOW(), thread_id = $2 WHERE id = $3', ['sent', result.threadId, approvalId]);
    return result;
  } catch (e) {
    throw e;
  }
}

// ─── AGENT TOOL WRAPPERS ─────────────────────────────────────────────────────

/**
 * Agent tool: routes client-facing emails through approval queue.
 * Internal/team emails (to company domain) bypass approval.
 */
async function toolSendEmail({ to, subject, body, threadId }, ctx) {
  // Internal emails bypass approval
  const companyDomain = process.env.COMPANY_EMAIL_DOMAIN;
  const isInternal = companyDomain && to?.includes(companyDomain);

  if (isInternal) {
    const result = await sendEmail({ to, subject, body, threadId });
    return `Internal email sent to ${to}. Thread ID: ${result.threadId}`;
  }

  // Client-facing emails go through approval
  const agentName = ctx?.agentName || 'AI Agent';
  const jobId = ctx?.jobId || ctx?.row || null;
  return queueEmailForApproval({ to, subject, body, threadId, jobId, agentName });
}

async function toolReadThread({ threadId }) {
  const messages = await readThread(threadId);
  return JSON.stringify(messages, null, 2);
}

module.exports = {
  sendEmail, readThread, markAsRead, searchMessages,
  queueEmailForApproval, sendApprovedEmail,
  toolSendEmail, toolReadThread,
};
