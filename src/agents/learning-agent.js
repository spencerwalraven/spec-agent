/**
 * Learning Agent
 *
 * The memory of the system. After every completed job, this agent:
 *  1. Reads the actual vs estimated costs and timeline
 *  2. Reads client satisfaction data
 *  3. Identifies what went right and what went wrong
 *  4. Writes structured learnings to the Learnings tab
 *  5. Builds a growing knowledge base that makes future estimates more accurate
 *
 * Other agents (Pricing, Planning) query this agent before generating
 * estimates or plans — they get smarter with every completed job.
 */

const { BaseAgent, DEFAULT_MODEL } = require('./base-agent');
const {
  toolReadJob, toolReadSettings, readTab, appendRow, g
} = require('../tools/sheets-compat');
const { toolNotifyOwner } = require('../tools/notify');
const { logger } = require('../utils/logger');

// ─── TOOL DEFINITIONS ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'read_job',
    description: 'Read all data for a completed job',
    input_schema: {
      type: 'object',
      properties: { rowNumber: { type: 'number' } },
      required: ['rowNumber'],
    },
  },
  {
    name: 'read_job_phases',
    description: 'Read all phases for a specific job to understand what actually happened',
    input_schema: {
      type: 'object',
      properties: { jobId: { type: 'string' } },
      required: ['jobId'],
    },
  },
  {
    name: 'read_all_learnings',
    description: 'Read all past learnings from the Learnings tab',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'read_completed_jobs',
    description: 'Read all completed jobs to analyze patterns',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'save_learning',
    description: 'Save a structured learning entry to the Learnings tab',
    input_schema: {
      type: 'object',
      properties: {
        projectType:       { type: 'string', description: 'e.g. "Patio Installation"' },
        jobId:             { type: 'string' },
        estimatedCost:     { type: 'string', description: 'Original estimate in dollars' },
        actualCost:        { type: 'string', description: 'Actual final cost in dollars' },
        costVariancePct:   { type: 'string', description: 'e.g. "+12%" or "-5%"' },
        estimatedDays:     { type: 'string', description: 'Planned timeline in days' },
        actualDays:        { type: 'string', description: 'Actual days to completion' },
        timelineVariance:  { type: 'string', description: 'e.g. "+5 days" or "On schedule"' },
        satisfactionScore: { type: 'string', description: '1-10 client satisfaction' },
        whatWentWell:      { type: 'string', description: 'Key things that went well' },
        whatWentWrong:     { type: 'string', description: 'Issues, delays, cost overruns' },
        keyInsight:        { type: 'string', description: 'The most important thing to remember for future similar projects' },
        adjustmentFactor:  { type: 'string', description: 'Recommended cost adjustment % for future estimates of this type, e.g. "+10%" or "0%"' },
      },
      required: ['projectType', 'jobId', 'keyInsight'],
    },
  },
  {
    name: 'notify_owner',
    description: 'Send the owner a post-job learning summary',
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
  notify_owner:  async (args) => toolNotifyOwner(args),

  read_job_phases: async ({ jobId }) => {
    const rows = await readTab('Job Phases');
    const phases = rows.filter(r => g(r, 'Job ID') === jobId);
    return JSON.stringify(phases.map(r => ({
      phase:         g(r, 'Phase', 'Phase Name'),
      trade:         g(r, 'Trade', 'Assigned To'),
      status:        g(r, 'Status'),
      startDate:     g(r, 'Start Date'),
      endDate:       g(r, 'End Date'),
      completedDate: g(r, 'Completed Date'),
      notes:         g(r, 'Notes'),
    })));
  },

  read_all_learnings: async () => {
    try {
      const rows = await readTab('Learnings');
      return JSON.stringify(rows);
    } catch (_) {
      return '[]'; // Tab may not exist yet
    }
  },

  read_completed_jobs: async () => {
    const rows = await readTab('Jobs');
    const completed = rows.filter(r => {
      const status = (g(r, 'Job Status', 'Status') || '').toLowerCase();
      return status === 'complete' || status === 'completed';
    });
    return JSON.stringify(completed.map(r => ({
      _row:        r._row,
      jobId:       g(r, 'Job ID'),
      projectType: g(r, 'Service Type', 'Project Type'),
      jobValue:    g(r, 'Job Value', 'Contract Amount'),
      startDate:   g(r, 'Start Date'),
      endDate:     g(r, 'End Date'),
      clientSatisfaction: g(r, 'Satisfaction Score', 'Client Rating'),
    })));
  },

  save_learning: async (args) => {
    try {
      await appendRow('Learnings', {
        'Date':               new Date().toLocaleDateString('en-US'),
        'Job ID':             args.jobId || '',
        'Project Type':       args.projectType || '',
        'Estimated Cost':     args.estimatedCost || '',
        'Actual Cost':        args.actualCost || '',
        'Cost Variance %':    args.costVariancePct || '',
        'Estimated Days':     args.estimatedDays || '',
        'Actual Days':        args.actualDays || '',
        'Timeline Variance':  args.timelineVariance || '',
        'Satisfaction Score': args.satisfactionScore || '',
        'What Went Well':     args.whatWentWell || '',
        'What Went Wrong':    args.whatWentWrong || '',
        'Key Insight':        args.keyInsight || '',
        'Adjustment Factor':  args.adjustmentFactor || '0%',
      });
      logger.success('LearningAgent', `Learning saved for ${args.jobId} (${args.projectType})`);
      return `Learning saved for ${args.jobId}`;
    } catch (err) {
      logger.error('LearningAgent', `save_learning failed: ${err.message}`);
      return `Failed to save learning: ${err.message}`;
    }
  },
};

// ─── LEARNING AGENT CLASS ─────────────────────────────────────────────────────

class LearningAgent extends BaseAgent {
  constructor() {
    super('LearningAgent', DEFAULT_MODEL, TOOLS, EXECUTORS);
  }

  // Called after every job completion
  async learnFromJob({ rowNumber }) {
    const systemPrompt = `
You are an AI business analyst for a home service company. Your job is to extract lessons from completed projects and save them so future estimates and plans are more accurate.

TASK — in this exact order:
1. Read the completed job data (read_job, row ${rowNumber})
2. Read all phases for this job (read_job_phases using the Job ID)
3. Read all past learnings (read_all_learnings) — understand patterns already identified
4. Analyze the job thoroughly:
   a. COST ANALYSIS:
      - What was the original estimate vs actual job value?
      - Were there any cost overruns? What caused them?
      - Which trades/phases ran over budget?
   b. TIMELINE ANALYSIS:
      - How many days did each phase actually take vs planned?
      - Were there delays? What caused them?
      - Did material lead times cause issues?
   c. QUALITY ANALYSIS:
      - What was the client satisfaction score?
      - Were there any issues flagged during the job?
      - What did the client specifically praise or complain about?
   d. OPERATIONAL ANALYSIS:
      - Did subs show up on time?
      - Were materials ordered correctly and on time?
      - What would have made this job go smoother?
5. Save a structured learning entry (save_learning) with:
   - Honest assessment of what happened
   - The most important insight for future jobs of this type
   - A recommended cost adjustment % for future estimates
   - Timeline adjustment recommendation
6. Notify the owner with a concise post-job analysis (notify_owner):
   - Job performance vs estimate
   - Client satisfaction
   - Key takeaway
   - How this will improve future estimates

IMPORTANT:
- Be honest and specific — vague insights are useless
- If costs ran over by 12%, say "+12% adjustment recommended for future bathroom projects with tile work"
- Focus on actionable insights — what should change in the NEXT estimate/plan?
- If this job type has been done before, compare it to previous jobs of the same type
    `.trim();

    const userMessage = `Analyze the completed job at row ${rowNumber}, extract learnings, and save them.`;
    return await this.run(systemPrompt, userMessage, { rowNumber });
  }

  // Called by Pricing Agent and Planning Agent before generating estimates
  async getInsights(projectType) {
    try {
      const rows = await readTab('Learnings');
      const relevant = rows.filter(r =>
        (g(r, 'Project Type') || '').toLowerCase().includes(projectType.toLowerCase())
      );

      if (!relevant.length) {
        return `No historical data yet for ${projectType}. Using industry-standard estimates.`;
      }

      // Build a concise summary
      const insights = relevant.map(r => ({
        jobId:             g(r, 'Job ID'),
        date:              g(r, 'Date'),
        costVariance:      g(r, 'Cost Variance %'),
        timelineVariance:  g(r, 'Timeline Variance'),
        satisfaction:      g(r, 'Satisfaction Score'),
        keyInsight:        g(r, 'Key Insight'),
        adjustmentFactor:  g(r, 'Adjustment Factor'),
        whatWentWrong:     g(r, 'What Went Wrong'),
      }));

      // Calculate average adjustment factor
      const factors = insights
        .map(i => parseFloat((i.adjustmentFactor || '0%').replace('%', '')))
        .filter(n => !isNaN(n));
      const avgAdjustment = factors.length
        ? (factors.reduce((a, b) => a + b, 0) / factors.length).toFixed(1) + '%'
        : '0%';

      return JSON.stringify({
        projectType,
        totalJobsCompleted: insights.length,
        recommendedCostAdjustment: avgAdjustment,
        insights,
        summary: `Based on ${insights.length} completed ${projectType} job(s), apply a ${avgAdjustment} cost adjustment to estimates. See individual learnings for details.`,
      });
    } catch (_) {
      return `No historical data available for ${projectType}`;
    }
  }

  // Monthly learning synthesis — finds patterns across all jobs
  async synthesizeLearnings() {
    const systemPrompt = `
You are an AI business analyst. Run a monthly analysis of all completed jobs to find patterns and generate strategic insights for the business owner.

TASK:
1. Read all completed jobs (read_completed_jobs)
2. Read all saved learnings (read_all_learnings)
3. Identify patterns:
   - Which project types are most profitable?
   - Which project types consistently run over budget or timeline?
   - Which trades cause the most delays?
   - What's the average client satisfaction trend?
   - Are there seasonal patterns?
4. Generate strategic recommendations for the owner
5. Notify owner with a concise monthly business intelligence report

Keep it practical — focus on insights that change behavior or pricing strategy.
    `.trim();

    return await this.run(systemPrompt, 'Run the monthly learning synthesis.', {});
  }
}

module.exports = new LearningAgent();
