/**
 * Change Order Agent
 * Generates formal change order docs, emails them to clients for approval,
 * and handles approve/decline responses.
 */

const { BaseAgent, DEFAULT_MODEL } = require('./base-agent');
const { toolReadJob, toolUpdateJob, toolReadSettings, readTab, appendRow, updateCell, g } = require('../tools/sheets-compat');
const { toolSendEmail } = require('../tools/gmail');
const { toolCreateDoc }  = require('../tools/docs');
const { toolNotifyOwner, toolTextClient } = require('../tools/notify');
const { logger } = require('../utils/logger');
const crypto = require('crypto');

// ─── TOOL DEFINITIONS ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'read_settings',
    description: 'Read company settings',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'read_job',
    description: 'Read job data by row number',
    input_schema: { type: 'object', properties: { rowNumber: { type: 'number' } }, required: ['rowNumber'] },
  },
  {
    name: 'create_change_order_doc',
    description: 'Create a professional Google Doc for the change order',
    input_schema: {
      type: 'object',
      properties: {
        title:          { type: 'string' },
        content:        { type: 'string', description: 'Full change order document content' },
        costImpact:     { type: 'number', description: 'Additional cost in dollars (positive = more $, negative = less $)' },
        timelineImpact: { type: 'number', description: 'Additional days to project timeline (0 if none)' },
        description:    { type: 'string', description: 'One-sentence summary of what is changing' },
      },
      required: ['title', 'content', 'costImpact', 'description'],
    },
  },
  {
    name: 'send_for_approval',
    description: 'Email the change order to the client with approve/decline links',
    input_schema: {
      type: 'object',
      properties: {
        to:             { type: 'string' },
        clientName:     { type: 'string' },
        subject:        { type: 'string' },
        message:        { type: 'string' },
        docUrl:         { type: 'string' },
        approveUrl:     { type: 'string' },
        declineUrl:     { type: 'string' },
      },
      required: ['to', 'clientName', 'subject', 'message', 'docUrl', 'approveUrl', 'declineUrl'],
    },
  },
  {
    name: 'notify_owner',
    description: 'Notify the owner about the change order',
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

function makeToken() {
  return crypto.randomBytes(20).toString('hex');
}

const EXECUTORS = {
  read_settings: async () => toolReadSettings(),
  read_job:      async (args) => toolReadJob(args),

  create_change_order_doc: async ({ title, content, costImpact, timelineImpact, description }, ctx) => {
    try {
      const { createDoc } = require('../tools/docs');
      const doc = await createDoc({ title, body: content });

      // Generate approval token
      const token = makeToken();
      const baseUrl = process.env.APP_URL
        || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'https://spec-agent-production.up.railway.app');

      const approveUrl = `${baseUrl}/api/change-order/approve/${token}`;
      const declineUrl = `${baseUrl}/api/change-order/decline/${token}`;

      // Save to Change Orders tab
      const row = await appendRow('Change Orders', {
        'Change Order ID': `CO-${Date.now()}`,
        'Job ID':          ctx.jobId || '',
        'Client Name':     ctx.clientName || '',
        'Description':     description,
        'Cost Impact':     String(costImpact || 0),
        'Timeline Impact': String(timelineImpact || 0),
        'Status':          'Pending Approval',
        'Doc Link':        doc.docUrl,
        'Approval Token':  token,
        'Created Date':    new Date().toLocaleDateString('en-US'),
        'Job Row':         String(ctx.rowNumber || ''),
      });

      ctx.changeOrderDocUrl  = doc.docUrl;
      ctx.approveUrl         = approveUrl;
      ctx.declineUrl         = declineUrl;
      ctx.costImpact         = costImpact;
      ctx.timelineImpact     = timelineImpact;
      ctx.description        = description;

      logger.success('ChangeOrderAgent', `Change order doc created: ${doc.docUrl}`);
      return JSON.stringify({ docUrl: doc.docUrl, approveUrl, declineUrl, token });
    } catch (err) {
      logger.error('ChangeOrderAgent', `create_change_order_doc failed: ${err.message}`);
      return `Failed: ${err.message}`;
    }
  },

  send_for_approval: async ({ to, clientName, subject, message, docUrl, approveUrl, declineUrl }) => {
    try {
      const { sendEmail } = require('../tools/gmail');
      const firstName = clientName?.split(' ')[0] || clientName;

      const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#0A2240;padding:24px 28px;border-radius:12px 12px 0 0">
    <div style="color:#BF9438;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Change Order Request</div>
    <div style="color:#ffffff;font-size:20px;font-weight:800">${subject}</div>
  </div>

  <div style="background:#ffffff;padding:28px;border:1px solid #E5E7EB;border-top:none">
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px">${message.replace(/\n/g, '<br>')}</p>

    <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:16px;margin-bottom:24px">
      <a href="${docUrl}" style="color:#0A2240;font-size:14px;font-weight:700;text-decoration:none">📄 View Full Change Order Document ↗</a>
    </div>

    <p style="font-size:14px;color:#6B7280;margin:0 0 16px">Please review and respond below:</p>

    <div style="display:flex;gap:12px;margin-bottom:24px">
      <a href="${approveUrl}" style="flex:1;display:block;background:#0A2240;color:#ffffff;text-align:center;padding:14px 20px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">✅ Approve Change Order</a>
      <a href="${declineUrl}" style="flex:1;display:block;background:#F3F4F6;color:#374151;text-align:center;padding:14px 20px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">❌ Decline</a>
    </div>

    <p style="font-size:12px;color:#9CA3AF;margin:0">Questions? Just reply to this email and we'll get back to you shortly.</p>
  </div>
</div>
      `.trim();

      await sendEmail({ to, subject, body: message, html });
      logger.success('ChangeOrderAgent', `Change order sent to ${to}`);
      return `Change order sent to ${to}`;
    } catch (err) {
      return `Failed to send: ${err.message}`;
    }
  },

  notify_owner: async (args) => toolNotifyOwner(args),
};

// ─── AGENT CLASS ──────────────────────────────────────────────────────────────

class ChangeOrderAgent extends BaseAgent {
  constructor() {
    super('ChangeOrderAgent', DEFAULT_MODEL, TOOLS, EXECUTORS);
  }

  async generateChangeOrder({ rowNumber, changeDescription, requestedBy = 'client' }) {
    const systemPrompt = `
You are a change order specialist for a home service company. Your job is to create a professional, clear change order when the scope of work changes.

TASK — in this exact order:
1. Read company settings (read_settings)
2. Read the job data (read_job, row ${rowNumber})
3. Create a professional change order document (create_change_order_doc) with:
   - Title: "Change Order — [Client Name] [Project Type]"
   - Full document content including:
     * CHANGE ORDER header with company name, date, job ID
     * Original Scope summary (one paragraph)
     * What is Changing (clear bullet points)
     * Cost Impact (itemized — labor + materials if applicable)
     * Timeline Impact (additional days, if any)
     * New Project Total
     * Terms (work begins upon approval, payment due with next invoice)
     * Signature lines for both parties
4. Send for client approval (send_for_approval):
   - Professional, friendly email
   - Explain the change clearly
   - Include the approve/decline links from the doc creation
   - Keep the email under 200 words
5. Notify the owner with full details (urgent=true)

DOCUMENT STYLE:
- Professional but not stiff — same warm tone as the company
- Be specific about what changes and what it costs
- Break down costs line by line (labor, materials, markup)
- Never be vague about money — clients need exact numbers

The change being requested: ${changeDescription || 'See job notes for context'}
Requested by: ${requestedBy}
    `.trim();

    const userMessage = `Generate a change order for job row ${rowNumber}. Change: ${changeDescription}`;
    return await this.run(systemPrompt, userMessage, { rowNumber });
  }
}

const changeOrderAgent = new ChangeOrderAgent();
module.exports = { generateChangeOrder: (args) => changeOrderAgent.generateChangeOrder(args) };
