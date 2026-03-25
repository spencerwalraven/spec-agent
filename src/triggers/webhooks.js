/**
 * Webhook trigger endpoints — Express router
 *
 * All webhooks respond immediately (200) then process asynchronously
 * so Make.com / Calendly / Gmail don't time out.
 *
 * Mount this in index.js:
 *   app.use('/webhook', require('./src/triggers/webhooks'));
 */

const express = require('express');
const router  = express.Router();
const { route } = require('../agents/orchestrator');
const { logger } = require('../utils/logger');
const { appendRow, getLastRow, findRowByEmail } = require('../tools/sheets');
const { getNewMessages, parseMessage } = require('../tools/gmail-watch');

// Fire-and-forget helper
function fireAndForget(type, payload) {
  route(type, payload).catch(err =>
    logger.error('Webhook', `Unhandled error in ${type}: ${err.message}`)
  );
}

// ─── TALLY FIELD MAPPER ───────────────────────────────────────────────────────
// Maps Tally field labels → Leads sheet column headers (exact labels from your form)
const TALLY_FIELD_MAP = {
  'What is your first name?':                        'First Name',
  'What is your last name?':                         'Last Name',
  'What is the best phone number to reach you?':     'Phone Number',
  'And your email address?':                         'Email',
  'What are you looking to remodel?':                'Service Requested',
  'Tell us about your project':                      'Tell us about your project',
  'When are you hoping to get started?':             'Timeline',
  'What is your approximate budget for this project?': 'Budget',
  'What is your address?':                           'Street Address', // handled specially below
  'How did you hear about us?':                      'How did you hear about us?',
};

function parseTallyPayload(body) {
  // Tally format: { data: { fields: [{ label, type, value, options }] } }
  const fields = body?.data?.fields || body?.fields || [];

  // Debug: log all field labels so we can catch mapping mismatches
  logger.info('Tally', `Fields received: ${fields.map(f => `"${f.label}"`).join(', ')}`);

  const lead = {
    Timestamp: new Date().toLocaleDateString('en-US'),
    Status: 'New',
  };

  for (const field of fields) {
    const label = field.label?.trim() || '';
    const col   = TALLY_FIELD_MAP[label];

    // Address field — Tally sends as object with line1/city/state/zip
    if (label === 'What is your address?' || field.type === 'INPUT_ADDRESS' || field.type === 'ADDRESS') {
      const addr = field.value || {};
      if (addr.line1 || addr.street) lead['Street Address'] = addr.line1 || addr.street || '';
      if (addr.city)                 lead['City']           = addr.city;
      if (addr.state)                lead['State']          = addr.state;
      if (addr.zip || addr.zipCode)  lead['Zip Code']       = addr.zip || addr.zipCode || '';
      continue;
    }

    // Multiple choice / dropdown — Tally sends value as array of UUID strings
    // The options array maps UUID → human-readable text
    if (Array.isArray(field.value)) {
      const opts = field.options || [];
      const text = field.value.map(v => {
        // v could be a UUID string or already an object with .text
        if (typeof v === 'object') return v.text || v.label || JSON.stringify(v);
        const opt = opts.find(o => o.id === v);
        return opt ? opt.text : v; // fall back to raw UUID if no match
      }).join(', ');
      if (col) lead[col] = text;
      continue;
    }

    // Single UUID string (some Tally single-select fields)
    if (typeof field.value === 'string' && field.options?.length) {
      const opt = field.options.find(o => o.id === field.value);
      if (opt && col) { lead[col] = opt.text; continue; }
    }

    // Standard text/number/date
    const value = String(field.value ?? '');
    if (col) lead[col] = value;
  }

  logger.info('Tally', `Parsed lead data: ${JSON.stringify(lead)}`);
  return lead;
}

// ─── NEW LEAD ─────────────────────────────────────────────────────────────────
// Handles both Tally (field data) and direct rowNumber triggers
router.post('/new-lead', async (req, res) => {
  res.status(200).json({ received: true });

  // Direct rowNumber trigger (Make.com, manual)
  const rowNumber = req.body.rowNumber || req.body.row;
  if (rowNumber) {
    logger.info('Webhook', `New lead trigger — row ${rowNumber}`);
    fireAndForget('new_lead', { rowNumber: parseInt(rowNumber) });
    return;
  }

  // Tally submission — write to sheet first, then trigger agent
  try {
    const isTally = req.body?.data?.fields || req.body?.fields || req.body?.eventType === 'FORM_RESPONSE';
    if (!isTally) { logger.warn('Webhook', 'new-lead: no rowNumber and no Tally fields'); return; }

    logger.info('Webhook', 'Tally submission received — writing to Leads sheet…');
    const leadData = parseTallyPayload(req.body);
    logger.info('Webhook', `Parsed lead: ${leadData['First Name']} ${leadData['Last Name']} (${leadData['Email']})`);

    await appendRow('Leads', leadData);
    const newRow = await getLastRow('Leads'); // row number of the row we just added
    logger.success('Webhook', `Lead written to row ${newRow} — firing Lead Agent`);
    fireAndForget('new_lead', { rowNumber: newRow });
  } catch (err) {
    logger.error('Webhook', `Tally handler failed: ${err.message}`);
  }
});

// ─── GMAIL PUSH (Google Pub/Sub) ──────────────────────────────────────────────
// Google pushes here whenever a new email arrives in the inbox.
// Payload: { message: { data: base64({ emailAddress, historyId }), ... } }
router.post('/gmail-push', async (req, res) => {
  res.status(200).send('OK');  // must respond 200 fast or Pub/Sub retries

  try {
    // Decode the Pub/Sub envelope
    const b64 = req.body?.message?.data;
    if (!b64) return;
    const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
    const { historyId, emailAddress } = payload;
    if (!historyId) return;

    logger.info('Webhook', `Gmail push — historyId ${historyId} (${emailAddress})`);

    // Fetch all new messages since this historyId
    const messages = await getNewMessages(historyId);
    if (!messages.length) return;

    for (const msg of messages) {
      const parsed = parseMessage(msg);

      // Skip sent messages (from us), drafts, and non-replies
      if (parsed.labelIds.includes('SENT'))  continue;
      if (parsed.labelIds.includes('DRAFT')) continue;

      // Extract sender email
      const fromEmail = parsed.from?.match(/<(.+)>/)?.[1] || parsed.from;
      if (!fromEmail) continue;

      logger.info('Webhook', `New email from ${fromEmail} — reply: ${parsed.isReply}`);

      // Only route replies (not brand new inbound leads — those come via Tally)
      if (parsed.isReply) {
        fireAndForget('email_reply', {
          from:      parsed.from,
          subject:   parsed.subject,
          threadId:  parsed.threadId,
          messageId: parsed.messageId,
          body:      parsed.body,
        });
      }
    }
  } catch (err) {
    logger.error('Webhook', `Gmail push handler failed: ${err.message}`);
  }
});

// ─── EMAIL REPLY (manual / Make.com fallback) ────────────────────────────────
router.post('/email-reply', (req, res) => {
  res.status(200).json({ received: true });
  let data = req.body;
  if (req.body?.message?.data) {
    try { data = JSON.parse(Buffer.from(req.body.message.data, 'base64').toString()); }
    catch (_) { logger.warn('Webhook', 'Failed to decode message'); return; }
  }
  logger.info('Webhook', `Email reply from ${data.from || 'unknown'}`);
  fireAndForget('email_reply', data);
});

// ─── CALENDLY BOOKING ─────────────────────────────────────────────────────────
router.post('/calendly', async (req, res) => {
  res.status(200).json({ received: true });

  try {
    // Calendly v2 webhook format
    const event     = req.body?.payload || req.body;
    if (!event) return;

    const invitee      = event.invitee      || {};
    const scheduled    = event.scheduled_event || event;
    const inviteeEmail = invitee.email || event.email || '';
    const inviteeName  = invitee.name  || event.name  || '';
    const startTime    = scheduled.start_time || event.start_time || '';
    const meetingType  = scheduled.name || event.event_type_name || 'Consultation';

    logger.info('Webhook', `Calendly booking — ${inviteeName} (${inviteeEmail})`);

    // Try to find the lead row by email so we can pass rowNumber to agent
    let rowNumber = event.rowNumber || event.row || null;
    if (!rowNumber && inviteeEmail) {
      try {
        const lead = await findRowByEmail('Leads', inviteeEmail);
        if (lead?._row) rowNumber = lead._row;
      } catch (_) {}
    }

    fireAndForget('calendly_booking', {
      rowNumber: rowNumber ? parseInt(rowNumber) : null,
      inviteeEmail,
      inviteeName,
      appointmentDate: startTime,
      meetingType,
    });
  } catch (err) {
    logger.error('Webhook', `Calendly handler failed: ${err.message}`);
  }
});

// ─── MANUAL AGENT TRIGGER (dashboard buttons) ─────────────────────────────────
// POST /webhook/trigger { type: 'generate_proposal', rowNumber: 5 }
router.post('/trigger', (req, res) => {
  res.status(200).json({ received: true });
  const { type, ...payload } = req.body;
  if (!type) { return res.status(400).json({ error: 'Missing event type' }); }
  logger.info('Webhook', `Manual trigger: ${type}`, payload);
  fireAndForget(type, payload);
});

// ─── APPROVAL CONFIRMED (from dashboard) ──────────────────────────────────────
// POST /webhook/approved { type: 'proposal'|'contract', rowNumber: 5 }
router.post('/approved', (req, res) => {
  res.status(200).json({ received: true });
  const { type, rowNumber } = req.body;
  if (!type || !rowNumber) { logger.warn('Webhook', 'approved: missing type or rowNumber'); return; }
  // Determine which agent action to fire after approval
  const approvalMap = {
    proposal: 'generate_contract', // proposal approved → generate contract next
    contract: 'notify_subs',       // contract approved → notify subs
  };
  const nextEvent = approvalMap[type];
  if (nextEvent) {
    logger.info('Webhook', `Approval confirmed: ${type} → firing ${nextEvent}`);
    fireAndForget(nextEvent, { rowNumber: parseInt(rowNumber) });
  }
});

module.exports = router;
