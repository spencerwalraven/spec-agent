/**
 * Owner notification tool — sends email + optional SMS to the business owner.
 */

const { sendEmail }          = require('./gmail');
const { readSettings }       = require('./sheets');
const { textOwner, sendSms } = require('./sms');

/**
 * Send an alert email to the owner.
 * If urgent=true, also sends a text message.
 */
async function notifyOwner({ subject, message, ownerEmail = null, urgent = false }) {
  const settings = await readSettings().catch(() => ({}));
  if (!ownerEmail) ownerEmail = settings.ownerEmail || settings.email;
  const ownerPhone = settings.phone;

  if (!ownerEmail) {
    console.warn('[notify] No owner email configured — skipping notification');
    return 'Notification skipped (no owner email configured)';
  }

  // Always send email
  await sendEmail({
    to:      ownerEmail,
    subject: `🔔 SPEC CRM Alert: ${subject}`,
    body:    message,
  });

  // Send SMS for urgent alerts
  if (urgent && ownerPhone) {
    try {
      const phone = ownerPhone.replace(/\D/g, '');
      const e164  = phone.startsWith('1') ? `+${phone}` : `+1${phone}`;
      const smsBody = `🔔 SPEC CRM: ${subject}\n\n${message.slice(0, 280)}`;
      await sendSms(e164, smsBody);
    } catch (smsErr) {
      console.warn('[notify] SMS failed (non-fatal):', smsErr.message);
    }
  }

  return `Owner notified at ${ownerEmail}${urgent && ownerPhone ? ' + text sent' : ''}`;
}

/**
 * Send a text directly to a client or sub.
 */
async function textPerson({ to, message }) {
  const phone = (to || '').replace(/\D/g, '');
  if (!phone) return 'No phone number provided';
  const e164 = phone.startsWith('1') ? `+${phone}` : `+1${phone}`;
  return await sendSms(e164, message);
}

// ─── AGENT TOOL WRAPPERS ──────────────────────────────────────────────────────

async function toolNotifyOwner({ subject, message, urgent = false }) {
  return await notifyOwner({ subject, message, urgent });
}

async function toolTextClient({ phone, message }) {
  return await textPerson({ to: phone, message });
}

module.exports = { notifyOwner, textPerson, toolNotifyOwner, toolTextClient };
