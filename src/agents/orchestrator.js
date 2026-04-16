/**
 * Orchestrator — the event router.
 *
 * Routes incoming events (webhooks, scheduled triggers, Gmail pushes)
 * to the correct agent and method.
 *
 * Event types:
 *   new_lead                  → LeadAgent.handleNewLead
 *   email_reply               → LeadAgent.handleEmailReply (lead)
 *                               ClientAgent.handleClientMessage (job)
 *   nurture_step              → LeadAgent.handleNurtureStep
 *   calendly_booking          → LeadAgent.handleCalendlyBooking
 *   lead_converted            → LeadAgent.handleConversion
 *   estimate_ready            → PricingAgent.generateEstimate
 *   generate_proposal         → JobAgent.generateProposal
 *   proposal_followup         → JobAgent.sendProposalFollowUp
 *   proposal_decision         → JobAgent.handleProposalDecision
 *   generate_contract         → JobAgent.generateContract
 *   generate_template         → JobAgent.generateJobTemplate
 *   notify_subs               → JobAgent.notifySubs
 *   contract_signed           → WelcomeAgent.sendWelcome + deposit invoice chain
 *   client_welcome            → WelcomeAgent.sendWelcome
 *   deposit_invoice           → ClientAgent.generateDepositInvoice
 *   final_invoice             → ClientAgent.generateFinalInvoice
 *   deposit_invoice_followup  → PaymentAgent.followUpDeposit
 *   final_invoice_followup    → PaymentAgent.followUpFinal
 *   confirm_subs              → SubConfirmationAgent.followUpSub
 *   weekly_update             → ClientAgent.sendWeeklyUpdate
 *   client_message            → ClientAgent.handleClientMessage
 *   satisfaction_check        → ClientAgent.midJobSatisfactionCheck
 *   job_complete              → ClientAgent.handleJobCompletion
 *   review_followup           → ClientAgent.sendReviewFollowUp
 *   thirty_day                → ClientAgent.thirtyDayCheckIn
 *   monthly_report            → MarketingAgent.generateMonthlyReport
 *   daily_scan                → SmartOrchestrator.runDailyScan
 *   scan_leads                → SmartOrchestrator.scanLeads
 *   scan_jobs                 → SmartOrchestrator.scanJobs
 *   plan_project              → PlanningAgent.planProject
 *   change_order              → ChangeOrderAgent.generateChangeOrder
 *   learn_from_job            → LearningAgent.learnFromJob
 *   synthesize_learnings      → LearningAgent.synthesizeLearnings
 */

const leadAgent              = require('./lead-agent');
const jobAgent               = require('./job-agent');
const clientAgent            = require('./client-agent');
const marketingAgent         = require('./marketing-agent');
const pricingAgent           = require('./pricing-agent');
const planningAgent          = require('./planning-agent');
const learningAgent          = require('./learning-agent');
const smartOrchestrator      = require('./smart-orchestrator');
const changeOrderAgent       = require('./change-order-agent');
const welcomeAgent           = require('./welcome-agent');
const paymentAgent           = require('./payment-agent');
const subConfirmationAgent   = require('./sub-confirmation-agent');
const templateDocGenerator   = require('./template-doc-generator');
const { logger }             = require('../utils/logger');
const { findRowByEmail, updateCell, readSettings, readTab } = require('../tools/sheets-compat');
const { createJobFromLead }  = require('../tools/jobs');

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
        return await leadAgent.handleNewLead({ rowNumber: payload.rowNumber || payload.leadId || payload.row });

      case 'email_reply': {
        // Determine sender email
        const fromStr = typeof payload.from === 'string' ? payload.from : (payload.email || '');
        const email = fromStr.match(/<(.+)>/)?.[1] || fromStr || payload.email;
        if (!email) { logger.warn('Orchestrator', 'No sender email in email_reply event'); return; }

        // Ignore bounce/system emails
        const IGNORE_SENDERS = ['mailer-daemon@', 'postmaster@', 'noreply@', 'no-reply@', 'notifications@'];
        if (IGNORE_SENDERS.some(s => email.toLowerCase().includes(s))) {
          logger.info('Orchestrator', `Ignoring system email from ${email}`);
          return;
        }

        const { readTab: _rt, g: _g } = require('../tools/sheets-compat');

        // Check active Jobs FIRST — active clients take priority over leads
        const jobs = await _rt('Jobs');
        const activeStatuses = new Set(['in progress', 'planning', 'active', 'invoiced']);
        const job = jobs.find(j => {
          const jobEmail  = (_g(j, 'Email', 'Client Email') || '').toLowerCase();
          const jobStatus = (_g(j, 'Status', 'Job Status') || '').toLowerCase();
          return jobEmail === email.toLowerCase() && activeStatuses.has(jobStatus);
        });
        if (job?._row) {
          logger.info('Orchestrator', `Email reply from active client ${email} → ClientAgent row ${job._row}`);
          const threadId = job['Client Email Thread'] || job['Email Thread ID'] || payload.threadId;
          return await clientAgent.handleClientMessage({ rowNumber: job._row, threadId });
        }

        // Then check Leads
        const lead = await findRowByEmail('Leads', email);
        if (lead?._row) {
          logger.info('Orchestrator', `Email reply from lead ${email} → LeadAgent row ${lead._row}`);
          const threadId = lead['Email Thread ID'] || lead['emailThread'] || payload.threadId;
          return await leadAgent.handleEmailReply({
            rowNumber:   lead._row,
            threadId,
            senderEmail: email,
            senderName:  `${lead['First Name'] || ''} ${lead['Last Name'] || ''}`.trim(),
          });
        }

        logger.warn('Orchestrator', `No lead or active job found for email: ${email}`);
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
      case 'generate_estimate': {
        // Try template first, then fall back to AI if no template configured
        const tpl = await templateDocGenerator.generateFromTemplate('estimate', payload.rowNumber);
        if (tpl.ok) return `Estimate generated from template: ${tpl.docUrl}`;
        logger.info('Orchestrator', `Estimate template skipped (${tpl.reason}) — using AI generation`);
        return await pricingAgent.generateEstimate({ rowNumber: payload.rowNumber });
      }

      case 'generate_proposal': {
        const tpl = await templateDocGenerator.generateFromTemplate('proposal', payload.rowNumber);
        if (tpl.ok) return `Proposal generated from template: ${tpl.docUrl}`;
        logger.info('Orchestrator', `Proposal template skipped (${tpl.reason}) — using AI generation`);
        return await jobAgent.generateProposal({ rowNumber: payload.rowNumber });
      }

      case 'proposal_followup':
        return await jobAgent.sendProposalFollowUp({ rowNumber: payload.rowNumber });

      case 'proposal_decision':
        return await jobAgent.handleProposalDecision({ rowNumber: payload.rowNumber, threadId: payload.threadId });

      case 'generate_contract': {
        const tpl = await templateDocGenerator.generateFromTemplate('contract', payload.rowNumber);
        if (tpl.ok) return `Contract generated from template: ${tpl.docUrl}`;
        logger.info('Orchestrator', `Contract template skipped (${tpl.reason}) — using AI generation`);
        return await jobAgent.generateContract({ rowNumber: payload.rowNumber });
      }

      case 'generate_template':
        return await jobAgent.generateJobTemplate({ rowNumber: payload.rowNumber });

      case 'notify_subs':
        return await jobAgent.notifySubs({ rowNumber: payload.rowNumber });

      // ── CONTRACT SIGNED / ONBOARDING ──────────────────────────────────
      case 'contract_signed': {
        // 1. Send welcome email
        await welcomeAgent.sendWelcome({ rowNumber: payload.rowNumber });
        // 2. Kick off the deposit invoice chain (short delay so emails don't arrive at same second)
        await new Promise(r => setTimeout(r, 5000));
        return await clientAgent.generateDepositInvoice({ rowNumber: payload.rowNumber });
      }

      case 'client_welcome':
        return await welcomeAgent.sendWelcome({ rowNumber: payload.rowNumber });

      // ── PAYMENT FOLLOW-UPS ────────────────────────────────────────────
      case 'deposit_invoice_followup':
        return await paymentAgent.followUpDeposit({ rowNumber: payload.rowNumber });

      case 'final_invoice_followup':
        return await paymentAgent.followUpFinal({ rowNumber: payload.rowNumber });

      // ── SUB CONFIRMATION ──────────────────────────────────────────────
      case 'confirm_subs':
        return await subConfirmationAgent.followUpSub({ phaseRow: payload.phaseRow || payload.rowNumber });

      // ── CLIENT / ACTIVE JOB ────────────────────────────────────────────
      case 'weekly_update':
      case 'send_weekly_update':
        return await clientAgent.sendWeeklyUpdate({ rowNumber: payload.rowNumber });

      case 'client_message':
        return await clientAgent.handleClientMessage({ rowNumber: payload.rowNumber, threadId: payload.threadId });

      case 'satisfaction_check':
      case 'send_satisfaction_check':
        return await clientAgent.midJobSatisfactionCheck({ rowNumber: payload.rowNumber });

      case 'deposit_invoice':
        return await clientAgent.generateDepositInvoice({ rowNumber: payload.rowNumber });

      case 'final_invoice':
        return await clientAgent.generateFinalInvoice({ rowNumber: payload.rowNumber });

      case 'job_complete':
        return await clientAgent.handleJobCompletion({ rowNumber: payload.rowNumber });

      case 'review_followup':
      case 'send_review_request':
        return await clientAgent.sendReviewFollowUp({ rowNumber: payload.rowNumber });

      case 'thirty_day':
      case 'send_30day_checkin':
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
      case 'plan_project': {
        const tpl = await templateDocGenerator.generateFromTemplate('kickoff', payload.rowNumber);
        if (tpl.ok) return `Kickoff plan generated from template: ${tpl.docUrl}`;
        logger.info('Orchestrator', `Kickoff template skipped (${tpl.reason}) — using AI generation`);
        return await planningAgent.planProject({ rowNumber: payload.rowNumber });
      }

      // ── CHANGE ORDERS ─────────────────────────────────────────────
      case 'change_order':
        return await changeOrderAgent.generateChangeOrder({
          rowNumber:         payload.rowNumber,
          changeDescription: payload.description || payload.changeDescription,
        });

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
