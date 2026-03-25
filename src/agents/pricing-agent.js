/**
 * Pricing & Estimation Agent
 *
 * Generates accurate line-item estimates for remodeling projects by:
 *  - Analyzing project scope and square footage
 *  - Fetching real material costs from supplier sites
 *  - Applying local labor rates by trade
 *  - Generating a detailed breakdown
 *  - Creating a Google Doc estimate
 *  - Flagging if budget is realistic
 */

const { BaseAgent, DEFAULT_MODEL } = require('./base-agent');
const { toolReadJob, toolUpdateJob, toolReadSettings, updateCell, readRow } = require('../tools/sheets');
const { toolNotifyOwner } = require('../tools/notify');
const { createDoc }       = require('../tools/docs');
const { logger }          = require('../utils/logger');

// ─── TOOL DEFINITIONS ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'read_job',
    description: 'Read all data for a job from the Jobs tab by row number',
    input_schema: {
      type: 'object',
      properties: {
        rowNumber: { type: 'number', description: 'Row number of the job (header = row 1)' },
      },
      required: ['rowNumber'],
    },
  },
  {
    name: 'read_settings',
    description: 'Read business settings: company name, owner name, location, etc.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_project_learnings',
    description: 'Get historical data from past completed jobs of the same project type — use this to adjust estimate accuracy',
    input_schema: {
      type: 'object',
      properties: {
        projectType: { type: 'string', description: 'Project type to look up, e.g. "Kitchen Remodel"' },
      },
      required: ['projectType'],
    },
  },
  {
    name: 'fetch_material_prices',
    description: 'Search for current material prices for a specific material or product. Returns pricing data from supplier sites.',
    input_schema: {
      type: 'object',
      properties: {
        material: { type: 'string', description: 'Material to search for, e.g. "12x24 porcelain floor tile per sq ft", "kitchen cabinet linear foot cost 2024"' },
        location:  { type: 'string', description: 'City/state for local pricing context, e.g. "Grand Rapids, MI"' },
      },
      required: ['material'],
    },
  },
  {
    name: 'create_estimate_doc',
    description: 'Create a Google Doc with the full line-item estimate',
    input_schema: {
      type: 'object',
      properties: {
        title:   { type: 'string', description: 'Document title, e.g. "Estimate — Johnson Kitchen Remodel"' },
        content: { type: 'string', description: 'Full estimate content in plain text with clear sections' },
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
    name: 'notify_owner',
    description: 'Send the owner an alert about the estimate — budget concerns, high value job, etc.',
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

  get_project_learnings: async ({ projectType }) => {
    try {
      const learningAgent = require('./learning-agent');
      return await learningAgent.getInsights(projectType);
    } catch (_) {
      return `No historical data available for ${projectType}`;
    }
  },

  fetch_material_prices: async ({ material, location }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return `Use your training knowledge for typical 2024-2025 US market costs for: ${material}${location ? ` in ${location}` : ''}`;
    }
    try {
      const query = `${material} cost price per unit installed 2024 2025${location ? ` ${location}` : ' Midwest USA'}`;
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key:      apiKey,
          query,
          search_depth: 'basic',
          max_results:  5,
          include_answer: true,
        }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();

      const snippets = [];
      if (data.answer) snippets.push(`Summary: ${data.answer}`);
      if (data.results?.length) {
        data.results.slice(0, 4).forEach(r => {
          if (r.content) snippets.push(`[${r.title}] ${r.content.slice(0, 300)}`);
        });
      }

      const result = snippets.length
        ? snippets.join('\n\n')
        : `No results found. Use training knowledge for: ${material}`;

      logger.info('PricingAgent', `Tavily search: "${material.slice(0, 60)}" → ${result.slice(0, 100)}…`);
      return result;
    } catch (err) {
      logger.warn('PricingAgent', `fetch_material_prices failed: ${err.message} — using knowledge fallback`);
      return `Use your training knowledge for typical 2024-2025 US market costs for: ${material}${location ? ` in ${location}` : ''}`;
    }
  },

  create_estimate_doc: async ({ title, content }, ctx) => {
    try {
      const doc = await createDoc(title, content);
      // Save doc link to job row
      if (ctx.rowNumber) {
        try {
          await updateCell('Jobs', ctx.rowNumber, ['Estimate Doc Link', 'Estimate Link'], doc.url);
        } catch (_) {}
      }
      logger.success('PricingAgent', `Estimate doc created: ${doc.url}`);
      return `Estimate document created: ${doc.url}`;
    } catch (err) {
      logger.error('PricingAgent', `create_estimate_doc failed: ${err.message}`);
      return `Failed to create doc: ${err.message}`;
    }
  },

  update_job: async (args) => toolUpdateJob(args),
};

// ─── PRICING AGENT CLASS ──────────────────────────────────────────────────────

class PricingAgent extends BaseAgent {
  constructor() {
    super('PricingAgent', DEFAULT_MODEL, TOOLS, EXECUTORS);
  }

  async generateEstimate({ rowNumber }) {
    const systemPrompt = `
You are an expert home remodeling estimator with 20 years of experience. You generate accurate, professional line-item estimates for remodeling projects.

TASK — in this exact order:
1. Read the business settings (read_settings) — get company name, location
2. Read the job data (read_job, row ${rowNumber}) — get project scope, description, client info, budget
3. Get historical learnings for this project type (get_project_learnings) — apply any recommended cost adjustment factors from past jobs
4. Analyze the project type and scope:
   - What trades are involved? (demo, framing, plumbing, electrical, tile, cabinets, paint, etc.)
   - What materials are needed?
   - What is the approximate square footage or linear footage?
4. For each major material category, use fetch_material_prices to get current pricing
   - Search for 3-5 key materials (don't search every single item — batch similar materials)
   - Use location from settings for local pricing context
5. Build a complete line-item estimate:
   - Materials (itemized by category with unit costs)
   - Labor (by trade, with hours × rate)
   - Subcontractor costs if applicable
   - Overhead + profit margin (typically 20-30%)
   - Contingency buffer (typically 10%)
   - TOTAL
6. Create a Google Doc with the full estimate (create_estimate_doc)
7. Update the job record:
   - Set "Estimate Amount" or "Job Value" to the total
   - Set "Estimate Status" to "Ready for Review"
8. Notify the owner with a summary:
   - Total estimate
   - Whether it aligns with client's budget
   - Any concerns or budget gaps
   - Link to the estimate doc

ESTIMATE FORMAT (use this structure in the doc):
---
ESTIMATE — [Project Type] — [Client Name]
Prepared by: [Company Name]
Date: [today]
---
PROJECT SCOPE
[brief description]

LINE ITEMS
DEMO & PREP
  Demo existing [x]: $X
  ...

MATERIALS
  [Category]: [item] × [qty] @ $X/unit = $X
  ...

LABOR
  [Trade]: [X hrs] @ $X/hr = $X
  ...

SUBCONTRACTORS
  [Trade]: $X (estimated)
  ...

SUBTOTAL: $X
Overhead & Profit (25%): $X
Contingency (10%): $X
TOTAL ESTIMATE: $X

BUDGET NOTES
Client budget: $X
Estimate: $X
[Aligned / Over budget by $X / Under budget]
---

IMPORTANT:
- Be specific with quantities and unit costs — no vague ranges
- Use realistic 2024-2025 Midwest market rates as baseline
- If client budget is significantly lower than estimate, flag it clearly for the owner
- Keep the doc professional — this may be shared with the client
    `.trim();

    const userMessage = `Generate a detailed line-item estimate for the job at row ${rowNumber}.`;
    return await this.run(systemPrompt, userMessage, { rowNumber });
  }
}

module.exports = new PricingAgent();
