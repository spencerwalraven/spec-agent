/**
 * Twilio SMS tool
 * Sends text messages to owners, clients, and subs.
 */

require('dotenv').config();
const { logger } = require('../utils/logger');

function getClient() {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('Twilio credentials not configured');
  const twilio = require('twilio');
  return twilio(sid, token);
}

const FROM = () => process.env.TWILIO_PHONE;

/**
 * Send a text to the owner.
 */
async function textOwner(message) {
  const { readSettings } = require('./sheets');
  const settings = await readSettings();
  const to = settings.phone?.replace(/\D/g, '');
  if (!to) { logger.warn('SMS', 'No owner phone in settings'); return 'No owner phone configured'; }
  return await sendSms(`+1${to}`, message);
}

/**
 * Send a text to a specific number.
 */
async function sendSms(to, message) {
  try {
    const client = getClient();
    const result = await client.messages.create({
      body: message,
      from: FROM(),
      to,
    });
    logger.success('SMS', `Text sent to ${to} — SID: ${result.sid}`);
    return `Text sent to ${to}`;
  } catch (err) {
    logger.error('SMS', `Failed to send text to ${to}: ${err.message}`);
    return `SMS failed: ${err.message}`;
  }
}

// ─── AGENT TOOL WRAPPERS ─────────────────────────────────────────────────────

async function toolTextOwner({ message }) {
  return await textOwner(message);
}

async function toolSendSms({ to, message }) {
  // Normalize number
  const normalized = to.replace(/\D/g, '');
  const e164 = normalized.startsWith('1') ? `+${normalized}` : `+1${normalized}`;
  return await sendSms(e164, message);
}

module.exports = { sendSms, textOwner, toolTextOwner, toolSendSms };
