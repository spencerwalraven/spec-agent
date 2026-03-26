/**
 * Lead Agent — handles the full lead lifecycle:
 *   • New lead intake: score, email, update sheet
 *   • Email reply handling: read thread, respond, update status
 *   • Nurture sequence: check which step to send
 *   • Calendly booking: log appointment, notify owner
 *   • Lead conversion: create client record
 */

const { BaseAgent, DEFAULT_MODEL } = require('./base-agent');
const { toolReadLead, toolUpdateLead, toolReadSettings, updateCell, appendRow, readRow, getNextRep } = require('../tools/sheets');
const { toolSendEmail, toolReadThread, sendEmail }                                         = require('../tools/gmail');
const { toolNotifyOwner, toolTextClient }                                                   = require('../tools/notify');
const { logger }                                                                            = require('../utils/logger');

// ─── TOOL DEFINITIONS (Anthropic format) ─────────────────────────────────────

const TOOLS = [
  {
    name:        'read_lead',
    description: 'Read all data for a lead from the Leads tab by row number',
    input_schema: {
      type: 'object',
      properties: {
        rowNumber: { type: 'number', description: 'Row number of the lead (header = row 1)' },
      },
      required: ['rowNumber'],
    },
  },
  {
    name:        'update_lead',
    description: 'Update a single field in the Leads tab for this lead. Use exact column header names from the sheet.',
    input_schema: {
      type: 'object',
      properties: {
        rowNumber: { type: 'number' },
        field:     { type: 'string', description: 'Exact column header name, e.g. "Status", "Lead Score", "Notes"' },
        value:     { type: 'string' },
      },
      required: ['rowNumber', 'field', 'value'],
    },
  },
  {
    name:        'send_email',
    description: 'Send an email to the lead. Use threadId to reply in an existing thread.',
    input_schema: {
      type: 'object',
      properties: {
        to:       { type: 'string' },
        subject:  { type: 'string' },
        body:     { type: 'string', description: 'Plain text email body — no HTML' },
        threadId: { type: 'string', description: 'Optional — Gmail thread ID to reply in' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name:        'read_email_thread',
    description: 'Read the full Gmail thread for context before replying',
    input_schema: {
      type: 'object',
      properties: {
        threadId: { type: 'string' },
      },
      required: ['threadId'],
    },
  },
  {
    name:        'read_settings',
    description: 'Read business settings: company name, owner name, Calendly link, email signature, etc.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name:        'notify_owner',
    description: 'Send an urgent alert email to the business owner. Set urgent=true to also send a text — use for hot leads (score 75+), booked appointments, and conversions.',
    input_schema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        message: { type: 'string' },
        urgent:  { type: 'boolean', description: 'Also send a text message for time-sensitive alerts' },
      },
      required: ['subject', 'message'],
    },
  },
  {
    name:        'text_client',
    description: 'Send a text message directly to a lead or client. Use for appointment confirmations and time-sensitive follow-ups.',
    input_schema: {
      type: 'object',
      properties: {
        phone:   { type: 'string', description: 'Phone number of the recipient' },
        message: { type: 'string', description: 'Text message body (keep under 160 chars)' },
      },
      required: ['phone', 'message'],
    },
  },
];

// ─── TOOL EXECUTORS ───────────────────────────────────────────────────────────

// Track recent email sends to prevent duplicates: "email|date" → timestamp
const recentEmailSends = new Map();
const EMAIL_DEDUP_MS = 4 * 60 * 60 * 1000; // 4 hours

function isDuplicateEmail(to, subject) {
  const key = `${(to || '').toLowerCase()}|${new Date().toLocaleDateString('en-US')}`;
  const lastSent = recentEmailSends.get(key);
  if (lastSent && Date.now() - lastSent < EMAIL_DEDUP_MS) return true;
  recentEmailSends.set(key, Date.now());
  // Clean up old entries to prevent memory leak
  if (recentEmailSends.size > 500) {
    const cutoff = Date.now() - EMAIL_DEDUP_MS;
    for (const [k, v] of recentEmailSends) if (v < cutoff) recentEmailSends.delete(k);
  }
  return false;
}

const EXECUTORS = {
  read_lead:         async (args, ctx) => {
    const result = await toolReadLead(args);
    // Track thread ID in context for later email sends
    try {
      const lead = JSON.parse(result);
      if (lead['Email Thread ID'] || lead['emailThread']) {
        ctx.threadId = lead['Email Thread ID'] || lead['emailThread'];
      }
    } catch (_) {}
    return result;
  },

  update_lead:       async (args, ctx) => {
    const result = await toolUpdateLead(args);
    // If updating email thread, cache in context
    if (['Email Thread ID', 'emailThread'].includes(args.field)) {
      ctx.threadId = args.value;
    }
    return result;
  },

  send_email:        async (args, ctx) => {
    // Deduplicate — skip if we already sent to this address in the last 4 hours
    if (isDuplicateEmail(args.to, args.subject)) {
      logger.warn('LeadAgent', `Skipping duplicate email to ${args.to} — already sent within 4 hours`);
      return `Skipped — email already sent to ${args.to} recently`;
    }
    const { sendEmail: send } = require('../tools/gmail');
    const result = await send({
      to:       args.to,
      subject:  args.subject,
      body:     args.body,
      threadId: args.threadId || ctx.threadId || null,
    });
    // Auto-store thread ID back to sheet + context
    if (result.threadId && ctx.rowNumber) {
      ctx.threadId = result.threadId;
      try {
        await updateCell('Leads', ctx.rowNumber, ['Email Thread ID', 'emailThread'], result.threadId);
        await updateCell('Leads', ctx.rowNumber, ['Last Contact', 'Last Contacted'], new Date().toLocaleDateString('en-US'));
      } catch (_) {}
    }
    return `Email sent to ${args.to}. Thread ID: ${result.threadId}`;
  },

  read_email_thread: async (args) => toolReadThread(args),
  read_settings:     async ()     => toolReadSettings(),
  notify_owner:      async (args) => toolNotifyOwner(args),

  text_client: async (args) => {
    // Sanitize phone number — strip everything except digits, require 10 digits
    let phone = (args.phone || '').replace(/\D/g, '');
    if (phone.length === 11 && phone.startsWith('1')) phone = phone.slice(1); // strip leading 1
    if (phone.length !== 10) {
      logger.warn('LeadAgent', `Skipping SMS — invalid phone number: "${args.phone}"`);
      return `Skipped SMS — phone number "${args.phone}" is not a valid 10-digit US number`;
    }
    // Enforce 160-char SMS limit
    const message = (args.message || '').slice(0, 160);
    return toolTextClient({ ...args, phone: `+1${phone}`, message });
  },
};

// ─── LEAD AGENT CLASS ─────────────────────────────────────────────────────────

class LeadAgent extends BaseAgent {
  constructor() {
    super('LeadAgent', DEFAULT_MODEL, TOOLS, EXECUTORS);
  }

  // ── Handle a brand-new lead ──────────────────────────────────────────────

  async handleNewLead({ rowNumber }) {
    // Get next rep in round-robin rotation BEFORE running the agent
    const rep = await getNextRep();
    const repName      = rep?.name        || null;
    const repCalendly  = rep?.calendlyLink || null;
    const repEmail     = rep?.email        || null;

    // If a rep was assigned, store it in the lead record immediately
    if (repName && rowNumber) {
      try {
        await updateCell('Leads', rowNumber, ['Assigned To', 'Sales Rep', 'Assigned Rep'], repName);
      } catch (_) {} // column may not exist — not critical
    }

    const repBlock = repName
      ? `
ASSIGNED SALES REP (use this for the email — NOT the owner's info):
- Rep Name: ${repName}
- Rep Calendly Link: ${repCalendly || 'use the Calendly link from settings'}
- Sign the email with: ${repName}
`
      : `Sign the email with the owner's name from settings.`;

    const systemPrompt = `
You are an expert sales AI for a home remodeling company. Your job is to qualify new leads and send warm, personal outreach emails.

TASK — in this exact order:
1. Read the business settings (read_settings)
2. Read the lead data (read_lead, row ${rowNumber})
3. Analyze the lead and assign a score:
   - Hot (80–100): clear project, realistic budget, urgent timeline, good location
   - Warm (50–79): interested but vague on budget/timeline or smaller project
   - Cold (0–49): unclear project, very low/no budget, no urgency, or unqualified
4. Update the lead's score field in the sheet
5. Write and send a personalized outreach email:
   - Reference their specific project description by name
   - Feel like it's personally written — warm, conversational, NOT salesy
   - End with a clear call-to-action: book a consultation via the Calendly link below
   - Sign with the assigned rep's name (see below)
6. Update lead status to "Contacted"
7. Update last contact date to today
8. If the score is Hot (≥80), notify the owner immediately

${repBlock}

SMS FOLLOW-UP:
- After sending the email, if the lead has a phone number AND their score is 70 or higher, also use text_client to send a short friendly text (under 160 chars). Example: "Hey [first name]! This is [rep name] from [company] — just sent you an email about your [project type]. Let me know if you have questions! 😊"
- If score is below 70, skip the text — email only.

EMAIL OPENING VARIETY — never start two emails the same way. Rotate through styles like:
- Lead with a project-specific observation: "A ${project type} in [city] — that's one of our favorite projects to work on."
- Reference their timeline or urgency: "Sounds like you're ready to move on this soon..."
- Jump straight to value: "Quick question about your ${project type} — do you already have a design in mind, or are you starting from scratch?"
- Compliment their project scope: "That's a solid budget for a ${project type} — you'll have real options."
- Reference their referral/source: "Glad [source] sent you our way — [source] has great taste."

IMPORTANT:
- Write email in plain text, no markdown, no bullet points, no headers
- Keep emails under 200 words — concise is better
- Use the ASSIGNED REP's Calendly link and name, not the owner's, unless no rep is assigned
- If the lead has no phone number, skip the SMS step entirely — do not send a text
- If the Calendly link is missing from both the rep and settings, ask the lead to call or text directly
    `.trim();

    const userMessage = `New lead arrived at row ${rowNumber}. Score them, send personalized outreach, and update the sheet.`;
    return await this.run(systemPrompt, userMessage, { rowNumber });
  }

  // ── Handle a lead replying to an email ──────────────────────────────────

  async handleEmailReply({ rowNumber, threadId, senderEmail, senderName }) {
    const systemPrompt = `
You are the friendly, knowledgeable assistant for a home remodeling company. A lead just replied to one of your emails.

TASK — in this exact order:
1. Read the business settings (read_settings)
2. Read the lead data (read_lead, row ${rowNumber})
3. Read the full email thread (read_email_thread) — never skip this
4. Understand what they're asking, then respond:
   - Wants to book → send the Calendly link, update status to "Appointment Scheduled"
   - Has a question → answer it naturally, then ask one qualifying question
   - Not interested → thank them warmly, wish them luck, update status to "Dead"
   - Upset or complex → notify the owner immediately instead of replying
5. Update lead status + notes with a quick summary of the exchange

WRITING STYLE — this is critical:
- Sound like a real person, not a corporate bot
- Use a conversational, warm tone — like texting a neighbor
- Start replies in different ways — never always "Hi [Name],"
- Use contractions (I'm, we'd, that's, don't)
- Keep it SHORT — under 150 words. People don't read long emails
- Reference something specific from their message to show you read it
- One clear call to action per email, never multiple asks
- Never say "I hope this email finds you well" or "Please don't hesitate"
- Never mention being an AI

RULES:
- Always read the thread before responding — never reply blind
- Never be pushy or offer discounts without owner approval
- Reply in the same thread using the threadId
    `.trim();

    const userMessage = `
${senderName || 'The lead'} at row ${rowNumber} just replied to an email.
Their email: ${senderEmail}
Thread ID: ${threadId}

Read the thread, understand what they need, and respond like a real person would.
    `.trim();

    return await this.run(systemPrompt, userMessage, { rowNumber, threadId });
  }

  // ── Send a nurture sequence step ─────────────────────────────────────────

  async handleNurtureStep({ rowNumber }) {
    const systemPrompt = `
You are a real person following up with a potential remodeling client who hasn't responded yet. Your job is to stay on their radar without being annoying.

TASK:
1. Read the business settings
2. Read the lead data (row ${rowNumber}) — note their project type, budget, status, and notes
3. STOP immediately if their status is anything other than "New" or "Contacted" — if they've booked, replied, converted, or gone dead, just update the nurture step and return without sending any email
4. Check their current nurture step
5. Send the right follow-up for this step:
   - Step 1: Casual check-in — "just making sure my last email didn't get buried"
   - Step 2: Add genuine value — share a quick tip specific to THEIR project type (kitchen, bath, basement, etc.)
   - Step 3: Soft close — "totally understand if the timing isn't right, just wanted to check in one last time"
   - Step 4+: Mark as Cold, stop outreach, note it in their record — do NOT send any more emails
6. Increment nurture step, update last contact date

WRITING STYLE:
- 3-5 sentences max. Seriously, keep it short
- Sound like a text from a contractor friend, not a sales email
- Reference their specific project — never send a generic message
- No subject line fluff, no "I hope you're doing well" or "I hope this finds you well"
- One ask per email — usually just "would you like to grab 15 minutes?"
    `.trim();

    const userMessage = `Send the next nurture follow-up to the lead at row ${rowNumber}.`;
    return await this.run(systemPrompt, userMessage, { rowNumber });
  }

  // ── Handle a Calendly booking ────────────────────────────────────────────

  async handleCalendlyBooking({ rowNumber, appointmentDate, appointmentTime, meetingType, inviteeName, inviteeEmail }) {
    const systemPrompt = `
You are managing appointment bookings for a home remodeling company.

TASK:
1. Read the lead data (row ${rowNumber})
2. Update their record:
   - Status → "Appointment Scheduled"
   - Appointment Date → the provided date/time
   - Lead Score → "Hot" (they booked — that's a very positive signal)
   - Notes → add a note that they booked via Calendly
3. Send a warm confirmation email to the lead:
   - Confirm the date and time
   - Tell them what to expect (owner will review their project, discuss options)
   - If it's a site visit, ask them to have measurements/photos ready
   - Keep it brief and excited
4. Notify the owner with all details

The meeting is: ${meetingType || 'consultation'}
Date/time: ${appointmentDate} ${appointmentTime || ''}
Lead: ${inviteeName || 'the lead'} (${inviteeEmail || ''})
    `.trim();

    const userMessage = `A lead at row ${rowNumber} just booked an appointment on Calendly. Confirm with them and notify the owner.`;
    return await this.run(systemPrompt, userMessage, { rowNumber });
  }

  // ── Convert lead to client ───────────────────────────────────────────────

  async handleConversion({ rowNumber }) {
    const systemPrompt = `
You are processing a lead conversion for a home remodeling company.

TASK:
1. Read the lead data (row ${rowNumber})
2. Update lead status to "Converted"
3. Create a new client record in the Clients tab by reading the lead data and copying relevant fields
4. Notify the owner that a new client has been added

When creating the client record, include: First Name, Last Name, Email, Phone, Address, City, State, Zip.
    `.trim();

    const userMessage = `Convert the lead at row ${rowNumber} to a client.`;
    return await this.run(systemPrompt, userMessage, { rowNumber });
  }
}

// Singleton
module.exports = new LeadAgent();
