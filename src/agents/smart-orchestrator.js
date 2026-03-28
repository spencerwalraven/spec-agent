/**
 * Smart Master Orchestrator
 *
 * The brain of the system. Runs daily and proactively scans all leads,
 * jobs, and clients to identify what needs attention — then takes action.
 *
 * Unlike the simple event router (orchestrator.js), this agent REASONS
 * about system state and makes decisions autonomously.
 *
 * Daily scan logic:
 *  LEADS  — hot leads not contacted, stale nurture sequences, dead leads
 *  JOBS   — overdue invoices, jobs behind schedule, subs not notified, unsigned contracts
 *  CLIENTS — upcoming check-ins, satisfaction scores to collect, review requests
 *  ALERTS — builds an alert list for the dashboard
 */

const { BaseAgent, DEFAULT_MODEL } = require('./base-agent');
const { readTab, readSettings, toolReadSettings, updateCell } = require('../tools/sheets-compat');
const { toolNotifyOwner, toolTextClient } = require('../tools/notify');
const { logger } = require('../utils/logger');

// ─── TOOL DEFINITIONS ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'read_settings',
    description: 'Read business settings',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'read_all_leads',
    description: 'Read all leads from the Leads tab. Returns full dataset.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'read_all_jobs',
    description: 'Read all active jobs from the Jobs tab.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'read_all_clients',
    description: 'Read all clients from the Clients tab.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'trigger_agent',
    description: 'Fire a specific agent action for a lead, job, or client row.',
    input_schema: {
      type: 'object',
      properties: {
        eventType: {
          type: 'string',
          description: 'Event type to fire. Options: nurture_step, send_weekly_update, send_satisfaction_check, send_review_request, send_30day_checkin, invoice_followup, generate_estimate',
        },
        rowNumber: { type: 'number', description: 'Row number of the record to act on' },
        reason:    { type: 'string', description: 'Why this action is being taken — logged for audit trail' },
      },
      required: ['eventType', 'rowNumber', 'reason'],
    },
  },
  {
    name: 'update_record',
    description: 'Update a field on a lead, job, or client record. Use EXACT column names from the sheet. Clients tab valid fields: "Review Requested", "30-Day Check-in Sent", "Satisfaction Score", "Referrals Given". Jobs tab valid fields: "Status", "Last Client Update". Leads tab valid fields: "Status", "Lead Status".',
    input_schema: {
      type: 'object',
      properties: {
        tab:       { type: 'string', enum: ['Leads', 'Jobs', 'Clients'] },
        rowNumber: { type: 'number' },
        field:     { type: 'string' },
        value:     { type: 'string' },
      },
      required: ['tab', 'rowNumber', 'field', 'value'],
    },
  },
  {
    name: 'notify_owner',
    description: 'Send the owner a summary or urgent alert. Set urgent=true to also text them — use when a job is behind schedule, invoice is overdue, or something needs immediate attention.',
    input_schema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        message: { type: 'string' },
        urgent:  { type: 'boolean', description: 'Also send a text for urgent situations' },
      },
      required: ['subject', 'message'],
    },
  },
];

// ─── TOOL EXECUTORS ───────────────────────────────────────────────────────────

const EXECUTORS = {
  read_settings:  async ()     => toolReadSettings(),
  notify_owner:   async (args) => toolNotifyOwner(args),
  text_client:    async (args) => toolTextClient(args),

  read_all_leads: async () => {
    const rows = await readTab('Leads');
    // Return condensed view to save tokens
    return JSON.stringify(rows.map(r => ({
      _row:        r._row,
      name:        `${r['First Name'] || ''} ${r['Last Name'] || ''}`.trim(),
      email:       r['Email'] || '',
      status:      r['Status'] || r['Lead Status'] || '',
      score:       r['Lead Score'] || r['AI Score'] || '',
      lastContact: r['Last Contact'] || r['Last Contacted'] || '',
      nurtureStep: r['Nurture Step'] || '',
      timestamp:   r['Timestamp'] || r['Date Added'] || '',
      assignedTo:  r['Assigned To'] || r['Sales Rep'] || '',
      project:     r['Service Requested'] || r['Service Type'] || '',
      budget:      r['Budget'] || '',
    })));
  },

  read_all_jobs: async () => {
    const rows = await readTab('Jobs');
    return JSON.stringify(rows.map(r => ({
      _row:           r._row,
      jobId:          r['Job ID'] || '',
      clientName:     `${r['First Name'] || ''} ${r['Last Name'] || ''}`.trim() || r['Client Name'] || '',
      status:         r['Job Status'] || r['Status'] || '',
      projectType:    r['Service Type'] || r['Project Type'] || '',
      jobValue:       r['Job Value'] || r['Contract Amount'] || '',
      startDate:      r['Start Date'] || '',
      endDate:        r['End Date'] || r['Est. Completion'] || '',
      depositStatus:  r['Deposit Status'] || '',
      invoiceStatus:  r['Final Invoice Status'] || r['Invoice Status'] || '',
      contractStatus: r['Contract Status'] || '',
      contractSigned: r['Contract Signed Date'] || '',
      kickoffDoc:     r['Kickoff Doc Link'] || '',
      subsNotified:   r['Subs Notified'] || '',
      lastUpdate:     r['Last Client Update'] || r['Last Contact'] || '',
    })));
  },

  read_all_clients: async () => {
    const rows = await readTab('Clients');
    return JSON.stringify(rows.map(r => ({
      _row:           r._row,
      name:           `${r['First Name'] || ''} ${r['Last Name'] || ''}`.trim(),
      email:          r['Email'] || '',
      jobCompleteDate: r['Job Completion Date'] || r['Completion Date'] || '',
      reviewRequested: r['Review Requested'] || '',
      checkInSent:    r['30-Day Check-in Sent'] || r['Check-in Sent'] || '',
      satisfactionScore: r['Satisfaction Score'] || '',
      referralsGiven: r['Referrals Given'] || '',
    })));
  },

  trigger_agent: async ({ eventType, rowNumber, reason }) => {
    logger.info('SmartOrchestrator', `Triggering ${eventType} for row ${rowNumber} — ${reason}`);
    try {
      // Import the simple orchestrator's route function
      const { route } = require('./orchestrator');
      await route(eventType, { rowNumber });
      return `Triggered ${eventType} for row ${rowNumber}`;
    } catch (err) {
      logger.error('SmartOrchestrator', `trigger_agent failed: ${err.message}`);
      return `Failed to trigger ${eventType}: ${err.message}`;
    }
  },

  update_record: async ({ tab, rowNumber, field, value }) => {
    return await updateCell(tab, rowNumber, field, value);
  },
};

// ─── SMART ORCHESTRATOR CLASS ─────────────────────────────────────────────────

class SmartOrchestrator extends BaseAgent {
  constructor() {
    super('SmartOrchestrator', DEFAULT_MODEL, TOOLS, EXECUTORS);
  }

  async runDailyScan() {
    const today = new Date().toLocaleDateString('en-US');

    const systemPrompt = `
You are the master AI operations manager for a home service company. You run every morning and proactively manage the entire business pipeline.

Your job is to scan all leads, jobs, and clients — then take action on anything that needs attention. You make decisions and act autonomously. The owner trusts you to keep the business running smoothly.

TASK — run through each section in order:

═══════════════════════════════
SECTION 1: LEAD PIPELINE SCAN
═══════════════════════════════
Read all leads (read_all_leads), then check each one:

HOT LEADS (score ≥ 80):
- If status is "New" and no contact made: trigger nurture_step immediately (they need follow-up NOW)
- If last contact was more than 3 days ago and status is still "New" or "Contacted": trigger nurture_step

WARM LEADS (score 50–79):
- If no contact in 7+ days: trigger nurture_step
- If nurture step ≥ 4 and no response: update status to "Cold", note why

ALL LEADS:
- If status is "Appointment Scheduled" and appointment was yesterday or earlier: follow up to convert to job
- Flag any leads that have been "Contacted" for 14+ days with no progress

═══════════════════════════════
SECTION 2: ACTIVE JOBS SCAN
═══════════════════════════════
Read all jobs (read_all_jobs), then check each one:

CONTRACTS:
- If contract status is "Sent" and more than 5 days have passed: notify owner to follow up

DEPOSITS:
- If deposit status is "Invoiced" and more than 7 days have passed: trigger invoice_followup
- If deposit status is "Not Paid" and job start date is within 7 days: urgent owner notification

PROGRESS UPDATES:
- If job status is "In Progress" and last client update was more than 7 days ago: trigger send_weekly_update

JOBS BEHIND SCHEDULE:
- If end date has passed and status is not "Complete": notify owner immediately with job details

KICKOFF:
- If contract is signed but no kickoff doc yet: flag for owner

═══════════════════════════════
SECTION 3: CLIENT FOLLOW-UP SCAN
═══════════════════════════════
Read all clients (read_all_clients), then check each one:

REVIEWS:
- If job complete and review not yet requested: trigger send_review_request

30-DAY CHECK-IN:
- If job complete date was 28-32 days ago and check-in not sent: trigger send_30day_checkin

REFERRALS:
- If client gave a good satisfaction score (8+) but no referral follow-up: note for marketing

═══════════════════════════════
SECTION 4: DAILY SUMMARY
═══════════════════════════════
After scanning everything, notify_owner with a clean daily summary:
- Actions taken today
- Urgent items needing personal attention (things you couldn't handle automatically)
- Pipeline health (# hot leads, # active jobs, anything overdue)
- Any budget/schedule concerns

FORMAT the owner notification as a clean daily brief — concise, scannable, no fluff.

TODAY'S DATE: ${today}

IMPORTANT RULES:
- Don't trigger the same action twice for the same row — check current status first
- Be decisive — if something needs attention, act on it. Don't just flag it.
- Focus on actions that move money forward (hot leads, unsigned contracts, unpaid invoices)
- If something is truly urgent and needs the owner's direct involvement, say so clearly
- Keep owner notification under 400 words — they're busy
    `.trim();

    const userMessage = `Run the daily operations scan for ${today}. Scan all leads, jobs, and clients. Take action on everything that needs it, then send the owner a daily brief.`;
    return await this.run(systemPrompt, userMessage, {});
  }

  // Can also run a focused scan on just one area
  async scanLeads() {
    const systemPrompt = `
You are an AI sales manager. Scan all leads and take action on anything that needs attention.
Read all leads, check status/score/last contact dates, and trigger appropriate follow-ups.
Today's date: ${new Date().toLocaleDateString('en-US')}
    `.trim();
    return await this.run(systemPrompt, 'Scan all leads and take action.', {});
  }

  async scanJobs() {
    const systemPrompt = `
You are an AI operations manager. Scan all active jobs and take action on anything that needs attention.
Check contracts, deposits, progress updates, schedule, and subcontractors.
Today's date: ${new Date().toLocaleDateString('en-US')}
    `.trim();
    return await this.run(systemPrompt, 'Scan all jobs and take action.', {});
  }
}

module.exports = new SmartOrchestrator();
