/**
 * SMS Receptionist Agent — handles inbound text messages 24/7.
 *
 * Unlike other agents, this one does NOT use the BaseAgent tool-use loop.
 * Instead it:
 *   1. Does all lookup logic directly (no Claude tools)
 *   2. Runs ONE Claude API call with the full conversation history
 *   3. Returns the reply string
 *
 * Main method: handleInbound({ fromPhone, message }) → reply string
 *
 * Contexts:
 *   new_prospect    — unknown number, treat as a potential new lead
 *   existing_lead   — phone matches a row in the Leads tab
 *   existing_client — phone matches a row in the Jobs tab
 */

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { readTab, updateCell, appendRow, readSettings, g } = require('../tools/sheets');
const { logger } = require('../utils/logger');

const SHEET_ID   = process.env.SHEET_ID;
const SMS_MODEL  = 'claude-3-5-haiku-20241022'; // fast + cheap for SMS
const MAX_THREAD = 20;  // keep last N messages in stored history

// ─── PHONE NORMALIZATION ──────────────────────────────────────────────────────

/**
 * Strip a phone number to 10 digits (US). Returns '' if result isn't 10 digits.
 */
function normalizePhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  // Handle +1 or 1 prefix
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  if (digits.length === 10) return digits;
  return '';
}

/**
 * Return true if two phone strings refer to the same number.
 */
function phonesMatch(a, b) {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  return na && nb && na === nb;
}

// ─── SMS AGENT ────────────────────────────────────────────────────────────────

class SmsAgent {
  constructor() {
    this.client = null;
  }

  getClient() {
    if (!this.client) {
      if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return this.client;
  }

  /**
   * Handle an inbound SMS message and return a reply string.
   *
   * @param {Object} params
   * @param {string} params.fromPhone - Sender's phone number (any format)
   * @param {string} params.message  - Inbound message text
   * @returns {string} Reply text (target ≤160 chars, hard max 320 chars)
   */
  async handleInbound({ fromPhone, message }) {
    // ── 1. Load settings ────────────────────────────────────────────────────
    let settings;
    try {
      settings = await readSettings();
    } catch (err) {
      logger.error('SmsAgent', `Failed to load settings: ${err.message}`);
      return this._fallback(null);
    }

    try {
      // ── 2. Normalize phone ───────────────────────────────────────────────
      const callerDigits = normalizePhone(fromPhone);

      // ── 3. Search Leads tab ──────────────────────────────────────────────
      let leadRecord  = null;
      let clientRecord = null;

      try {
        const leads = await readTab('Leads');
        leadRecord = leads.find(r =>
          phonesMatch(g(r, 'Phone Number', 'Phone'), callerDigits)
        ) || null;
      } catch (err) {
        logger.warn('SmsAgent', `Could not read Leads tab: ${err.message}`);
      }

      // ── 4. Search Jobs tab if no lead found ──────────────────────────────
      if (!leadRecord) {
        try {
          const jobs = await readTab('Jobs');
          clientRecord = jobs.find(r =>
            phonesMatch(g(r, 'Client Phone', 'Phone'), callerDigits)
          ) || null;
        } catch (err) {
          logger.warn('SmsAgent', `Could not read Jobs tab: ${err.message}`);
        }
      }

      // ── 5. Determine context ─────────────────────────────────────────────
      let context;
      let record;
      let recordTab;
      let phoneCol;

      if (clientRecord) {
        context   = 'existing_client';
        record    = clientRecord;
        recordTab = 'Jobs';
        phoneCol  = ['Client Phone', 'Phone'];
      } else if (leadRecord) {
        context   = 'existing_lead';
        record    = leadRecord;
        recordTab = 'Leads';
        phoneCol  = ['Phone Number', 'Phone'];
      } else {
        context   = 'new_prospect';
        record    = null;
        recordTab = 'Leads';
        phoneCol  = ['Phone Number'];
      }

      logger.agent('SmsAgent', `Inbound from ${fromPhone} → context: ${context}`);

      // ── 6. Load SMS conversation history ─────────────────────────────────
      let history = [];
      if (record) {
        const raw = g(record, 'SMS Thread');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) history = parsed;
          } catch (_) {
            logger.warn('SmsAgent', 'Could not parse SMS Thread JSON — starting fresh');
          }
        }
      }

      // ── 7. Build system prompt based on context ──────────────────────────
      const companyInfo = [
        `Company: ${settings.companyName || 'our company'}`,
        `Phone: ${settings.phone || 'our office number'}`,
        `Email: ${settings.email || ''}`,
        `Owner: ${settings.ownerName || ''}`,
        settings.calendlyLink ? `Booking link: ${settings.calendlyLink}` : '',
      ].filter(Boolean).join(' | ');

      let systemPrompt;

      if (context === 'new_prospect') {
        systemPrompt =
          `You are ${settings.companyName || 'the company'}'s AI assistant, responding to a text message inquiry. ` +
          `You're warm, helpful, and professional. ` +
          `Your goal: find out what they need, get their name, and offer to have someone call them or book a free estimate. ` +
          `Keep responses SHORT (1–3 sentences max) — this is SMS, not email. ` +
          `Do NOT ask multiple questions at once. Ask one thing at a time. ` +
          `Collect: name, what they're looking for, rough timeline. ` +
          `Once you have that info, offer to book a free estimate or have the owner call them. ` +
          `Company info: ${companyInfo}`;

      } else if (context === 'existing_lead') {
        const name    = g(record, 'First Name', 'Name', 'Full Name') || 'there';
        const project = g(record, 'Service Requested', 'Project Type', 'Notes') || 'their project';
        const status  = g(record, 'Status') || 'open';
        systemPrompt =
          `You are ${settings.companyName || 'the company'}'s AI assistant following up with ${name} ` +
          `who has inquired about ${project}. ` +
          `Be warm and helpful. Answer questions, provide info, and guide them toward booking a call or estimate. ` +
          `Keep it SHORT — this is SMS. 1–3 sentences max per reply. ` +
          `Lead status: ${status}. ` +
          `Company info: ${companyInfo}`;

      } else {
        // existing_client
        const name         = g(record, 'Client Name', 'First Name', 'Name') || 'there';
        const projectType  = g(record, 'Project Type', 'Job Type', 'Service') || 'project';
        const status       = g(record, 'Status', 'Job Status') || 'in progress';
        const currentPhase = g(record, 'Current Phase', 'Phase') || '';
        systemPrompt =
          `You are ${settings.companyName || 'the company'}'s client services AI for ${name}'s ${projectType} project. ` +
          `Be helpful and reassuring. ` +
          `Project status: ${status}${currentPhase ? `, current phase: ${currentPhase}` : ''}. ` +
          `For urgent issues or emergencies, tell them to call ${settings.phone || 'our office'}. ` +
          `Keep it SHORT — this is SMS. 1–3 sentences max per reply. ` +
          `Company info: ${companyInfo}`;
      }

      // ── 8. Build messages array with full history + new message ──────────
      const messages = [
        ...history,
        { role: 'user', content: message },
      ];

      // ── 9. Call Claude ───────────────────────────────────────────────────
      let reply;
      try {
        const response = await this.getClient().messages.create({
          model:      SMS_MODEL,
          max_tokens: 256,
          system:     systemPrompt,
          messages,
        });
        reply = response.content
          .filter(b => b.type === 'text')
          .map(b => b.text)
          .join('')
          .trim();
      } catch (err) {
        logger.error('SmsAgent', `Claude API error: ${err.message}`);
        return this._fallback(settings);
      }

      // Enforce 320-char hard cap
      if (reply.length > 320) {
        reply = reply.slice(0, 317) + '…';
      }

      logger.success('SmsAgent', `Reply (${reply.length} chars): ${reply.slice(0, 80)}…`);

      // ── 10. Update conversation history ──────────────────────────────────
      const updatedHistory = [
        ...history,
        { role: 'user',      content: message },
        { role: 'assistant', content: reply   },
      ].slice(-MAX_THREAD); // keep last 20 messages

      const threadJson = JSON.stringify(updatedHistory);

      if (record) {
        // Save thread back to existing record
        try {
          await updateCell(recordTab, record._row, ['SMS Thread'], threadJson);
        } catch (err) {
          logger.warn('SmsAgent', `Could not save SMS thread: ${err.message}`);
        }
      } else {
        // ── 11. Create a new lead record if this is a new prospect ─────────
        // We always create a stub — Claude may have gathered name/interest info
        // but we can't easily parse that here without another LLM call.
        // A minimal record is better than nothing; the lead agent will fill it in later.
        try {
          const newLead = {
            Timestamp:         new Date().toISOString(),
            Status:            'New (SMS)',
            'Phone Number':    fromPhone,
            'First Name':      '',
            'Service Requested': '',
            Source:            'SMS',
            'SMS Thread':      threadJson,
          };
          await appendRow('Leads', newLead);
          logger.info('SmsAgent', `New lead record created for ${fromPhone}`);
        } catch (err) {
          logger.warn('SmsAgent', `Could not create lead record: ${err.message}`);
        }
      }

      return reply;

    } catch (err) {
      logger.error('SmsAgent', `Unhandled error: ${err.message}`);
      return this._fallback(settings);
    }
  }

  /**
   * Fallback reply when something goes wrong.
   */
  _fallback(settings) {
    const phone = settings?.phone || '';
    const msg = phone
      ? `Thanks for reaching out! We'll have someone contact you shortly. For immediate help call ${phone}.`
      : `Thanks for reaching out! We'll have someone contact you shortly.`;
    return msg;
  }
}

module.exports = new SmsAgent();
