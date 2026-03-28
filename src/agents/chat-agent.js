/**
 * Chat Agent — AI business assistant
 * Answers questions about leads, jobs, clients, financials, team.
 * Has tools to query the database and take actions.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { query, getOne, getAll } = require('../db');

const client = new Anthropic();
const COMPANY_ID = 1;

// ─── DATABASE TOOLS ───────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'get_business_snapshot',
    description: 'Get a full snapshot of the business: lead counts, active jobs, pipeline value, revenue, open tasks. Call this first for general business questions.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_leads',
    description: 'Get leads from the database. Can filter by status (new, contacted, qualified, converted, lost) or get all.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status, or omit for all leads' },
        limit: { type: 'number', description: 'Max leads to return (default 20)' },
      },
    },
  },
  {
    name: 'get_jobs',
    description: 'Get jobs from the database. Can filter by status (active, pending, completed, proposal).',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status, or omit for all jobs' },
      },
    },
  },
  {
    name: 'get_team',
    description: 'Get team members and their performance data.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_financials',
    description: 'Get financial summary: total revenue, pipeline value, paid invoices, outstanding invoices, average job value.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_tasks',
    description: 'Get open tasks, optionally filtered by priority.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'open, completed, or omit for open tasks' },
      },
    },
  },
  {
    name: 'set_goal',
    description: 'Save a business goal (revenue target, lead target, etc.)',
    input_schema: {
      type: 'object',
      properties: {
        goal_type: { type: 'string', description: 'e.g. monthly_revenue, leads_target, jobs_target' },
        target_value: { type: 'number', description: 'The numeric target' },
        period: { type: 'string', description: 'monthly, quarterly, yearly' },
        notes: { type: 'string', description: 'Optional description of the goal' },
      },
      required: ['goal_type', 'target_value'],
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task or reminder.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', description: 'urgent, high, medium, low' },
        assigned_to: { type: 'string', description: 'Name of team member' },
        due_date: { type: 'string', description: 'ISO date string' },
      },
      required: ['title'],
    },
  },
];

// ─── TOOL EXECUTORS ───────────────────────────────────────────────────────────

async function executeTool(name, input) {
  switch (name) {
    case 'get_business_snapshot': {
      const [leads, jobs, invoices, tasks] = await Promise.all([
        getAll(`SELECT status, score_label, COUNT(*) as count FROM leads WHERE company_id=$1 GROUP BY status, score_label`, [COMPANY_ID]),
        getAll(`SELECT status, estimated_value, actual_value FROM jobs WHERE company_id=$1`, [COMPANY_ID]),
        getAll(`SELECT status, amount FROM invoices WHERE company_id=$1`, [COMPANY_ID]),
        getAll(`SELECT priority, COUNT(*) as count FROM tasks WHERE company_id=$1 AND status='open' GROUP BY priority`, [COMPANY_ID]),
      ]);

      const activeJobs = jobs.filter(j => j.status === 'active');
      const pipeline = jobs.filter(j => ['active','pending','proposal'].includes(j.status))
        .reduce((sum, j) => sum + parseFloat(j.estimated_value || 0), 0);
      const revenue = invoices.filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
      const outstanding = invoices.filter(i => i.status !== 'paid')
        .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);

      return JSON.stringify({
        leads: {
          total: leads.reduce((s, r) => s + parseInt(r.count), 0),
          by_status: leads.reduce((o, r) => { o[r.status] = (o[r.status]||0) + parseInt(r.count); return o; }, {}),
          hot: leads.filter(r => r.score_label === 'Hot').reduce((s,r) => s+parseInt(r.count),0),
        },
        jobs: {
          total: jobs.length,
          active: activeJobs.length,
          pipeline_value: pipeline,
          by_status: jobs.reduce((o, j) => { o[j.status] = (o[j.status]||0)+1; return o; }, {}),
        },
        financials: {
          total_revenue_collected: revenue,
          outstanding_invoices: outstanding,
        },
        tasks: {
          open: tasks.reduce((s,t) => s+parseInt(t.count),0),
          urgent: tasks.find(t => t.priority==='urgent')?.count || 0,
        },
      }, null, 2);
    }

    case 'get_leads': {
      let sql = `SELECT name, email, phone, service, score, score_label, status, notes, created_at FROM leads WHERE company_id=$1`;
      const params = [COMPANY_ID];
      if (input.status) { sql += ` AND status=$2`; params.push(input.status); }
      sql += ` ORDER BY score DESC, created_at DESC LIMIT $${params.length+1}`;
      params.push(input.limit || 20);
      const rows = await getAll(sql, params);
      return JSON.stringify(rows, null, 2);
    }

    case 'get_jobs': {
      let sql = `SELECT j.job_ref, j.title, j.service, j.status, j.estimated_value, j.actual_value, j.material_cost, j.start_date, j.end_date, j.notes, c.name as client_name FROM jobs j LEFT JOIN clients c ON j.client_id=c.id WHERE j.company_id=$1`;
      const params = [COMPANY_ID];
      if (input.status) { sql += ` AND j.status=$2`; params.push(input.status); }
      sql += ` ORDER BY j.created_at DESC`;
      const rows = await getAll(sql, params);
      return JSON.stringify(rows, null, 2);
    }

    case 'get_team': {
      const rows = await getAll(
        `SELECT name, role, email, phone, status, jobs_completed, performance_score FROM team WHERE company_id=$1 ORDER BY name`,
        [COMPANY_ID]
      );
      return JSON.stringify(rows, null, 2);
    }

    case 'get_financials': {
      const [invoices, jobs] = await Promise.all([
        getAll(`SELECT invoice_type, status, amount, paid_at, due_date FROM invoices WHERE company_id=$1 ORDER BY created_at DESC`, [COMPANY_ID]),
        getAll(`SELECT estimated_value, actual_value, material_cost, labor_cost, status FROM jobs WHERE company_id=$1`, [COMPANY_ID]),
      ]);
      const paid = invoices.filter(i => i.status === 'paid').reduce((s,i) => s+parseFloat(i.amount||0), 0);
      const pending = invoices.filter(i => i.status !== 'paid').reduce((s,i) => s+parseFloat(i.amount||0), 0);
      const pipeline = jobs.filter(j => ['active','pending','proposal'].includes(j.status)).reduce((s,j) => s+parseFloat(j.estimated_value||0), 0);
      const avgJob = jobs.length ? jobs.reduce((s,j) => s+parseFloat(j.estimated_value||0),0)/jobs.length : 0;
      return JSON.stringify({ paid_revenue: paid, outstanding: pending, pipeline_value: pipeline, average_job_value: Math.round(avgJob), invoices, jobs }, null, 2);
    }

    case 'get_tasks': {
      const status = input.status || 'open';
      const rows = await getAll(
        `SELECT title, description, priority, assigned_to, due_date, status FROM tasks WHERE company_id=$1 AND status=$2 ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, due_date ASC`,
        [COMPANY_ID, status]
      );
      return JSON.stringify(rows, null, 2);
    }

    case 'set_goal': {
      await query(
        `INSERT INTO goals (company_id, goal_type, target_value, period, notes, created_at)
         VALUES ($1,$2,$3,$4,$5,NOW())
         ON CONFLICT (company_id, goal_type, period) DO UPDATE SET target_value=$3, notes=$5, updated_at=NOW()`,
        [COMPANY_ID, input.goal_type, input.target_value, input.period||'monthly', input.notes||'']
      );
      return `Goal saved: ${input.goal_type} = ${input.target_value} (${input.period||'monthly'})`;
    }

    case 'create_task': {
      await query(
        `INSERT INTO tasks (company_id, title, description, priority, assigned_to, due_date, status)
         VALUES ($1,$2,$3,$4,$5,$6,'open')`,
        [COMPANY_ID, input.title, input.description||'', input.priority||'medium', input.assigned_to||'', input.due_date||null]
      );
      return `Task created: ${input.title}`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

// ─── MAIN CHAT FUNCTION ───────────────────────────────────────────────────────

async function chat(messages, companyName) {
  const today = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  const systemPrompt = `You are an AI business assistant built into the SPEC CRM dashboard for ${companyName || 'this business'}. Today is ${today}.

You have direct access to the business's live database — leads, jobs, clients, team, financials, and tasks. Use your tools to pull real data before answering questions. Always be specific and data-driven.

You can:
- Answer questions about leads, jobs, revenue, pipeline, and team performance
- Set business goals (revenue targets, lead targets, etc.)
- Create tasks and reminders
- Draft emails or follow-up messages
- Give prioritized recommendations on what to focus on
- Analyze trends and flag risks (overdue invoices, stale leads, over-budget jobs)

Keep responses concise and actionable. Use numbers and specifics. Format with bullet points when listing multiple items. If asked to draft an email, write a complete ready-to-send message.`;

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    tools: TOOLS,
    messages,
  });

  // Handle tool use loop
  let currentMessages = [...messages];
  let currentResponse = response;

  while (currentResponse.stop_reason === 'tool_use') {
    const toolUses = currentResponse.content.filter(b => b.type === 'tool_use');
    const toolResults = [];

    for (const toolUse of toolUses) {
      const result = await executeTool(toolUse.name, toolUse.input);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    currentMessages = [
      ...currentMessages,
      { role: 'assistant', content: currentResponse.content },
      { role: 'user', content: toolResults },
    ];

    currentResponse = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      messages: currentMessages,
    });
  }

  const textBlock = currentResponse.content.find(b => b.type === 'text');
  return textBlock?.text || 'I could not generate a response.';
}

module.exports = { chat };
