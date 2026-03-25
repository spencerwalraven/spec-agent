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
const { appendRow, getLastRow } = require('../tools/sheets');

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
  // Tally format: { data: { fields: [{ label, type, value }] } }
  const fields = body?.data?.fields || body?.fields || [];
  const lead = {
    Timestamp: new Date().toLocaleDateString('en-US'),
    Status: 'New',
  };

  for (const field of fields) {
    const label = field.label || '';
    const col   = TALLY_FIELD_MAP[label];

    // Address field — Tally sends as object with line1/city/state/zip
    if (label === 'What is your address?' || field.type === 'ADDRESS') {
      const addr = field.value || {};
      if (addr.line1 || addr.street) lead['Street Address'] = addr.line1 || addr.street || '';
      if (addr.city)                 lead['City']           = addr.city;
      if (addr.state)                lead['State']          = addr.state;
      if (addr.zip || addr.zipCode)  lead['Zip Code']       = addr.zip || addr.zipCode || '';
      continue;
    }

    // Multiple choice / dropdown — value is array of option objects
    if (Array.isArray(field.value)) {
      const text = field.value.map(v => v.text || v.label || String(v)).join(', ');
      if (col) lead[col] = text;
      continue;
    }

    // Standard text/number
    const value = String(field.value ?? '');
    if (col) lead[col] = value;
  }

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

// ─── EMAIL REPLY (Gmail push notification or Make.com) ────────────────────────
router.post('/email-reply', (req, res) => {
  res.status(200).json({ received: true });

  // Handle Gmail Pub/Sub format
  let data = req.body;
  if (req.body?.message?.data) {
    try { data = JSON.parse(Buffer.from(req.body.message.data, 'base64').toString()); }
    catch (_) { logger.warn('Webhook', 'Failed to decode Pub/Sub message'); return; }
  }

  logger.info('Webhook', `Email reply from ${data.from || 'unknown'}`);
  fireAndForget('email_reply', data);
});

// ─── CALENDLY BOOKING ─────────────────────────────────────────────────────────
router.post('/calendly', (req, res) => {
  res.status(200).json({ received: true });

  const event = req.body?.payload || req.body;
  if (!event) return;

  // Calendly sends invitee info nested under payload.invitee
  const invitee     = event.invitee || event;
  const scheduled   = event.scheduled_event || event;
  const inviteeEmail = invitee.email || '';
  const inviteeName  = invitee.name  || '';

  // Find the row number from Questions or pass it if Make enriches it
  const rowNumber = event.rowNumber || event.row || null;

  logger.info('Webhook', `Calendly booking — ${inviteeName} (${inviteeEmail})`);
  fireAndForget('calendly_booking', {
    rowNumber:       rowNumber ? parseInt(rowNumber) : null,
    inviteeEmail,
    inviteeName,
    appointmentDate: scheduled.start_time || '',
    appointmentTime: '',
    meetingType:     scheduled.name || 'Consultation',
  });
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
