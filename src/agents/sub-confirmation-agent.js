/**
 * Sub Confirmation Agent — follows up with subcontractors who haven't confirmed phases.
 *
 * Method: followUpSub({ phaseRow })
 *   phaseRow: 1-based row number in the "Job Phases" tab for the unconfirmed phase.
 *
 * Follow-up escalation schedule (based on "Sub Notified Date" + "Sub Followup Count"):
 *   Attempt 1 (day 2): Friendly reminder via SMS / email
 *   Attempt 2 (day 4): Urgent — needs reply or we find coverage
 *   Attempt 3 (day 6): Notify owner to find a backup sub; no outbound to sub
 */

const { BaseAgent, DEFAULT_MODEL } = require('./base-agent');
const { toolReadSettings, readRow, readTab, updateCell, g } = require('../tools/sheets-compat');
const { sendSms, toolSendSms }                              = require('../tools/sms');
const { sendEmail, toolSendEmail }                          = require('../tools/gmail');
const { notifyOwner, toolNotifyOwner }                      = require('../tools/notify');
const { logger }                                            = require('../utils/logger');

// ─── TOOL DEFINITIONS ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'read_phase',
    description: 'Read all data for a phase row from the "Job Phases" tab.',
    input_schema: {
      type: 'object',
      properties: {
        rowNumber: { type: 'number', description: '1-based row number in Job Phases tab' },
      },
      required: ['rowNumber'],
    },
  },
  {
    name: 'read_job',
    description: 'Find and return a job record from the Jobs tab by Job ID.',
    input_schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Job ID to look up in the Jobs tab' },
      },
      required: ['jobId'],
    },
  },
  {
    name: 'read_settings',
    description: 'Read company settings (name, phone, email, owner name, etc.)',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'send_sms',
    description: 'Send a text message to a phone number.',
    input_schema: {
      type: 'object',
      properties: {
        to:      { type: 'string', description: 'Phone number (any common format)' },
        message: { type: 'string', description: 'Text message body' },
      },
      required: ['to', 'message'],
    },
  },
  {
    name: 'send_email',
    description: 'Send an email.',
    input_schema: {
      type: 'object',
      properties: {
        to:      { type: 'string' },
        subject: { type: 'string' },
        body:    { type: 'string' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'update_phase',
    description: 'Update a single field on a phase row in the "Job Phases" tab.',
    input_schema: {
      type: 'object',
      properties: {
        rowNumber: { type: 'number' },
        field:     { type: 'string', description: 'Exact column header name' },
        value:     { type: 'string' },
      },
      required: ['rowNumber', 'field', 'value'],
    },
  },
  {
    name: 'notify_owner',
    description: 'Send an urgent alert to the business owner via email and/or SMS.',
    input_schema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        message: { type: 'string' },
        urgent:  { type: 'boolean' },
      },
      required: ['subject', 'message'],
    },
  },
];

// ─── TOOL EXECUTORS ───────────────────────────────────────────────────────────

const TOOL_EXECUTORS = {
  read_phase: async ({ rowNumber }) => {
    const phase = await readRow('Job Phases', rowNumber);
    return JSON.stringify(phase, null, 2);
  },

  read_job: async ({ jobId }) => {
    // No readJob-by-ID helper exists, so scan the Jobs tab directly.
    const jobs = await readTab('Jobs');
    const job = jobs.find(j => g(j, 'Job ID') === jobId);
    if (!job) return `No job found with Job ID "${jobId}"`;
    return JSON.stringify(job, null, 2);
  },

  read_settings: async () => {
    return await toolReadSettings({});
  },

  send_sms: async ({ to, message }) => {
    return await toolSendSms({ to, message });
  },

  send_email: async ({ to, subject, body }) => {
    return await toolSendEmail({ to, subject, body });
  },

  update_phase: async ({ rowNumber, field, value }) => {
    return await updateCell('Job Phases', rowNumber, field, value);
  },

  notify_owner: async ({ subject, message, urgent = false }) => {
    return await toolNotifyOwner({ subject, message, urgent });
  },
};

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a job coordination assistant for a home service company.
Your job is to follow up with subcontractors who have not confirmed their assigned phases.

Step-by-step instructions:

1. Call read_phase with the phaseRow given in the user message to get all phase details.

2. Extract the "Job ID" from the phase record. Call read_job with that Job ID to get the full job record (client name, start date, address, etc.).

3. Call read_settings to get company info (name, phone, owner name).

4. Determine the escalation attempt number:
   - Look at "Sub Followup Count" on the phase record. If blank or 0, this is Attempt 1.
   - Attempt 1 → friendly reminder (day 2 since notification)
   - Attempt 2 → direct/urgent (day 4 since notification)
   - Attempt 3 → notify owner only, do NOT contact the sub again

5. Execute the appropriate action:

   ATTEMPT 1 — Friendly reminder:
   - If the sub has a phone number, call send_sms with a warm, brief message:
     "Hey [sub name], just confirming you got our message about [phase name] for the [client name] job starting [start date]. Can you reply YES to confirm? Thanks! – [company name]"
   - If no phone but has email, call send_email instead with the same friendly tone.
   - Then call update_phase to set "Sub Followup Count" to "1".

   ATTEMPT 2 — Direct/urgent:
   - Prefer SMS if phone is available, email as backup.
   - Message: "Hi [sub name], we still need confirmation for [phase name] on the [client name] job starting [start date]. We need a YES by tomorrow or we'll need to find coverage. Please reply YES or call [company phone]."
   - Then call update_phase to set "Sub Followup Count" to "2".

   ATTEMPT 3 — Escalate to owner, do NOT message the sub:
   - Call notify_owner with urgent: true.
   - Subject: "ACTION NEEDED: Sub not responding — [sub name] / [phase name]"
   - Message: Include all relevant details — sub name, sub phone, sub email, phase name, job ID, client name, job start date, job address. Tell the owner the sub has not responded after 3 contact attempts and they need to find a backup immediately.
   - Then call update_phase to set "Sub Followup Count" to "3".

6. After completing all actions, respond with a brief plain-text summary of what you did.

Important rules:
- Never skip reading the phase, job, and settings first — you need that data.
- Prefer SMS over email for subcontractors.
- Keep SMS messages short (under 160 characters ideally).
- Do not contact the sub on attempt 3 — only notify the owner.
- Only increment Sub Followup Count AFTER the message is sent successfully.`;

// ─── AGENT CLASS ──────────────────────────────────────────────────────────────

class SubConfirmationAgent extends BaseAgent {
  constructor() {
    super('SubConfirmationAgent', DEFAULT_MODEL, TOOLS, TOOL_EXECUTORS);
  }

  /**
   * Follow up on a single unconfirmed phase.
   * @param {Object} params
   * @param {number} params.phaseRow - 1-based row number in the Job Phases tab
   * @returns {string} Summary of actions taken
   */
  async followUpSub({ phaseRow }) {
    if (!phaseRow) throw new Error('followUpSub requires a phaseRow number');

    const userMessage = `Follow up on the unconfirmed phase at row ${phaseRow} in the Job Phases tab. ` +
      `Read the phase, find the job, read settings, determine the escalation attempt, and take the appropriate action.`;

    return await this.run(SYSTEM_PROMPT, userMessage, { phaseRow });
  }
}

module.exports = new SubConfirmationAgent();
