/**
 * Job Agent — handles the sales + job lifecycle:
 *   • Post-visit estimate generation
 *   • AI proposal writing
 *   • Proposal follow-up sequence
 *   • Proposal decision (accepted / declined)
 *   • Contract generation
 *   • Contract follow-up
 *   • Job template + phase breakdown
 *   • Sub notifications
 */

const { BaseAgent, DEFAULT_MODEL } = require('./base-agent');
const { toolReadJob, toolUpdateJob, toolReadSettings, toolReadPhases, toolAppendPhase, updateCell, readRow } = require('../tools/sheets');
const { toolSendEmail, toolReadThread } = require('../tools/gmail');
const { toolCreateDoc }                 = require('../tools/docs');
const { toolNotifyOwner }               = require('../tools/notify');
const { logger }                        = require('../utils/logger');

// ─── TOOL DEFINITIONS ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'read_job',
    description: 'Read all data for a job row from the Jobs tab',
    input_schema: {
      type: 'object',
      properties: { rowNumber: { type: 'number' } },
      required: ['rowNumber'],
    },
  },
  {
    name: 'update_job',
    description: 'Update a single field in the Jobs tab. Use exact column header names.',
    input_schema: {
      type: 'object',
      properties: {
        rowNumber: { type: 'number' },
        field:     { type: 'string' },
        value:     { type: 'string' },
      },
      required: ['rowNumber', 'field', 'value'],
    },
  },
  {
    name: 'send_email',
    description: 'Send an email or reply in an existing thread',
    input_schema: {
      type: 'object',
      properties: {
        to:       { type: 'string' },
        subject:  { type: 'string' },
        body:     { type: 'string' },
        threadId: { type: 'string' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'read_email_thread',
    description: 'Read a Gmail thread',
    input_schema: {
      type: 'object',
      properties: { threadId: { type: 'string' } },
      required: ['threadId'],
    },
  },
  {
    name: 'create_document',
    description: 'Create a Google Doc and return its shareable URL. Use for proposals, contracts, job templates.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        body:  { type: 'string', description: 'Full document content in plain text' },
      },
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
    description: 'Send urgent alert to business owner',
    input_schema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['subject', 'message'],
    },
  },
  {
    name: 'read_phases',
    description: 'Read job phases for a specific job ID',
    input_schema: {
      type: 'object',
      properties: { jobId: { type: 'string' } },
      required: [],
    },
  },
  {
    name: 'add_phase',
    description: 'Add a new phase row to the Job Phases tab',
    input_schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          description: 'Object with column headers as keys, e.g. {"Job ID": "JOB-001", "Phase Name": "Demolition", ...}',
        },
      },
      required: ['data'],
    },
  },
];

// ─── TOOL EXECUTORS ───────────────────────────────────────────────────────────

const EXECUTORS = {
  read_job:          async (args)     => toolReadJob(args),
  update_job:        async (args)     => toolUpdateJob(args),
  send_email:        async (args, ctx) => {
    const { sendEmail } = require('../tools/gmail');
    const result = await sendEmail({
      to:       args.to,
      subject:  args.subject,
      body:     args.body,
      threadId: args.threadId || ctx.threadId || null,
    });
    if (result.threadId && ctx.rowNumber) {
      ctx.threadId = result.threadId;
      try {
        await updateCell('Jobs', ctx.rowNumber, ['Email Thread ID', 'emailThread', 'Client Email Thread'], result.threadId);
        await updateCell('Jobs', ctx.rowNumber, ['Last Contact', 'Last Client Contact'], new Date().toLocaleDateString('en-US'));
      } catch (_) {}
    }
    return `Email sent. Thread ID: ${result.threadId}`;
  },
  read_email_thread: async (args)     => toolReadThread(args),
  create_document:   async (args)     => toolCreateDoc(args),
  read_settings:     async ()         => toolReadSettings(),
  notify_owner:      async (args)     => toolNotifyOwner(args),
  read_phases:       async (args)     => toolReadPhases(args),
  add_phase:         async (args)     => toolAppendPhase(args),
};

// ─── JOB AGENT CLASS ──────────────────────────────────────────────────────────

class JobAgent extends BaseAgent {
  constructor() {
    super('JobAgent', DEFAULT_MODEL, TOOLS, EXECUTORS);
  }

  // ── Generate estimate after site visit ───────────────────────────────────

  async generateEstimate({ rowNumber }) {
    const systemPrompt = `
You are an expert estimating AI for a home remodeling company.

TASK:
1. Read settings and job data
2. Based on the project description, service type, square footage, quality tier, and any other available data, produce a professional estimate range
3. Write a low estimate and high estimate (in dollars, no cents)
4. Update the job: "AI Estimate Low", "AI Estimate High", "Estimate Notes" with your reasoning
5. Update job status to "Estimate Ready"
6. Notify the owner with the estimates so they can review before sending to the client

When estimating, consider:
- Complexity of the work described
- Quality tier chosen (Budget / Standard / Premium / Luxury)
- Square footage if provided
- Materials and labor typical for this region
- Always give a range — low is the minimum scope, high includes full scope + contingency

Row: ${rowNumber}
    `.trim();

    return await this.run(systemPrompt, `Generate estimate for job at row ${rowNumber}.`, { rowNumber });
  }

  // ── Generate and send AI proposal ────────────────────────────────────────

  async generateProposal({ rowNumber }) {
    const systemPrompt = `
You are an expert proposal writer for a home remodeling company.

TASK:
1. Read settings and job data (row ${rowNumber})
2. Create a professional proposal Google Doc with:
   - Company header (name, phone, email)
   - Client info and project address
   - Detailed scope of work based on their project description
   - 3 pricing tiers (Good / Better / Best) using the estimate range
   - Timeline estimate
   - What's included / what's not included
   - Payment terms (typically 30% deposit, 40% midpoint, 30% completion)
   - Professional closing with call to action
3. Save the document URL to the job record ("Proposal Doc Link")
4. Update "Proposal Sent" to "Pending Approval" — this queues the proposal for owner review
5. Notify the owner: "New proposal ready for review — [client name], [service type]"

Write the proposal in professional business language. Be specific about the scope of work.
    `.trim();

    return await this.run(systemPrompt, `Generate proposal for job at row ${rowNumber}.`, { rowNumber });
  }

  // ── Send proposal follow-up ───────────────────────────────────────────────

  async sendProposalFollowUp({ rowNumber }) {
    const systemPrompt = `
You are following up on a proposal sent to a client for a home remodeling company.

TASK:
1. Read settings and job data
2. Check the proposal sent date and thread ID
3. Send a warm follow-up email:
   - Reference their specific project
   - Ask if they had a chance to review the proposal
   - Offer to answer any questions
   - Don't be pushy — just a helpful check-in
4. Update last contact date

Row: ${rowNumber}
    `.trim();

    return await this.run(systemPrompt, `Send proposal follow-up for job row ${rowNumber}.`, { rowNumber });
  }

  // ── Handle proposal decision ──────────────────────────────────────────────

  async handleProposalDecision({ rowNumber, threadId }) {
    const systemPrompt = `
You are handling a client's response to a proposal for a home remodeling company.

TASK:
1. Read settings and job data
2. Read the email thread to understand what the client decided
3. Determine: accepted, declined, wants changes, needs more info, or asking questions
4. Respond accordingly:
   - Accepted: celebrate, confirm next steps (contract + deposit), update status, notify owner
   - Declined: thank them graciously, ask for feedback, update status to "Lost"
   - Wants changes: acknowledge, let them know the owner will follow up, notify owner
   - Questions: answer clearly, provide additional info, keep them warm
5. Update job status and notes

Row: ${rowNumber} | Thread: ${threadId}
    `.trim();

    return await this.run(systemPrompt, `Handle proposal decision for job row ${rowNumber}.`, { rowNumber, threadId });
  }

  // ── Generate contract ─────────────────────────────────────────────────────

  async generateContract({ rowNumber }) {
    const systemPrompt = `
You are a contract writer for a home remodeling company.

TASK:
1. Read settings and job data (row ${rowNumber})
2. Create a professional contract Google Doc with:
   - Company and client info header
   - Contract date
   - Detailed scope of work
   - Agreed price (use Total Job Value or Estimate High)
   - Payment schedule (30% deposit upon signing, 40% at project midpoint, 30% upon completion)
   - Start date and estimated completion date
   - Change order policy
   - Warranty clause (1 year on workmanship)
   - Signature lines for both parties
3. Save document URL to "Contract Doc Link"
4. Update "Contract Status" to "Pending Approval" — queues for owner review
5. Notify owner: "Contract ready for review — [client name]"
    `.trim();

    return await this.run(systemPrompt, `Generate contract for job row ${rowNumber}.`, { rowNumber });
  }

  // ── Generate job template + phases ───────────────────────────────────────

  async generateJobTemplate({ rowNumber }) {
    const systemPrompt = `
You are a job planning AI for a home remodeling company.

TASK:
1. Read settings and job data
2. Based on the service type, scope, and quality tier, create a complete project breakdown:
   - A Google Doc with the full project plan (phases, materials, timeline)
   - Add each phase as a row in the Job Phases tab
3. For each phase, call add_phase with: Job ID, Phase Name, Phase Order (1, 2, 3...), Description, Materials Needed, Estimated Labor Hrs, Estimated Cost, Status (Not Started)
4. Update the job: "Kickoff Doc Link" with the Google Doc URL, "Job Status" to "Template Ready"
5. Notify owner with the link

Typical phases for common projects:
- Kitchen remodel: Demo, Rough-in (plumbing/electrical), Cabinets, Countertops, Tile, Appliances, Finish
- Bathroom: Demo, Plumbing, Tile/Waterproofing, Vanity/Fixtures, Paint, Final inspection
- Flooring: Prep/Demo, Subfloor repair, Installation, Trim/Transitions, Clean-up
- Painting: Prep/Masking, Primer coat, Paint coats, Touch-up, Clean-up

Row: ${rowNumber}
    `.trim();

    return await this.run(systemPrompt, `Generate job template and phases for row ${rowNumber}.`, { rowNumber });
  }

  // ── Notify subcontractors ─────────────────────────────────────────────────

  async notifySubs({ rowNumber }) {
    const systemPrompt = `
You are coordinating subcontractors for a home remodeling job.

TASK:
1. Read settings and job data
2. Read the job phases for this job
3. For each phase that has an assigned subcontractor (Assigned Name + sub email):
   - Send them an email with: job location, phase details, start date, what they need to bring
4. Update each phase: "Sub Notified" = "Yes"
5. Notify owner of all sub notifications sent

Row: ${rowNumber}
    `.trim();

    return await this.run(systemPrompt, `Notify subcontractors for job row ${rowNumber}.`, { rowNumber });
  }
}

module.exports = new JobAgent();
