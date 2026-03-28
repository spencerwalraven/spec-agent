/**
 * Welcome Agent — sends a professional onboarding experience right after a contract is signed.
 *
 * Method:
 *   sendWelcome({ rowNumber }) — reads job data, emails the client a warm welcome,
 *   creates a client status doc link, and notifies the owner.
 */

const { BaseAgent, DEFAULT_MODEL }                          = require('./base-agent');
const { toolReadSettings, toolReadJob, toolUpdateJob }      = require('../tools/sheets-compat');
const { toolSendEmail }                                     = require('../tools/gmail');
const { toolCreateDoc }                                     = require('../tools/docs');
const { toolNotifyOwner }                                   = require('../tools/notify');

// ─── TOOL DEFINITIONS ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'read_settings',
    description: 'Read business settings (company name, phone, email, owner name, email signature, etc.)',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'read_job',
    description: 'Read job data by row number from the Jobs tab',
    input_schema: { type: 'object', properties: { rowNumber: { type: 'number' } }, required: ['rowNumber'] },
  },
  {
    name: 'send_email',
    description: 'Send or reply to an email. Use the Client Email Thread as threadId to keep the conversation threaded.',
    input_schema: {
      type: 'object',
      properties: {
        to:       { type: 'string', description: 'Recipient email address' },
        subject:  { type: 'string' },
        body:     { type: 'string', description: 'Plain-text email body' },
        html:     { type: 'string', description: 'Optional HTML version of the email body' },
        threadId: { type: 'string', description: 'Gmail thread ID — keeps reply in the same email chain' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'update_job',
    description: 'Update a job field by column header name',
    input_schema: {
      type: 'object',
      properties: {
        rowNumber: { type: 'number' },
        field:     { type: 'string', description: 'Exact column header from the Jobs tab' },
        value:     { type: 'string' },
      },
      required: ['rowNumber', 'field', 'value'],
    },
  },
  {
    name: 'notify_owner',
    description: 'Send an email (and optionally a text) alert to the business owner',
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
    name: 'create_doc',
    description: 'Create a Google Doc — useful for welcome packets or reference documents',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        body:  { type: 'string' },
      },
      required: ['title', 'body'],
    },
  },
];

// ─── TOOL EXECUTORS ────────────────────────────────────────────────────────────

const EXECUTORS = {
  read_settings: async (_args, _ctx) => toolReadSettings(),
  read_job:      async ({ rowNumber }, _ctx) => toolReadJob({ rowNumber }),
  send_email:    async ({ to, subject, body, html, threadId }, _ctx) =>
    toolSendEmail({ to, subject, body: html || body, threadId }),
  update_job:    async ({ rowNumber, field, value }, _ctx) => toolUpdateJob({ rowNumber, field, value }),
  notify_owner:  async ({ subject, message, urgent }, _ctx) => toolNotifyOwner({ subject, message, urgent }),
  create_doc:    async ({ title, body }, _ctx) => toolCreateDoc({ title, body }),
};

// ─── SYSTEM PROMPT ─────────────────────────────────────────────────────────────

function buildSystemPrompt(rowNumber) {
  const appUrl = process.env.APP_URL || 'https://app.summitcrm.io';

  return `You are the onboarding specialist for a professional home service company.
Your job is to make new clients feel genuinely welcomed and confident right after they sign their contract.

Follow these steps in order:

1. Call read_settings to load company info (name, phone, email, owner name, email signature).
2. Call read_job with rowNumber ${rowNumber} to load the job record.
   - Note the client's name, email, project scope, job ID, and "Client Email Thread" field.

3. Send a warm, personal welcome email to the client using send_email.
   - Use the "Client Email Thread" as the threadId so it stays in their existing email chain.
   - The email must include:
     a. A genuinely warm, excited opening — you are thrilled to be working with them.
     b. A brief, specific summary of their contracted project (pull scope details from the job record).
     c. A clear "What happens next" timeline:
        • A deposit invoice will arrive shortly — once received, we'll lock in the schedule.
        • After the deposit, the owner or project lead will reach out to schedule the kickoff visit.
        • Work begins on the scheduled start date.
     d. Practical tips on what to prepare:
        • Clear the work area as much as possible before day one.
        • Plan for someone to be available (in person or by phone) on kickoff day.
        • Keep a clear path to the work zone for the crew.
        • Don't hesitate to reach out with any questions before work begins.
     e. Direct contact info from settings (phone and email) with a genuine "we are always reachable" message.
     f. Their personalized client status page link: ${appUrl}/status/[Job ID from job record]
     g. The email signature from settings.
   - Tone: warm, professional, and human — like a letter from someone who genuinely cares, not a template.
   - Keep it focused and scannable. Use short paragraphs. No walls of text.

4. Call update_job twice:
   - Set field "Welcome Sent" = "Yes"
   - Set field "Last Contact" = today's date (YYYY-MM-DD format)

5. Call notify_owner with:
   - subject: "Contract Signed — Welcome Email Sent to [Client Name]"
   - message: "[Client Name] signed their contract and has been welcomed via email. Deposit invoice should go out next. Job row: ${rowNumber}."
   - urgent: false

After completing all steps, write a short confirmation summary of what you did.`;
}

// ─── AGENT CLASS ───────────────────────────────────────────────────────────────

class WelcomeAgent extends BaseAgent {
  constructor() {
    super('WelcomeAgent', DEFAULT_MODEL, TOOLS, EXECUTORS);
  }

  /**
   * Send a professional onboarding welcome email to a newly contracted client.
   * @param {Object} params
   * @param {number} params.rowNumber - 1-based row number in the Jobs tab
   * @returns {Promise<string>}
   */
  async sendWelcome({ rowNumber }) {
    const systemPrompt = buildSystemPrompt(rowNumber);
    const userMessage  = `Send the onboarding welcome experience for the job at row ${rowNumber}.`;
    return this.run(systemPrompt, userMessage, { rowNumber });
  }
}

module.exports = new WelcomeAgent();
