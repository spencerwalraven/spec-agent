/**
 * Project Planning Agent
 *
 * When a job is confirmed, this agent:
 *  1. Breaks the project into phases based on project type + scope
 *  2. Assigns trades/crew to each phase
 *  3. Creates a realistic timeline with dependencies
 *  4. Writes all phases to the Job Phases tab
 *  5. Generates the full kickoff document
 *  6. Schedules sub notifications
 *  7. Notifies the owner with the plan
 */

const { BaseAgent, DEFAULT_MODEL } = require('./base-agent');
const {
  toolReadJob, toolUpdateJob, toolReadSettings, updateCell,
  appendRow, readTab, g
} = require('../tools/sheets');
const { sendEmail }       = require('../tools/gmail');
const { toolNotifyOwner } = require('../tools/notify');
const { createDoc }       = require('../tools/docs');
const { logger }          = require('../utils/logger');

// ─── TOOL DEFINITIONS ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'read_job',
    description: 'Read all data for a job from the Jobs tab',
    input_schema: {
      type: 'object',
      properties: { rowNumber: { type: 'number' } },
      required: ['rowNumber'],
    },
  },
  {
    name: 'read_settings',
    description: 'Read business settings: company name, owner info, etc.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'read_team',
    description: 'Read the Team tab to get available crew and subcontractors with their trades/specialties',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'read_equipment',
    description: 'Read the Equipment tab to see all company equipment — vehicles, tools, ladders, scaffolding, etc. Check availability before assigning to a job.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'assign_equipment',
    description: 'Assign a piece of equipment to this job. Updates the Equipment tab.',
    input_schema: {
      type: 'object',
      properties: {
        equipmentId: { type: 'string', description: 'Equipment ID, e.g. EQ-12345' },
        equipmentRow: { type: 'number', description: 'Row number of the equipment in the Equipment tab' },
        jobId: { type: 'string', description: 'Job ID to assign to' },
        assignedTo: { type: 'string', description: 'Person responsible for this equipment on the job' },
      },
      required: ['equipmentRow', 'jobId'],
    },
  },
  {
    name: 'get_project_learnings',
    description: 'Get historical data and learnings from similar past projects to inform planning',
    input_schema: {
      type: 'object',
      properties: {
        projectType: { type: 'string', description: 'Type of project, e.g. "Kitchen Remodel", "Bathroom Renovation"' },
      },
      required: ['projectType'],
    },
  },
  {
    name: 'create_phase',
    description: 'Add a phase to the Job Phases tab for this job',
    input_schema: {
      type: 'object',
      properties: {
        jobId:        { type: 'string', description: 'Job ID, e.g. JOB-001' },
        phaseName:    { type: 'string', description: 'Name of the phase, e.g. "Demo", "Rough Plumbing", "Tile Work"' },
        trade:        { type: 'string', description: 'Trade responsible, e.g. "Plumber", "Electrician", "Tile Setter", "Crew"' },
        assignedTo:   { type: 'string', description: 'Name of person/sub assigned' },
        startDate:    { type: 'string', description: 'Planned start date MM/DD/YYYY' },
        endDate:      { type: 'string', description: 'Planned end date MM/DD/YYYY' },
        durationDays: { type: 'number', description: 'Duration in days' },
        notes:        { type: 'string', description: 'Any special notes or dependencies' },
        order:        { type: 'number', description: 'Phase order number (1, 2, 3…)' },
      },
      required: ['jobId', 'phaseName', 'trade', 'startDate', 'endDate', 'order'],
    },
  },
  {
    name: 'create_kickoff_doc',
    description: 'Create the full kickoff/project plan document in Google Docs',
    input_schema: {
      type: 'object',
      properties: {
        title:   { type: 'string' },
        content: { type: 'string', description: 'Full kickoff document content' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'update_job',
    description: 'Update a field in the Jobs tab',
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
    name: 'notify_sub',
    description: 'Send a notification email to a subcontractor about their assigned phases',
    input_schema: {
      type: 'object',
      properties: {
        subName:    { type: 'string' },
        subEmail:   { type: 'string' },
        subject:    { type: 'string' },
        message:    { type: 'string' },
      },
      required: ['subEmail', 'subject', 'message'],
    },
  },
  {
    name: 'notify_owner',
    description: 'Send the owner the project plan summary',
    input_schema: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['subject', 'message'],
    },
  },
];

// ─── TOOL EXECUTORS ───────────────────────────────────────────────────────────

const EXECUTORS = {
  read_job:      async (args) => toolReadJob(args),
  read_settings: async ()     => toolReadSettings(),
  notify_owner:  async (args) => toolNotifyOwner(args),

  read_team: async () => {
    const rows = await readTab('Team');
    return JSON.stringify(rows.map(r => ({
      name:      g(r, 'Name', 'Full Name'),
      role:      g(r, 'Role', 'Title'),
      trade:     g(r, 'Trade / Specialty', 'Specialty', 'Trade'),
      email:     g(r, 'Email', 'Email Address'),
      phone:     g(r, 'Phone', 'Phone Number'),
      type:      g(r, 'Type', 'Employee Type'),
      active:    g(r, 'Active', 'Status'),
    })));
  },

  read_equipment: async () => {
    const rows = await readTab('Equipment');
    const items = rows
      .filter((r, i) => (r['Status'] || '') !== 'Retired')
      .map((r, i) => ({
        _row:        i + 2,
        equipmentId: g(r, 'Equipment ID'),
        name:        g(r, 'Name'),
        category:    g(r, 'Category'),
        makeModel:   g(r, 'Make/Model'),
        status:      g(r, 'Status'),
        assignedTo:  g(r, 'Assigned To'),
        assignedJob: g(r, 'Assigned Job'),
      }));
    return JSON.stringify(items);
  },

  assign_equipment: async ({ equipmentRow, jobId, assignedTo }) => {
    try {
      await updateCell('Equipment', equipmentRow, 'Status', 'In Use');
      await updateCell('Equipment', equipmentRow, 'Assigned Job', jobId || '');
      await updateCell('Equipment', equipmentRow, 'Assigned To', assignedTo || '');
      return `Equipment (row ${equipmentRow}) assigned to ${jobId}${assignedTo ? ', responsibility: ' + assignedTo : ''}`;
    } catch (err) {
      return `Failed to assign equipment: ${err.message}`;
    }
  },

  get_project_learnings: async ({ projectType }) => {
    try {
      const learningAgent = require('./learning-agent');
      return await learningAgent.getInsights(projectType);
    } catch (_) {
      return `No historical data available yet for ${projectType}. Use industry-standard timelines.`;
    }
  },

  create_phase: async ({ jobId, phaseName, trade, assignedTo, startDate, endDate, durationDays, notes, order }) => {
    try {
      await appendRow('Job Phases', {
        'Job ID':         jobId,
        'Phase':          phaseName,
        'Phase Name':     phaseName,
        'Trade':          trade,
        'Assigned To':    assignedTo || '',
        'Start Date':     startDate,
        'End Date':       endDate,
        'Duration (Days)': durationDays || '',
        'Status':         'Pending',
        'Order':          order,
        'Notes':          notes || '',
        'Completed Date': '',
      });
      logger.info('PlanningAgent', `Phase created: ${phaseName} (${trade}) ${startDate}–${endDate}`);
      return `Phase "${phaseName}" added — ${trade}, ${startDate} to ${endDate}`;
    } catch (err) {
      return `Failed to create phase: ${err.message}`;
    }
  },

  create_kickoff_doc: async ({ title, content }, ctx) => {
    try {
      const doc = await createDoc({ title, body: content });
      if (ctx.rowNumber) {
        try {
          await updateCell('Jobs', ctx.rowNumber, ['Kickoff Doc Link', 'Project Plan Link'], doc.docUrl);
        } catch (_) {}
      }
      logger.success('PlanningAgent', `Kickoff doc created: ${doc.docUrl}`);
      return `Kickoff document created: ${doc.docUrl}`;
    } catch (err) {
      return `Failed to create kickoff doc: ${err.message}`;
    }
  },

  update_job: async (args) => toolUpdateJob(args),

  notify_sub: async ({ subName, subEmail, subject, message }) => {
    try {
      await sendEmail({ to: subEmail, subject, body: message });
      logger.info('PlanningAgent', `Sub notified: ${subName || subEmail}`);
      return `Notification sent to ${subName || subEmail}`;
    } catch (err) {
      return `Failed to notify sub: ${err.message}`;
    }
  },
};

// ─── PLANNING AGENT CLASS ─────────────────────────────────────────────────────

class PlanningAgent extends BaseAgent {
  constructor() {
    super('PlanningAgent', DEFAULT_MODEL, TOOLS, EXECUTORS);
  }

  async planProject({ rowNumber }) {
    const systemPrompt = `
You are an expert home remodeling project manager with 20 years of experience planning and executing remodeling projects. Your job is to create a comprehensive, realistic project plan.

TASK — in this exact order:
1. Read the business settings (read_settings)
2. Read the job data (read_job, row ${rowNumber}) — get project type, scope, start date, client info, budget
3. Read the team roster (read_team) — know who's available and what their specialties are
3.5. Read available equipment (read_equipment) — note what vehicles, tools, scaffolding, and ladders are available vs. already assigned. Factor this into your plan and assign needed equipment using assign_equipment.
4. Get historical learnings for this project type (get_project_learnings) — use past data to inform timelines
5. Plan the project phases:
   - Break the project into logical phases in the correct order
   - Assign the right trade/person to each phase based on the team roster
   - Set realistic start/end dates (consider typical durations + dependencies)
   - Account for lead times on materials (cabinets take 4-6 weeks, tile/flooring 1-2 weeks, etc.)
   - Use create_phase for EACH phase — do not skip any
6. Create the kickoff document (create_kickoff_doc) with:
   - Project overview and client details
   - Complete phase schedule with dates and assigned trades
   - Equipment Assigned: [list vehicles, major tools, scaffolding assigned to this job]
   - Materials list with order-by dates
   - Special instructions and client preferences
   - Contact list (client, owner, key subs)
   - Access instructions (lockbox, entry notes)
7. Update the job record:
   - Set "Kickoff Doc Link" to the doc URL
   - Set "Phases Total" to the number of phases created
8. Notify each sub assigned to the project (notify_sub) — brief email with their phases and start dates
9. Notify the owner with the complete plan summary

PHASE PLANNING GUIDELINES BY PROJECT TYPE:

Kitchen Remodel (8-14 weeks):
  1. Demo & Disposal (2-3 days)
  2. Rough Plumbing rough-in (2-3 days) — if moving fixtures
  3. Rough Electrical (2-3 days)
  4. Framing/Structural (1-2 days) — if applicable
  5. Insulation & Drywall (3-4 days)
  6. Cabinet Installation (2-4 days)
  7. Countertop Template (1 day) — countertops take 2-3 weeks to fabricate
  8. Tile Backsplash (2-3 days)
  9. Countertop Install (1 day)
  10. Appliance Install (1-2 days)
  11. Plumbing Fixtures (1-2 days)
  12. Electrical Fixtures/Outlets (1-2 days)
  13. Flooring (3-5 days)
  14. Paint (3-5 days)
  15. Punch List & Final Inspection (1-2 days)

Bathroom Renovation (3-6 weeks):
  1. Demo (1-2 days)
  2. Rough Plumbing (1-2 days)
  3. Rough Electrical (1 day)
  4. Waterproofing/Cement Board (1-2 days)
  5. Tile Work (3-5 days)
  6. Vanity & Cabinet Install (1 day)
  7. Plumbing Fixtures (1 day)
  8. Electrical Fixtures (1 day)
  9. Paint (1-2 days)
  10. Punch List (1 day)

Basement Finish (6-10 weeks):
  1. Framing (3-5 days)
  2. Rough Electrical (2-3 days)
  3. Rough Plumbing (2-3 days) — if adding bathroom
  4. HVAC rough-in (1-2 days)
  5. Insulation (2 days)
  6. Drywall (4-6 days)
  7. Paint (3-4 days)
  8. Flooring (3-4 days)
  9. Trim & Doors (2-3 days)
  10. Electrical Fixtures (1-2 days)
  11. Bathroom Tile (if applicable) (3-4 days)
  12. Punch List (1-2 days)

For other project types, apply similar logic based on what trades are involved.

IMPORTANT:
- Use the actual start date from the job record as the beginning
- Don't schedule sub phases to overlap unless they can truly run in parallel
- Leave buffer between phases (1 day minimum)
- Flag any material lead time issues to the owner
- If the project is large (8+ weeks), notify subs at least 2 weeks before their phase starts
- Keep sub notification emails brief and professional — name, job address, phase, dates, what to bring
    `.trim();

    const userMessage = `Create a complete project plan for the job at row ${rowNumber}. Build all phases, create the kickoff doc, notify subs, and brief the owner.`;
    return await this.run(systemPrompt, userMessage, { rowNumber });
  }
}

module.exports = new PlanningAgent();
