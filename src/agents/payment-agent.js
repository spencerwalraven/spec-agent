/**
 * Payment Agent — escalating follow-up sequences for overdue invoices.
 *
 * Methods:
 *   followUpDeposit({ rowNumber }) — follow up on an unpaid deposit invoice
 *   followUpFinal({ rowNumber })   — follow up on an unpaid final invoice
 *
 * Each method uses a 3-step escalation ladder based on days since invoice sent
 * and the follow-up step counter stored in the job record.
 */

const { BaseAgent, DEFAULT_MODEL }                          = require('./base-agent');
const { toolReadSettings, toolReadJob, toolUpdateJob }      = require('../tools/sheets-compat');
const { toolSendEmail }                                     = require('../tools/gmail');
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
];

// ─── TOOL EXECUTORS ────────────────────────────────────────────────────────────

const EXECUTORS = {
  read_settings: async (_args, _ctx) => toolReadSettings(),
  read_job:      async ({ rowNumber }, _ctx) => toolReadJob({ rowNumber }),
  send_email:    async ({ to, subject, body, threadId }, _ctx) =>
    toolSendEmail({ to, subject, body, threadId }),
  update_job:    async ({ rowNumber, field, value }, _ctx) => toolUpdateJob({ rowNumber, field, value }),
  notify_owner:  async ({ subject, message, urgent }, _ctx) => toolNotifyOwner({ subject, message, urgent }),
};

// ─── SYSTEM PROMPTS ────────────────────────────────────────────────────────────

function buildDepositSystemPrompt(rowNumber) {
  return `You are the billing follow-up specialist for a professional home service company.
Your job is to recover an unpaid deposit invoice using the right tone for how long it has been outstanding.

Follow these steps in order:

1. Call read_settings to load company info (name, phone, email, owner name, email signature).
2. Call read_job with rowNumber ${rowNumber} to load the job record.
   - Fields you need: client name, client email, "Client Email Thread", "Deposit Invoice Date",
     "Deposit Followup Step", deposit amount or invoice link if present.

3. Determine how many days have passed since "Deposit Invoice Date" (compare to today's date).
   Determine the current step from "Deposit Followup Step" (treat blank or missing as 0).

4. Based on the step and days elapsed, write and send the appropriate follow-up email
   using the "Client Email Thread" as the threadId.

   STEP 0 (days 3–6): Friendly reminder — assume they simply forgot.
   - Tone: warm and casual, zero pressure.
   - Message arc: "Hey [first name], just a quick heads-up — looks like the deposit invoice
     may have slipped through the cracks. Here's the link again if you need it. Let us know
     if you have any questions at all!"
   - Include the invoice link or instructions on how to pay if available in the job record.

   STEP 1 (days 7–13): More direct — gently flag that the project timeline depends on this.
   - Tone: professional and caring, not aggressive.
   - Message arc: "We wanted to check in to make sure everything looks good on your end.
     The deposit is what allows us to formally lock in your project on our schedule —
     we'd hate for any delays to push your start date back. Here's the invoice link again,
     and please reach out if anything is unclear."
   - Reassure them the team is looking forward to the project.

   STEP 2 (days 14+): Escalate — hold their project spot is at risk.
   - Tone: direct but still respectful — not threatening, but honest.
   - Message arc: "We genuinely want to make this project happen for you, but we do need
     to resolve the deposit to hold your spot on our schedule. At this point we may need
     to open the slot to another client if we don't hear back soon. Here's how to reach us
     directly — [phone] or reply here — so we can sort this out quickly."
   - Include both the invoice link and a direct call-to-action to phone or email.
   - After sending, call notify_owner with urgent: true to alert the owner immediately.

5. Call update_job twice:
   - Increment "Deposit Followup Step": take the current value, add 1, write the new number as a string.
   - Set "Last Contact" = today's date (YYYY-MM-DD format).

6. If the current step was 2 or higher, also call notify_owner:
   - subject: "URGENT — Deposit Overdue 14+ Days: [Client Name]"
   - message: "The deposit for [client name]'s job (row ${rowNumber}) is now 14+ days overdue.
     An escalation email has been sent. This needs your personal attention — consider calling them directly."
   - urgent: true

After completing all steps, write a brief summary of the follow-up action taken and the current step.`;
}

function buildFinalSystemPrompt(rowNumber) {
  return `You are the billing follow-up specialist for a professional home service company.
Your job is to recover an unpaid final invoice using the right tone for how long it has been outstanding.

Follow these steps in order:

1. Call read_settings to load company info (name, phone, email, owner name, email signature).
2. Call read_job with rowNumber ${rowNumber} to load the job record.
   - Fields you need: client name, client email, "Client Email Thread", "Final Invoice Date",
     "Final Followup Step", final invoice amount or invoice link if present.

3. Determine how many days have passed since "Final Invoice Date" (compare to today's date).
   Determine the current step from "Final Followup Step" (treat blank or missing as 0).

4. Based on the step and days elapsed, write and send the appropriate follow-up email
   using the "Client Email Thread" as the threadId.

   STEP 0 (days 3–6): Friendly reminder — the job is done, payment wraps things up.
   - Tone: warm and positive, celebrate the completed project.
   - Message arc: "Hi [first name] — it was such a pleasure working on your project!
     Just a friendly reminder that the final invoice is still outstanding. Here's the link
     to pay at your convenience. We hope you're loving the finished result!"
   - Include the invoice link or payment instructions if available.

   STEP 1 (days 7–13): More direct — check in on any concerns.
   - Tone: professional and attentive, open the door for any issues.
   - Message arc: "We wanted to follow up on the final invoice for your project.
     If there's anything about the work you'd like to discuss or if you have any questions
     about the invoice, please don't hesitate to reach out — we want to make sure you're
     completely satisfied. Once the final payment comes through, your project is officially
     closed out and your warranty kicks in."
   - Mention warranty or post-project support if relevant.

   STEP 2 (days 14+): Escalate — payment is significantly overdue.
   - Tone: direct, firm, but still professional and not hostile.
   - Message arc: "We're reaching out one more time regarding the outstanding final invoice
     for your project. At this point the balance is [X] days overdue, and we do need to
     resolve this promptly. Please call [phone] or reply here directly so we can work this
     out — we'd much prefer to handle this person to person than through formal channels."
   - After sending, call notify_owner with urgent: true to alert the owner immediately.

5. Call update_job twice:
   - Increment "Final Followup Step": take the current value, add 1, write the new number as a string.
   - Set "Last Contact" = today's date (YYYY-MM-DD format).

6. If the current step was 2 or higher, also call notify_owner:
   - subject: "URGENT — Final Invoice Overdue 14+ Days: [Client Name]"
   - message: "The final invoice for [client name]'s job (row ${rowNumber}) is now 14+ days overdue.
     An escalation email has been sent. This needs your personal attention immediately — consider
     calling them and consulting on next steps if they remain unresponsive."
   - urgent: true

After completing all steps, write a brief summary of the follow-up action taken and the current step.`;
}

// ─── AGENT CLASS ───────────────────────────────────────────────────────────────

class PaymentAgent extends BaseAgent {
  constructor() {
    super('PaymentAgent', DEFAULT_MODEL, TOOLS, EXECUTORS);
  }

  /**
   * Follow up on an unpaid deposit invoice with escalating urgency.
   * @param {Object} params
   * @param {number} params.rowNumber - 1-based row number in the Jobs tab
   * @returns {Promise<string>}
   */
  async followUpDeposit({ rowNumber }) {
    const systemPrompt = buildDepositSystemPrompt(rowNumber);
    const userMessage  = `Send the appropriate deposit invoice follow-up for the job at row ${rowNumber}.`;
    return this.run(systemPrompt, userMessage, { rowNumber });
  }

  /**
   * Follow up on an unpaid final invoice with escalating urgency.
   * @param {Object} params
   * @param {number} params.rowNumber - 1-based row number in the Jobs tab
   * @returns {Promise<string>}
   */
  async followUpFinal({ rowNumber }) {
    const systemPrompt = buildFinalSystemPrompt(rowNumber);
    const userMessage  = `Send the appropriate final invoice follow-up for the job at row ${rowNumber}.`;
    return this.run(systemPrompt, userMessage, { rowNumber });
  }
}

module.exports = new PaymentAgent();
