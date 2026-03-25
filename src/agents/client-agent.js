/**
 * Client Agent — handles active job + post-job client relations:
 *   • Weekly progress updates
 *   • Client message handling
 *   • Mid-job satisfaction check
 *   • Deposit + final invoice generation
 *   • Invoice follow-up
 *   • Job completion + customer profile
 *   • Review follow-up sequence
 *   • 30-day check-in
 */

const { BaseAgent, DEFAULT_MODEL } = require('./base-agent');
const { toolReadJob, toolUpdateJob, toolReadClient, toolUpdateClient, toolReadSettings, readRow, updateCell } = require('../tools/sheets');
const { toolSendEmail, toolReadThread } = require('../tools/gmail');
const { toolCreateDoc }                 = require('../tools/docs');
const { toolNotifyOwner, toolTextClient } = require('../tools/notify');

// ─── TOOL DEFINITIONS ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'read_job',
    description: 'Read job data by row number',
    input_schema: { type: 'object', properties: { rowNumber: { type: 'number' } }, required: ['rowNumber'] },
  },
  {
    name: 'update_job',
    description: 'Update a job field by column header',
    input_schema: {
      type: 'object',
      properties: { rowNumber: { type: 'number' }, field: { type: 'string' }, value: { type: 'string' } },
      required: ['rowNumber', 'field', 'value'],
    },
  },
  {
    name: 'read_client',
    description: 'Read client data by row number from Clients tab',
    input_schema: { type: 'object', properties: { rowNumber: { type: 'number' } }, required: ['rowNumber'] },
  },
  {
    name: 'update_client',
    description: 'Update a client field',
    input_schema: {
      type: 'object',
      properties: { rowNumber: { type: 'number' }, field: { type: 'string' }, value: { type: 'string' } },
      required: ['rowNumber', 'field', 'value'],
    },
  },
  {
    name: 'send_email',
    description: 'Send or reply to an email',
    input_schema: {
      type: 'object',
      properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' }, threadId: { type: 'string' } },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'read_email_thread',
    description: 'Read a Gmail thread',
    input_schema: { type: 'object', properties: { threadId: { type: 'string' } }, required: ['threadId'] },
  },
  {
    name: 'create_document',
    description: 'Create a Google Doc — use for invoices',
    input_schema: {
      type: 'object',
      properties: { title: { type: 'string' }, body: { type: 'string' } },
      required: ['title', 'body'],
    },
  },
  {
    name: 'read_settings',
    description: 'Read business settings',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'notify_owner',
    description: 'Send urgent alert to owner. Set urgent=true to also send a text — use for contract signings, job completions, overdue invoices.',
    input_schema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        message: { type: 'string' },
        urgent:  { type: 'boolean', description: 'Also send a text for time-sensitive alerts' },
      },
      required: ['subject', 'message'],
    },
  },
  {
    name: 'text_client',
    description: 'Send a text message to a client. Use for appointment reminders, job start notifications, and invoice alerts.',
    input_schema: {
      type: 'object',
      properties: {
        phone:   { type: 'string', description: 'Client phone number' },
        message: { type: 'string', description: 'Text message (keep under 160 chars)' },
      },
      required: ['phone', 'message'],
    },
  },
];

const EXECUTORS = {
  read_job:          async (args)      => toolReadJob(args),
  update_job:        async (args)      => toolUpdateJob(args),
  read_client:       async (args)      => toolReadClient(args),
  update_client:     async (args)      => toolUpdateClient(args),
  send_email:        async (args, ctx) => {
    const { sendEmail } = require('../tools/gmail');
    const result = await sendEmail({
      to: args.to, subject: args.subject, body: args.body,
      threadId: args.threadId || ctx.threadId || null,
    });
    if (result.threadId && ctx.rowNumber) {
      ctx.threadId = result.threadId;
      try { await updateCell('Jobs', ctx.rowNumber, ['Client Email Thread', 'Email Thread ID'], result.threadId); } catch (_) {}
    }
    return `Email sent to ${args.to}. Thread: ${result.threadId}`;
  },
  read_email_thread: async (args)      => toolReadThread(args),
  create_document:   async (args)      => toolCreateDoc(args),
  read_settings:     async ()          => toolReadSettings(),
  notify_owner:      async (args)      => toolNotifyOwner(args),
  text_client:       async (args)      => toolTextClient(args),
};

// ─── CLIENT AGENT ─────────────────────────────────────────────────────────────

class ClientAgent extends BaseAgent {
  constructor() {
    super('ClientAgent', DEFAULT_MODEL, TOOLS, EXECUTORS);
  }

  async sendWeeklyUpdate({ rowNumber }) {
    const prompt = `
You manage client relations for a home remodeling company.

TASK:
1. Read settings and job data (row ${rowNumber})
2. Review the phases status and overall job progress
3. Write a warm, informative weekly progress update email to the client:
   - What was accomplished this week
   - What's coming up next
   - Any items they need to be aware of (upcoming decisions, access needed, etc.)
   - Keep it positive and professional
4. Update "Last Progress Update" to today's date
5. Add a brief note in Job Notes about the update sent
    `.trim();

    return await this.run(prompt, `Send weekly update for job row ${rowNumber}.`, { rowNumber });
  }

  async handleClientMessage({ rowNumber, threadId }) {
    const prompt = `
You handle client communications for an active home remodeling job.

TASK:
1. Read settings and job data
2. Read the email thread for full context
3. Understand what the client is asking or saying:
   - Question about the project? Answer clearly.
   - Concern or complaint? Acknowledge, empathize, offer solution or escalate to owner.
   - Change request? Acknowledge, let them know a change order will be required, notify owner.
   - Scheduling question? Answer based on job data or notify owner.
   - Compliment/positive? Thank them warmly.
4. Respond appropriately
5. Update job notes

If there's a complaint or change request, always notify the owner.
Row: ${rowNumber} | Thread: ${threadId}
    `.trim();

    return await this.run(prompt, `Handle client message for job row ${rowNumber}.`, { rowNumber, threadId });
  }

  async midJobSatisfactionCheck({ rowNumber }) {
    const prompt = `
You do mid-job satisfaction checks for a home remodeling company.

TASK:
1. Read settings and job data
2. Send a brief satisfaction check email:
   - Ask how they're feeling about the project so far (1–5 stars or just their thoughts)
   - Let them know their feedback matters
   - Remind them who to reach out to if anything comes up
3. Update a notes field with "Satisfaction check sent: [date]"
    `.trim();

    return await this.run(prompt, `Mid-job satisfaction check for row ${rowNumber}.`, { rowNumber });
  }

  async generateDepositInvoice({ rowNumber }) {
    const prompt = `
You generate invoices for a home remodeling company.

TASK:
1. Read settings and job data
2. Calculate deposit amount (typically 30% of Total Job Value)
3. Create a professional invoice Google Doc:
   - Invoice number (use Job ID + "-DEP")
   - Bill to: client name and address
   - Date, due date (7 days from now)
   - Line item: "Project Deposit — [Service Type]" with amount
   - Payment instructions (check payable to company name or payment link if available)
   - Footer with company contact info
4. Save URL to "Deposit Invoice Link"
5. Send email to client with invoice attached (include the link)
6. Update "Deposit Invoice Sent" to "Yes"
7. Notify owner
    `.trim();

    return await this.run(prompt, `Generate deposit invoice for job row ${rowNumber}.`, { rowNumber });
  }

  async generateFinalInvoice({ rowNumber }) {
    const prompt = `
You generate final invoices for a completed home remodeling job.

TASK:
1. Read settings and job data
2. Calculate final balance (Total Job Value minus any deposits paid)
3. Create a professional final invoice Google Doc:
   - Invoice number (use Job ID + "-FINAL")
   - Summary of all work completed
   - Previous payments received
   - Final balance due
   - Due on receipt
4. Save URL to "Final Invoice Link"
5. Send to client with a warm "project complete" message
6. Update "Final Invoice Sent" to "Yes"
7. Notify owner
    `.trim();

    return await this.run(prompt, `Generate final invoice for job row ${rowNumber}.`, { rowNumber });
  }

  async handleJobCompletion({ rowNumber }) {
    const prompt = `
You handle job completions for a home remodeling company.

TASK:
1. Read settings and job data
2. Update job status to "Complete", set completion date to today
3. Send a warm completion email to the client:
   - Congratulate them on their completed project
   - Thank them for choosing the company
   - Ask them to leave a Google review (include the review link from settings)
   - Let them know the team is available for future projects
4. Update client record with completion date and job value (if a client row exists — search by email)
5. Notify owner: job complete

Row: ${rowNumber}
    `.trim();

    return await this.run(prompt, `Handle job completion for row ${rowNumber}.`, { rowNumber });
  }

  async sendReviewFollowUp({ rowNumber }) {
    const prompt = `
You follow up on Google review requests for a home remodeling company.

TASK:
1. Read settings and job data
2. Send a friendly review reminder:
   - Quick, casual, not pushy
   - Include the review link
   - 2–3 sentences max
3. Update review status field to "Requested"
    `.trim();

    return await this.run(prompt, `Send review follow-up for job row ${rowNumber}.`, { rowNumber });
  }

  async thirtyDayCheckIn({ rowNumber }) {
    const prompt = `
You do 30-day post-job check-ins for a home remodeling company.

TASK:
1. Read settings and job data
2. Send a warm 30-day check-in email:
   - Ask how they're enjoying the finished project
   - Remind them of the 1-year workmanship warranty
   - Let them know the team is available for future projects or referrals
   - Mention referral program if there is one
3. Update "30-Day Check-in Sent" to "Yes"
    `.trim();

    return await this.run(prompt, `30-day check-in for job row ${rowNumber}.`, { rowNumber });
  }
}

module.exports = new ClientAgent();
