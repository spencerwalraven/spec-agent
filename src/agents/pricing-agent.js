/**
 * Pricing & Estimation Agent
 *
 * Generates accurate line-item estimates for service projects by:
 *  - Analyzing project scope and square footage
 *  - Fetching real material costs from supplier sites
 *  - Applying local labor rates by trade
 *  - Generating a detailed breakdown
 *  - Creating a Google Doc estimate
 *  - Flagging if budget is realistic
 */

const { BaseAgent, DEFAULT_MODEL } = require('./base-agent');
const { toolReadJob, toolUpdateJob, toolReadSettings, updateCell, readRow } = require('../tools/sheets-compat');
const { toolNotifyOwner } = require('../tools/notify');
const { createDoc }       = require('../tools/docs');
const { logger }          = require('../utils/logger');

// ─── TOOL DEFINITIONS ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'read_job',
    description: 'Read all data for a job — includes site visit notes, measurements, quality tier, square footage if available',
    input_schema: {
      type: 'object',
      properties: {
        rowNumber: { type: 'number', description: 'ID of the job' },
      },
      required: ['rowNumber'],
    },
  },
  {
    name: 'read_settings',
    description: 'Read business settings including target profit margin, contingency %, and default labor rate',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'read_team_rates',
    description: 'Read all team members with their hourly rates and trade specialties — use for accurate labor costing',
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
    name: 'write_materials',
    description: 'Save structured material line items to the Job Materials sheet tab so they appear in the Inventory page of the dashboard',
    input_schema: {
      type: 'object',
      properties: {
        jobId:      { type: 'string',  description: 'Job ID from the job record, e.g. "JOB-001"' },
        jobRow:     { type: 'number',  description: 'Row number of the job in the Jobs tab' },
        clientName: { type: 'string',  description: 'Client full name' },
        items: {
          type: 'array',
          description: 'All material line items for this job',
          items: {
            type: 'object',
            properties: {
              category:   { type: 'string', description: 'Material category, e.g. "Tile", "Cabinets", "Plumbing Fixtures"' },
              item:       { type: 'string', description: 'Specific product or material name' },
              quantity:   { type: 'string', description: 'Amount needed, e.g. "200 sq ft", "12 linear ft", "1 set"' },
              unitCost:   { type: 'string', description: 'Unit price, e.g. "$4.50/sq ft", "$120/ea"' },
              totalCost:  { type: 'string', description: 'Total cost for this line item, e.g. "$900"' },
              bestSource: { type: 'string', description: 'Best supplier, e.g. "Home Depot", "Floor & Decor", "Ferguson", "local supplier"' },
            },
            required: ['category', 'item', 'quantity', 'unitCost', 'totalCost', 'bestSource'],
          },
        },
      },
      required: ['items'],
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

  read_team_rates: async () => {
    const { readTab, g } = require('../tools/sheets-compat');
    const team = await readTab('Team');
    const rates = team
      .filter(t => g(t, 'Active', 'Is Active', 'status') !== 'No' && g(t, 'Active', 'Is Active', 'status') !== 'inactive')
      .map(t => ({
        name:       g(t, 'Name'),
        trade:      g(t, 'Trade / Specialty', 'Trade', 'Specialty', 'trade') || g(t, 'Role', 'role'),
        hourlyRate: parseFloat(g(t, 'Hourly Rate', 'hourlyRate') || '0') || null,
        type:       g(t, 'Type', 'Employee Type', 'employeeType') || 'w2',
      }));
    return JSON.stringify(rates, null, 2);
  },

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

  write_materials: async ({ jobId, jobRow, clientName, items }, ctx) => {
    if (!items?.length) return 'No items to write';
    try {
      const { appendRow } = require('../tools/sheets-compat');
      const effectiveJobId = jobId || '';
      const effectiveRow   = jobRow || ctx?.rowNumber || '';
      const effectiveName  = clientName || '';

      let written = 0;
      for (const it of items) {
        await appendRow('Job Materials', {
          'Job ID': effectiveJobId,
          'Job Row': effectiveRow,
          'Client Name': effectiveName,
          category: it.category || '',
          item: it.item || '',
          quantity: it.quantity || '',
          unitCost: it.unitCost || '',
          totalCost: it.totalCost || '',
          bestSource: it.bestSource || '',
        });
        written++;
      }

      logger.success('PricingAgent', `Wrote ${written} material items to database`);
      return `Saved ${written} material line items to inventory`;
    } catch (err) {
      logger.warn('PricingAgent', `write_materials failed: ${err.message}`);
      return `Could not write materials: ${err.message}`;
    }
  },

  create_estimate_doc: async ({ title, content }, ctx) => {
    try {
      const doc = await createDoc({ title, body: content });
      // Save doc link to job row
      if (ctx.rowNumber) {
        try {
          await updateCell('Jobs', ctx.rowNumber, ['Estimate Doc Link', 'Estimate Link'], doc.docUrl);
        } catch (_) {}
      }
      logger.success('PricingAgent', `Estimate doc created: ${doc.docUrl}`);
      return `Estimate document created: ${doc.docUrl}`;
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
You are an expert home service estimator with 20 years of experience. You generate accurate, professional line-item estimates for service projects.

TASK — in this exact order:
1. Read the business settings (read_settings) — get company name, location, TARGET PROFIT MARGIN, contingency %, and default labor rate
2. Read the job data (read_job, row ${rowNumber}) — get project scope, description, client info, budget. CRITICALLY CHECK:
   - siteVisitNotes — if a salesperson has walked the property, this contains real measurements, specific materials, conditions
   - siteVisitMeasurements — exact dimensions if available
   - squareFootage — measured square footage
   - qualityTier — "budget", "mid-range", "high-end", or "luxury"
   - If site visit data exists, USE IT over any assumptions. It's ground truth from someone who was physically there.
3. Read team labor rates (read_team_rates) — get actual hourly rates for each trade on the team. Use THESE rates for labor, not guesses.
4. Get historical learnings for this project type (get_project_learnings) — apply any recommended cost adjustment factors from past jobs
5. Analyze the project type and scope:
   - What trades are involved? (demo, framing, plumbing, electrical, tile, cabinets, paint, etc.)
   - What materials are needed? If site visit notes mention specific products (e.g. "client wants quartz countertops, Calacatta gold"), use those exact products.
   - What is the square footage? Use measured if available, estimate if not (and flag the assumption).
6. For each major material category, use fetch_material_prices to get current pricing
   - Search for 3-5 key materials (don't search every single item — batch similar materials)
   - Use location from settings for local pricing context
   - If the salesperson noted specific products in site visit notes, search for THOSE exact products
7. Build a complete line-item estimate:

   MATERIALS — itemized by category with:
   - Specific product name (not generic)
   - Quantity with measurement units (sq ft, linear ft, each, etc.)
   - Unit cost from market search
   - Total cost
   - Best supplier to purchase from (Home Depot, Lowe's, Floor & Decor, local supplier, etc.)

   LABOR — by trade, using REAL team rates from read_team_rates:
   - Trade name + crew member name if available
   - Hours estimated (use detailed breakdown: X hours for demo, Y hours for install, etc.)
   - Hourly rate FROM THE TEAM DATA (not a guess). If no team member matches the trade, use the default labor rate from settings.
   - If a trade is done by a subcontractor (employee_type = "sub"), list them under SUBCONTRACTORS with a flat bid

   SUBCONTRACTORS — for trades not done in-house:
   - Trade + estimated flat bid

   OVERHEAD & PROFIT — use the TARGET MARGIN from settings (not a hardcoded 25%)
   CONTINGENCY — use the CONTINGENCY % from settings (not a hardcoded 10%)
   TOTAL

8. Create a Google Doc with the full estimate (create_estimate_doc)
9. Write material line items to the Job Materials tab (write_materials):
   - Include ALL materials from your estimate (not labor or overhead — materials only)
   - For each item include: category, item name, quantity, unit cost, total cost, best source to purchase
   - This powers the Inventory page in the dashboard — be thorough
10. Update the job record:
   - Set "Estimate Amount" or "Job Value" to the total
   - Set "Estimate Status" to "Ready for Review"
11. Notify the owner with a summary:
   - Total estimate and margin applied
   - Whether it aligns with client's budget
   - Any concerns or budget gaps
   - What assumptions were made (if no site visit data)
   - What info would improve accuracy (missing measurements, material selections, etc.)
   - Link to the estimate doc

ESTIMATE FORMAT (use this structure in the doc):
---
ESTIMATE — [Project Type] — [Client Name]
Prepared by: [Company Name]
Date: [today]
${'{'}Site Visit: [date if available, or "Pending — estimate based on initial description"]${'}'}
---
PROJECT SCOPE
[description — include measurements from site visit if available]
Quality Tier: [budget / mid-range / high-end / luxury]
Square Footage: [measured or estimated — note which]

LINE ITEMS

DEMO & PREP
  [item]: [qty] — $X
  ...

MATERIALS (itemized)
  [Category]
    [Specific product] × [qty] @ $X/unit = $X  [Supplier]
    ...

LABOR (from team rates)
  [Trade — crew member name]: [X hrs] @ $X/hr = $X
  ...

SUBCONTRACTORS
  [Trade]: $X (flat bid estimate)
  ...

SUBTOTAL: $X
Overhead & Profit ([margin]%): $X
Contingency ([contingency]%): $X
---
TOTAL ESTIMATE: $X

BUDGET COMPARISON
Client budget: $X
Estimate: $X
[Aligned / Over budget by $X / Under budget by $X]

ASSUMPTIONS & NOTES
- [List any assumptions made due to missing info]
- [What would improve this estimate: "Site visit measurements would refine tile quantities"]
---

CRITICAL RULES:
- Be specific with quantities and unit costs — no vague ranges
- Use REAL team hourly rates from read_team_rates, not guesses
- Use the owner's TARGET MARGIN from settings, not a default
- If site visit notes exist, treat them as the source of truth
- If no site visit, clearly list every assumption and recommend a site visit
- Flag budget misalignment clearly — the owner needs to know before quoting the client
- Keep the doc professional — this may be shared with the client after owner review
    `.trim();

    const userMessage = `Generate a detailed line-item estimate for the job at row ${rowNumber}.`;
    return await this.run(systemPrompt, userMessage, { rowNumber });
  }
}

module.exports = new PricingAgent();
