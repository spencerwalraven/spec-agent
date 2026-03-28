/**
 * Owner notification tool — sends email + optional SMS to the business owner.
 *
 * Notification preferences (stored in Settings tab):
 *   Notify: <EventName> → "both" | "email" | "sms" | "none"
 *
 * Event names map to eventType param:
 *   newLead, proposalApproved, proposalDeclined, paymentReceived,
 *   kickoffConfirmed, changeOrder, fieldIssue, jobComplete
 */

const { sendEmail }          = require('./gmail');
const { readSettings }       = require('./sheets-compat');
const { textOwner, sendSms } = require('./sms');

// Map camelCase eventType keys to Settings tab label prefixes
const EVENT_LABELS = {
  newLead:          'New Lead',
  proposalApproved: 'Proposal Approved',
  proposalDeclined: 'Proposal Declined',
  paymentReceived:  'Payment Received',
  kickoffConfirmed: 'Kickoff Confirmed',
  changeOrder:      'Change Order',
  fieldIssue:       'Field Issue',
  jobComplete:      'Job Complete',
};

/**
 * Send an alert email/SMS to the owner.
 * @param {string}  subject
 * @param {string}  message
 * @param {string}  [ownerEmail]  - override; reads from settings if omitted
 * @param {boolean} [urgent]      - send SMS in addition to email (default behavior)
 * @param {string}  [eventType]   - if set, checks notification preference from Settings
 */
async function notifyOwner({ subject, message, ownerEmail = null, urgent = false, eventType = null }) {
  const settings = await readSettings().catch(err => {
    console.error('[notify] Failed to read settings:', err.message);
    return {};
  });

  if (!ownerEmail) ownerEmail = settings.ownerEmail || settings.email;
  const ownerPhone = settings.phone;

  if (!ownerEmail) {
    console.warn('[notify] No owner email configured — skipping notification');
    return 'Notification skipped (no owner email configured)';
  }

  // Resolve notification preference for this event type
  let pref = null; // null = use default behavior
  if (eventType && EVENT_LABELS[eventType]) {
    const label = `Notify: ${EVENT_LABELS[eventType]}`;
    pref = (settings.notifyPrefs || {})[label] || null;
  }

  // "none" — suppress entirely
  if (pref === 'none') {
    console.log(`[notify] Suppressed (pref=none) for event: ${eventType}`);
    return 'Notification suppressed by preference';
  }

  const sendSMSOnly  = pref === 'sms';
  const sendBoth     = pref === 'both' || (!pref && urgent);
  const sendEmailOnly = pref === 'email' || (!pref && !urgent);

  // Send SMS if preference is "sms" or "both" (or legacy urgent=true)
  if ((sendSMSOnly || sendBoth) && ownerPhone) {
    try {
      const phone   = ownerPhone.replace(/\D/g, '');
      const e164    = phone.startsWith('1') ? `+${phone}` : `+1${phone}`;
      const smsBody = `🔔 ${subject}\n\n${message.slice(0, 280)}`;
      await sendSms(e164, smsBody);
    } catch (smsErr) {
      console.warn('[notify] SMS failed (non-fatal):', smsErr.message);
    }
    if (sendSMSOnly) return 'Owner notified via SMS';
  }

  // Send email (default, or when pref is "email" or "both")
  if (!sendSMSOnly) {
    try {
      await sendEmail({
        to:      ownerEmail,
        subject: `🔔 CRM Alert: ${subject}`,
        body:    message,
      });
    } catch (emailErr) {
      console.error('[notify] Failed to send owner email:', emailErr.message);
      return `Owner email failed: ${emailErr.message}`;
    }
  }

  return `Owner notified at ${ownerEmail}${sendBoth && ownerPhone ? ' + text sent' : ''}`;
}

/**
 * Send a text directly to a client or sub.
 */
async function textPerson({ to, message }) {
  if (!to || typeof to !== 'string') return 'No valid phone number provided';
  const phone = to.replace(/\D/g, '');
  if (phone.length < 10) return 'Phone number too short';
  const e164 = phone.startsWith('1') ? `+${phone}` : `+1${phone}`;
  try {
    return await sendSms(e164, message);
  } catch (err) {
    console.warn('[notify] SMS to client failed (non-fatal):', err.message);
    return `SMS failed: ${err.message}`;
  }
}

// ─── AGENT TOOL WRAPPERS ──────────────────────────────────────────────────────

async function toolNotifyOwner({ subject, message, urgent = false }) {
  return await notifyOwner({ subject, message, urgent });
}

async function toolTextClient({ phone, message }) {
  return await textPerson({ to: phone, message });
}

module.exports = { notifyOwner, textPerson, toolNotifyOwner, toolTextClient };
