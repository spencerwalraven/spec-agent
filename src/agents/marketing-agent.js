/**
 * Marketing Agent — handles all marketing + re-engagement:
 *   • Re-engagement campaigns
 *   • Referral campaigns
 *   • Dead lead re-engagement
 *   • Monthly performance report
 */

const { BaseAgent, DEFAULT_MODEL } = require('./base-agent');
const { toolReadSettings, readTab, updateCell } = require('../tools/sheets-compat');
const { toolSendEmail }  = require('../tools/gmail');
const { toolCreateDoc }  = require('../tools/docs');
const { toolNotifyOwner } = require('../tools/notify');

const TOOLS = [
  {
    name: 'read_settings',
    description: 'Read business settings',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'send_email',
    description: 'Send an email',
    input_schema: {
      type: 'object',
      properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'create_document',
    description: 'Create a Google Doc',
    input_schema: {
      type: 'object',
      properties: { title: { type: 'string' }, body: { type: 'string' } },
      required: ['title', 'body'],
    },
  },
  {
    name: 'notify_owner',
    description: 'Alert the owner',
    input_schema: {
      type: 'object',
      properties: { subject: { type: 'string' }, message: { type: 'string' } },
      required: ['subject', 'message'],
    },
  },
];

const EXECUTORS = {
  read_settings:  async ()     => toolReadSettings(),
  send_email:     async (args) => {
    const { sendEmail } = require('../tools/gmail');
    const result = await sendEmail({ to: args.to, subject: args.subject, body: args.body });
    return `Email sent to ${args.to}. Thread: ${result.threadId}`;
  },
  create_document: async (args) => toolCreateDoc(args),
  notify_owner:    async (args) => toolNotifyOwner(args),
};

class MarketingAgent extends BaseAgent {
  constructor() {
    super('MarketingAgent', DEFAULT_MODEL, TOOLS, EXECUTORS);
  }

  async sendReEngagementCampaign({ leads }) {
    // leads = array of { email, firstName, projectType, _row }
    const prompt = `
You run re-engagement campaigns for a home service company.

TASK:
1. Read business settings
2. For each lead provided, send a personalized re-engagement email:
   - Reference their original project interest
   - Let them know about any seasonal specials or the team's availability
   - Keep it warm, brief (under 150 words), and non-pushy
   - Include a Calendly link to book if they're ready to move forward
3. Do NOT email anyone twice — trust the list provided

Leads to contact: ${JSON.stringify(leads)}
    `.trim();

    return await this.run(prompt, `Send re-engagement emails to ${leads.length} leads.`, {});
  }

  async sendReferralCampaign({ clients }) {
    const prompt = `
You run referral campaigns for a home service company.

TASK:
1. Read settings
2. For each past client, send a referral request email:
   - Thank them for being a great client
   - Let them know you appreciate referrals
   - Keep it brief (under 120 words), warm and genuine — never transactional
3. Update each client's referral status if you can

Clients: ${JSON.stringify(clients)}
    `.trim();

    return await this.run(prompt, `Send referral emails to ${clients.length} clients.`, {});
  }

  async generateMonthlyReport({ month, year }) {
    const prompt = `
You generate monthly performance reports for a home service business.

TASK:
1. Read settings
2. Review all data mentally (you have access to the data provided in context)
3. Create a comprehensive Google Doc monthly report with:
   - New leads count and conversion rate
   - Revenue closed this month
   - Active jobs and their status
   - Top performing service types
   - Client satisfaction highlights
   - Goals for next month
4. Send the report link to the owner
5. Notify owner

Month: ${month} ${year}
    `.trim();

    return await this.run(prompt, `Generate monthly performance report for ${month} ${year}.`, { month, year });
  }
}

module.exports = new MarketingAgent();
