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
const crypto                            = require('crypto');
let calendarTool;
try { calendarTool = require('../tools/calendar'); } catch (_) {}

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
    name: 'send_proposal_for_approval',
    description: 'Send the proposal to the client with one-click Approve and Decline buttons. Use this instead of send_email when sending a proposal.',
    input_schema: {
      type: 'object',
      properties: {
        to:          { type: 'string', description: 'Client email address' },
        clientName:  { type: 'string' },
        projectType: { type: 'string' },
        docUrl:      { type: 'string', description: 'URL to the proposal Google Doc' },
        summary:     { type: 'string', description: 'Short 2-3 sentence summary of what the proposal covers and the investment range' },
        threadId:    { type: 'string' },
      },
      required: ['to', 'clientName', 'projectType', 'docUrl', 'summary'],
    },
  },
  {
    name: 'create_calendar_event',
    description: 'Create a Google Calendar event for a job kickoff, phase, or follow-up. Use for kickoff dates, phase start dates, and appointment reminders.',
    input_schema: {
      type: 'object',
      properties: {
        title:       { type: 'string', description: 'Event title, e.g. "Kitchen Remodel Kickoff — Sarah Chen"' },
        description: { type: 'string' },
        startDate:   { type: 'string', description: 'Date in YYYY-MM-DD or MM/DD/YYYY format, or ISO datetime' },
        endDate:     { type: 'string', description: 'Optional end date. Defaults to same day.' },
        location:    { type: 'string', description: 'Job site address' },
        type:        { type: 'string', enum: ['kickoff', 'phase', 'followup', 'complete'], description: 'Event type (sets color)' },
      },
      required: ['title', 'startDate'],
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
  create_calendar_event: async (args) => {
    if (!calendarTool) return 'Calendar not configured (GOOGLE_CALENDAR_ID not set)';
    return calendarTool.toolCreateCalendarEvent(args);
  },

  send_proposal_for_approval: async ({ to, clientName, projectType, docUrl, summary, threadId }, ctx) => {
    try {
      const token = crypto.randomBytes(20).toString('hex');
      const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : (process.env.APP_URL || 'https://your-app.railway.app');

      const approveUrl  = `${baseUrl}/api/proposal/approve/${token}`;
      const declineUrl  = `${baseUrl}/api/proposal/decline/${token}`;
      const firstName   = (clientName || '').split(' ')[0] || 'there';
      let companyName = 'Your Contractor';
      try { const s = JSON.parse(await toolReadSettings()); companyName = s.companyName || companyName; } catch (_) {}

      // Save token to Jobs tab
      if (ctx.rowNumber) {
        await updateCell('Jobs', ctx.rowNumber, ['Proposal Token', 'Proposal Approval Token'], token);
        await updateCell('Jobs', ctx.rowNumber, ['Proposal Status', 'Proposal Sent'], 'Sent — Awaiting Approval');
        await updateCell('Jobs', ctx.rowNumber, ['Proposal Sent Date', 'Proposal Sent'], new Date().toLocaleDateString('en-US'));
      }

      const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#0A2240;padding:24px 28px;border-radius:12px 12px 0 0">
    <div style="color:#BF9438;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Your Project Proposal</div>
    <div style="color:#ffffff;font-size:20px;font-weight:800">${projectType} — Review & Approve</div>
  </div>
  <div style="background:#ffffff;padding:28px;border:1px solid #E5E7EB;border-top:none">
    <p style="font-size:16px;color:#374151;margin:0 0 8px">Hey ${firstName},</p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px">${summary}</p>

    <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:16px 20px;margin-bottom:24px">
      <a href="${docUrl}" style="color:#0A2240;font-size:15px;font-weight:700;text-decoration:none">📄 View Your Full Proposal ↗</a>
      <p style="color:#6B7280;font-size:13px;margin:6px 0 0">Review all the details, scope of work, pricing, and timeline.</p>
    </div>

    <p style="font-size:14px;color:#374151;margin:0 0 14px;font-weight:600">Ready to move forward? It only takes one tap:</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr>
        <td style="padding-right:8px">
          <a href="${approveUrl}" style="display:block;background:#0A2240;color:#ffffff;text-align:center;padding:16px 20px;border-radius:10px;font-size:16px;font-weight:700;text-decoration:none">✅ Yes, Let's Do It!</a>
        </td>
        <td style="padding-left:8px">
          <a href="${declineUrl}" style="display:block;background:#F3F4F6;color:#374151;text-align:center;padding:16px 20px;border-radius:10px;font-size:16px;font-weight:700;text-decoration:none">Not Right Now</a>
        </td>
      </tr>
    </table>

    <p style="font-size:13px;color:#9CA3AF;margin:0">Questions before you decide? Just reply to this email — we're happy to talk through anything.</p>
  </div>
  <div style="padding:16px;text-align:center;font-size:12px;color:#9CA3AF">Powered by ${companyName}</div>
</div>`.trim();

      const { sendEmail } = require('../tools/gmail');
      const result = await sendEmail({ to, subject: `Your ${projectType} Proposal — Ready to Review`, body: summary, html, threadId: threadId || ctx.threadId });
      if (result.threadId && ctx.rowNumber) {
        ctx.threadId = result.threadId;
        await updateCell('Jobs', ctx.rowNumber, ['Client Email Thread', 'Email Thread ID'], result.threadId).catch(() => {});
      }

      logger.success('JobAgent', `Proposal sent to ${to} with approve/decline links`);
      return `Proposal sent to ${to}. Approve: ${approveUrl}`;
    } catch (err) {
      logger.error('JobAgent', `send_proposal_for_approval failed: ${err.message}`);
      return `Failed: ${err.message}`;
    }
  },
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
4. Use the send_proposal_for_approval tool (NOT send_email) to send the proposal directly to the client with one-click Approve and Decline buttons.
   - to: client's email address
   - clientName: client's full name
   - projectType: the service/project type
   - docUrl: the Google Doc URL you just created
   - summary: a warm 2-3 sentence summary of what's in the proposal and the investment range (e.g. "We've put together a detailed Kitchen Remodel proposal for your home at 123 Main St. The project covers a full gut renovation with custom cabinetry, quartz countertops, and new appliances. Investment ranges from $42,000–$58,000 depending on the tier you choose.")
5. After sending, notify the owner: "Proposal sent directly to [client name] for [service type] — they can approve with one click from their email."

Write the proposal in professional language. Be specific about scope of work. The summary for the email should sound warm and conversational, not corporate.
    `.trim();

    return await this.run(systemPrompt, `Generate proposal for job at row ${rowNumber}.`, { rowNumber });
  }

  // ── Send proposal follow-up ───────────────────────────────────────────────

  async sendProposalFollowUp({ rowNumber }) {
    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : (process.env.APP_URL || 'https://your-app.railway.app');

    const systemPrompt = `
You are following up on a proposal sent to a client for a home remodeling company.

TASK:
1. Read settings and job data (row ${rowNumber})
2. Check proposal status — if already Approved or Declined, do nothing and stop
3. Read "Proposal Token" from the job data. Build these URLs:
   Approve: ${baseUrl}/api/proposal/approve/[token]
   Decline: ${baseUrl}/api/proposal/decline/[token]
4. Use send_email with HTML to send a warm follow-up that:
   - Is short and casual — not pushy at all
   - References their specific project type by name
   - Includes a big "✅ Yes, Let's Do It!" button (using the approve URL above) and a smaller "Not Right Now" link
   - Mentions they can reply with any questions
   - Sounds like it's from a real person, not a marketing email
5. Update last contact date

Example tone: "Hey [first name] — just wanted to check in on the [project type] proposal I sent over. Did you get a chance to look through it? Happy to jump on a quick call if you have any questions. If you're ready to move forward, you can approve it right here 👇"

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
3. For each phase, call add_phase with: Job ID, Phase Name, Phase Order (1, 2, 3...), Description, Materials Needed, Estimated Labor Hrs, Estimated Cost, Status (Not Started), Start Date, End Date (estimate realistic dates based on project scope and today's date)
4. After adding all phases, create a Google Calendar event for each phase using create_calendar_event. Use the phase name + client name as the title, the job address as the location, and the estimated start/end dates.
5. Also create a kickoff calendar event for the overall project start date (type: "kickoff").
6. Update the job: "Kickoff Doc Link" with the Google Doc URL, "Job Status" to "Template Ready"
7. Notify owner with the link and confirm calendar events were created

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
