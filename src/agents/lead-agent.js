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
  text_client:       async (args) => toolTextClient(args),
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

IMPORTANT:
- Write email in plain text, no markdown, no bullet points, no headers
- Keep emails under 200 words — concise is better
- Use the ASSIGNED REP's Calendly link and name, not the owner's, unless no rep is assigned
    `.trim();

    const userMessage = `New lead arrived at row ${rowNumber}. Score them, send personalized outreach, and update the sheet.`;
    return await this.run(systemPrompt, userMessage, { rowNumber });
  }

  // ── Handle a lead replying to an email ──────────────────────────────────

  async handleEmailReply({ rowNumber, threadId, senderEmail, senderName }) {
    const systemPrompt = `
You are an expert sales AI managing conversations for a home remodeling company. A lead has replied to your email.

TASK — in this exact order:
1. Read the business settings (read_settings)
2. Read the lead data (read_lead, row ${rowNumber})
3. Read the full email thread to understand the complete conversation (read_email_thread)
4. Analyze what the lead wants:
   - More info about services/process?
   - A detailed quote or estimate?
   - Want to schedule a consultation?
   - Not interested / objecting?
   - Something complex or emotional (upset, confused, unusual request)?
5. Respond appropriately:
   - If interested in booking: send Calendly link, update status to "Appointment Scheduled"
   - If wants more info: answer clearly, ask a qualifying question
   - If not interested: thank them graciously, wish them well, update status to "Dead"
   - If complex/upset: notify owner instead of replying yourself, explain situation
6. Always update the lead status and add a note summarizing the conversation

IMPORTANT:
- ALWAYS read the thread first — never reply without full context
- Reply in the same thread (use the threadId)
- Write in plain text, warm and professional, under 200 words
- Never be pushy or offer discounts without owner approval
- If the lead has already booked (Calendly confirms), update status to "Appointment Scheduled" and notify owner
    `.trim();

    const userMessage = `
${senderName || 'The lead'} at row ${rowNumber} just replied to an email.
Their email: ${senderEmail}
Thread ID: ${threadId}

Read the thread, understand what they need, and respond appropriately.
    `.trim();

    return await this.run(systemPrompt, userMessage, { rowNumber, threadId });
  }

  // ── Send a nurture sequence step ─────────────────────────────────────────

  async handleNurtureStep({ rowNumber }) {
    const systemPrompt = `
You are a helpful AI for a home remodeling company, following up with a lead who hasn't responded yet.

TASK:
1. Read the business settings
2. Read the lead data (row ${rowNumber})
3. Check their current nurture step (Nurture Step or Nurture Day field)
4. Compose and send the appropriate follow-up based on which step this is:
   - Step 1 (3 days): "Did you get my message?" — friendly check-in
   - Step 2 (7 days): share a helpful tip or insight about their project type
   - Step 3 (14 days): soft close — "still interested? If not, no worries!"
   - Step 4+: mark as Cold, update notes
5. Increment the nurture step in the sheet
6. Update last contact date

Keep emails SHORT (under 150 words), casual, human.
Never beg or pressure. If they haven't responded by step 4, let them go gracefully.
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
