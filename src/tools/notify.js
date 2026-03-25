/**
 * Owner notification tool — sends an urgent email alert to the business owner.
 */

const { sendEmail } = require('./gmail');
const { readSettings } = require('./sheets');

/**
 * Send an alert email to the owner.
 */
async function notifyOwner({ subject, message, ownerEmail = null }) {
  // If ownerEmail not passed, read from settings
  if (!ownerEmail) {
    try {
      const settings = await readSettings();
      ownerEmail = settings.ownerEmail || settings.email;
    } catch (_) {}
  }
  if (!ownerEmail) {
    console.warn('[notify] No owner email configured — skipping notification');
    return 'Notification skipped (no owner email configured)';
  }
  await sendEmail({
    to:      ownerEmail,
    subject: `🔔 SPEC CRM Alert: ${subject}`,
    body:    message,
  });
  return `Owner notified at ${ownerEmail}`;
}

// ─── AGENT TOOL WRAPPER ──────────────────────────────────────────────────────

async function toolNotifyOwner({ subject, message }) {
  return await notifyOwner({ subject, message });
}

module.exports = { notifyOwner, toolNotifyOwner };
