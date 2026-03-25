/**
 * Scheduler — node-cron scheduled tasks
 *
 * Replaces all Make.com scheduled scenarios:
 *   - Nurture sequence (daily 9am)
 *   - Proposal follow-ups (daily 9:30am)
 *   - Weekly progress updates (Monday 8am)
 *   - Invoice follow-ups (daily 10am)
 *   - Review follow-ups (daily 11am)
 *   - 30-day check-ins (daily 11:30am)
 *   - Monthly report (1st of each month, 7am)
 *
 * Call startScheduler() once in index.js.
 */

const cron   = require('node-cron');
const { route }  = require('../agents/orchestrator');
const { readTab, g } = require('../tools/sheets');
const { logger } = require('../utils/logger');

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function daysBetween(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return null;
    return Math.floor((Date.now() - d) / 86400000);
  } catch { return null; }
}

async function safeRoute(type, payload) {
  try { await route(type, payload); }
  catch (err) { logger.error('Scheduler', `${type} row ${payload.rowNumber}: ${err.message}`); }
}

// ─── NURTURE SEQUENCE — daily 9:00am ─────────────────────────────────────────
async function runNurtureSequence() {
  logger.info('Scheduler', 'Running nurture sequence…');
  const leads = await readTab('Leads');
  for (const lead of leads) {
    const status = (g(lead, 'Status', 'Lead Status') || '').toLowerCase();
    if (!['contacted', 'new'].includes(status)) continue;
    const lastContact = g(lead, 'Last Contact', 'Last Contacted');
    const days        = daysBetween(lastContact);
    const nurtureStep = parseInt(g(lead, 'Nurture Step', 'Nurture Day') || '0') || 0;
    // Criteria: no reply after 3 days, not yet at max steps
    if (days !== null && days >= 3 && nurtureStep < 4) {
      logger.info('Scheduler', `Nurture step for row ${lead._row} (step ${nurtureStep})`);
      await safeRoute('nurture_step', { rowNumber: lead._row });
    }
  }
}

// ─── PROPOSAL FOLLOW-UPS — daily 9:30am ──────────────────────────────────────
async function runProposalFollowUps() {
  logger.info('Scheduler', 'Running proposal follow-ups…');
  const jobs = await readTab('Jobs');
  for (const job of jobs) {
    const proposalStatus = g(job, 'Proposal Sent', 'Proposal Status') || '';
    if (!/sent|approved/i.test(proposalStatus)) continue;
    const proposalDate = g(job, 'Proposal Sent Date', 'Proposal Date');
    const days = daysBetween(proposalDate);
    // Follow up after 3 days, then 7 days
    const followupStep = parseInt(g(job, 'Proposal Followup Step') || '0') || 0;
    if ((days >= 3 && followupStep === 0) || (days >= 7 && followupStep === 1)) {
      await safeRoute('proposal_followup', { rowNumber: job._row });
    }
  }
}

// ─── WEEKLY PROGRESS UPDATES — every Monday 8:00am ───────────────────────────
async function runWeeklyUpdates() {
  logger.info('Scheduler', 'Running weekly progress updates…');
  const jobs = await readTab('Jobs');
  for (const job of jobs) {
    const status = (g(job, 'Job Status', 'Status') || '').toLowerCase();
    if (!status.includes('progress') && !status.includes('active')) continue;
    await safeRoute('weekly_update', { rowNumber: job._row });
  }
}

// ─── INVOICE FOLLOW-UPS — daily 10:00am ──────────────────────────────────────
async function runInvoiceFollowUps() {
  logger.info('Scheduler', 'Running invoice follow-ups…');
  const jobs = await readTab('Jobs');
  for (const job of jobs) {
    const depositSent = g(job, 'Deposit Invoice Sent');
    const depositPaid = g(job, 'Deposit Paid', 'Deposit Invoice Paid');
    const finalSent   = g(job, 'Final Invoice Sent');
    const finalPaid   = g(job, 'Final Invoice Paid', 'Final Paid');

    // Follow up on unpaid deposit invoices after 3 days
    if (/yes/i.test(depositSent) && !/yes|paid/i.test(depositPaid)) {
      const sentDate = g(job, 'Deposit Invoice Date');
      if (daysBetween(sentDate) >= 3) {
        await safeRoute('deposit_invoice_followup', { rowNumber: job._row });
      }
    }
    // Follow up on unpaid final invoices after 3 days
    if (/yes/i.test(finalSent) && !/yes|paid/i.test(finalPaid)) {
      const sentDate = g(job, 'Final Invoice Date');
      if (daysBetween(sentDate) >= 3) {
        await safeRoute('final_invoice_followup', { rowNumber: job._row });
      }
    }
  }
}

// ─── REVIEW FOLLOW-UPS — daily 11:00am ───────────────────────────────────────
async function runReviewFollowUps() {
  logger.info('Scheduler', 'Running review follow-ups…');
  const jobs = await readTab('Jobs');
  for (const job of jobs) {
    const status       = (g(job, 'Job Status', 'Status') || '').toLowerCase();
    const reviewStatus = g(job, 'Review Status', 'Review Requested') || '';
    const completionDate = g(job, 'Completion Date', 'Job Completion Date');
    if (!status.includes('complete')) continue;
    if (/requested|received/i.test(reviewStatus)) continue;
    // Request review 3–7 days after completion
    const days = daysBetween(completionDate);
    if (days !== null && days >= 3 && days <= 14) {
      await safeRoute('review_followup', { rowNumber: job._row });
    }
  }
}

// ─── 30-DAY CHECK-INS — daily 11:30am ────────────────────────────────────────
async function runThirtyDayCheckIns() {
  logger.info('Scheduler', 'Running 30-day check-ins…');
  const jobs = await readTab('Jobs');
  for (const job of jobs) {
    const status      = (g(job, 'Job Status', 'Status') || '').toLowerCase();
    const checkInSent = g(job, '30-Day Check-in Sent', '30 Day Check In Sent') || '';
    const completionDate = g(job, 'Completion Date', 'Job Completion Date');
    if (!status.includes('complete')) continue;
    if (/yes/i.test(checkInSent)) continue;
    const days = daysBetween(completionDate);
    if (days !== null && days >= 30 && days <= 35) {
      await safeRoute('thirty_day', { rowNumber: job._row });
    }
  }
}

// ─── MONTHLY REPORT — 1st of each month at 7:00am ────────────────────────────
async function runMonthlyReport() {
  const now   = new Date();
  const month = now.toLocaleString('default', { month: 'long' });
  const year  = now.getFullYear();
  logger.info('Scheduler', `Running monthly report: ${month} ${year}`);
  await safeRoute('monthly_report', { month, year });
}

// ─── START ALL JOBS ───────────────────────────────────────────────────────────

function startScheduler() {
  logger.info('Scheduler', 'Starting all cron jobs…');

  // Nurture sequence — daily at 9:00am
  cron.schedule('0 9 * * *', runNurtureSequence, { timezone: 'America/Chicago' });

  // Proposal follow-ups — daily at 9:30am
  cron.schedule('30 9 * * *', runProposalFollowUps, { timezone: 'America/Chicago' });

  // Weekly progress updates — every Monday at 8:00am
  cron.schedule('0 8 * * 1', runWeeklyUpdates, { timezone: 'America/Chicago' });

  // Invoice follow-ups — daily at 10:00am
  cron.schedule('0 10 * * *', runInvoiceFollowUps, { timezone: 'America/Chicago' });

  // Review follow-ups — daily at 11:00am
  cron.schedule('0 11 * * *', runReviewFollowUps, { timezone: 'America/Chicago' });

  // 30-day check-ins — daily at 11:30am
  cron.schedule('30 11 * * *', runThirtyDayCheckIns, { timezone: 'America/Chicago' });

  // Monthly performance report — 1st of month at 7:00am
  cron.schedule('0 7 1 * *', runMonthlyReport, { timezone: 'America/Chicago' });

  logger.success('Scheduler', '✅ All cron jobs scheduled');
}

module.exports = {
  startScheduler,
  // Export runners for manual testing
  runNurtureSequence, runProposalFollowUps, runWeeklyUpdates,
  runInvoiceFollowUps, runReviewFollowUps, runThirtyDayCheckIns, runMonthlyReport,
};
