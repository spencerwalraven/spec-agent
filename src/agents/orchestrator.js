/**
 * Orchestrator — the event router.
 *
 * Routes incoming events (webhooks, scheduled triggers, Gmail pushes)
 * to the correct agent and method.
 *
 * Event types:
 *   new_lead          → LeadAgent.handleNewLead
 *   email_reply       → LeadAgent.handleEmailReply  (lead phase)
 *                     → ClientAgent.handleClientMessage (job phase)
 *   nurture_step      → LeadAgent.handleNurtureStep
 *   calendly_booking  → LeadAgent.handleCalendlyBooking
 *   lead_converted    → LeadAgent.handleConversion
 *   estimate_ready    → JobAgent.generateEstimate
 *   generate_proposal → JobAgent.generateProposal
 *   proposal_followup → JobAgent.sendProposalFollowUp
 *   proposal_decision → JobAgent.handleProposalDecision
 *   generate_contract → JobAgent.generateContract
 *   contract_followup → (tbd)
 *   generate_template → JobAgent.generateJobTemplate
 *   notify_subs       → JobAgent.notifySubs
 *   weekly_update     → ClientAgent.sendWeeklyUpdate
 *   client_message    → ClientAgent.handleClientMessage
 *   satisfaction_check→ ClientAgent.midJobSatisfactionCheck
 *   deposit_invoice   → ClientAgent.generateDepositInvoice
 *   final_invoice     → ClientAgent.generateFinalInvoice
 *   job_complete      → ClientAgent.handleJobCompletion
 *   review_followup   → ClientAgent.sendReviewFollowUp
 *   thirty_day        → ClientAgent.thirtyDayCheckIn
 */

const leadAgent          = require('./lead-agent');
const jobAgent           = require('./job-agent');
const clientAgent        = require('./client-agent');
const marketingAgent     = require('./marketing-agent');
const pricingAgent       = require('./pricing-agent');
const planningAgent      = require('./planning-agent');
const learningAgent      = require('./learning-agent');
const smartOrchestrator  = require('./smart-orchestrator');
const { logger }         = require('../utils/logger');
const { findRowByEmail, updateCell, readSettings } = require('../tools/sheets');
const { createJobFromLead } = require('../tools/jobs');

/**
 * Route an event to the appropriate agent.
 * @param {string} type    - Event type (see list above)
 * @param {Object} payload - Event data
 */
async function route(type, payload = {}) {
  logger.info('Orchestrator', `Event: ${type}`, payload);

  try {
    switch (type) {

      // ── LEAD LIFECYCLE ─────────────────────────────────────────────────
      case 'new_lead':
        return await leadAgent.handleNewLead({ rowNumber: payload.rowNumber || payload.row });

      case 'email_reply': {
        // Determine if this is a lead or active client
        const email = payload.from?.match(/<(.+)>/)?.[1] || payload.from || payload.email;
        if (!email) { logger.warn('Orchestrator', 'No sender email in email_reply event'); return; }

        // Check Leads first
        const lead = await findRowByEmail('Leads', email);
        if (lead?._row) {
          const threadId = lead['Email Thread ID'] || lead['emailThread'] || payload.threadId;
          return await leadAgent.handleEmailReply({
            rowNumber:   lead._row,
            threadId,
            senderEmail: email,
            senderName:  `${lead['First Name'] || ''} ${lead['Last Name'] || ''}`.trim(),
          });
        }

        // Then check Jobs (active client)
        const { readTab, g } = require('../tools/sheets');
        const jobs = await readTab('Jobs');
        const job = jobs.find(j => (j['Email'] || '').toLowerCase() === email.toLowerCase());
        if (job?._row) {
          const threadId = job['Client Email Thread'] || job['Email Thread ID'] || payload.threadId;
          return await clientAgent.handleClientMessage({ rowNumber: job._row, threadId });
        }

        logger.warn('Orchestrator', `No lead or job found for email: ${email}`);
        return;
      }

      case 'nurture_step':
        return await leadAgent.handleNurtureStep({ rowNumber: payload.rowNumber });

      case 'calendly_booking':
        return await leadAgent.handleCalendlyBooking(payload);

      case 'lead_converted': {
        const leadRow = payload.rowNumber;
        // 1. Mark lead converted
        await updateCell('Leads', leadRow, ['Status', 'Lead Status'], 'Converted');
        // 2. Create job row from lead data
        const { jobId, rowNumber: jobRow } = await createJobFromLead(leadRow);
        logger.success('Orchestrator', `Lead row ${leadRow} converted → Job ${jobId} at row ${jobRow}`);
        // 3. Run the agent's conversion handler (sends confirmation email, notifies owner)
        return await leadAgent.handleConversion({ rowNumber: leadRow, jobId, jobRow });
      }

      // ── JOB LIFECYCLE ──────────────────────────────────────────────────
      case 'estimate_ready':
      case 'generate_estimate':
        return await pricingAgent.generateEstimate({ rowNumber: payload.rowNumber });

      case 'generate_proposal':
        return await jobAgent.generateProposal({ rowNumber: payload.rowNumber });

      case 'proposal_followup':
        return await jobAgent.sendProposalFollowUp({ rowNumber: payload.rowNumber });

      case 'proposal_decision':
        return await jobAgent.handleProposalDecision({ rowNumber: payload.rowNumber, threadId: payload.threadId });

      case 'generate_contract':
        return await jobAgent.generateContract({ rowNumber: payload.rowNumber });

      case 'generate_template':
        return await jobAgent.generateJobTemplate({ rowNumber: payload.rowNumber });

      case 'notify_subs':
        return await jobAgent.notifySubs({ rowNumber: payload.rowNumber });

      // ── CLIENT / ACTIVE JOB ────────────────────────────────────────────
      case 'weekly_update':
        return await clientAgent.sendWeeklyUpdate({ rowNumber: payload.rowNumber });

      case 'client_message':
        return await clientAgent.handleClientMessage({ rowNumber: payload.rowNumber, threadId: payload.threadId });

      case 'satisfaction_check':
        return await clientAgent.midJobSatisfactionCheck({ rowNumber: payload.rowNumber });

      case 'deposit_invoice':
        return await clientAgent.generateDepositInvoice({ rowNumber: payload.rowNumber });

      case 'final_invoice':
        return await clientAgent.generateFinalInvoice({ rowNumber: payload.rowNumber });

      case 'job_complete':
        return await clientAgent.handleJobCompletion({ rowNumber: payload.rowNumber });

      case 'review_followup':
        return await clientAgent.sendReviewFollowUp({ rowNumber: payload.rowNumber });

      case 'thirty_day':
        return await clientAgent.thirtyDayCheckIn({ rowNumber: payload.rowNumber });

      // ── MARKETING ─────────────────────────────────────────────────────
      case 'monthly_report':
        return await marketingAgent.generateMonthlyReport({
          month: payload.month || new Date().toLocaleString('default', { month: 'long' }),
          year:  payload.year  || new Date().getFullYear(),
        });

      // ── SMART ORCHESTRATOR ────────────────────────────────────────
      case 'daily_scan':
        return await smartOrchestrator.runDailyScan();

      case 'scan_leads':
        return await smartOrchestrator.scanLeads();

      case 'scan_jobs':
        return await smartOrchestrator.scanJobs();

      // ── PROJECT PLANNING ──────────────────────────────────────────
      case 'plan_project':
        return await planningAgent.planProject({ rowNumber: payload.rowNumber });

      // ── LEARNING ──────────────────────────────────────────────────
      case 'learn_from_job':
        return await learningAgent.learnFromJob({ rowNumber: payload.rowNumber });

      case 'synthesize_learnings':
        return await learningAgent.synthesizeLearnings();

      default:
        logger.warn('Orchestrator', `Unknown event type: ${type}`);
    }
  } catch (err) {
    logger.error('Orchestrator', `Event ${type} failed: ${err.message}`, { error: err.stack });
    throw err;
  }
}

module.exports = { route };
