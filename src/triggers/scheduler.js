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
const { notifyOwner } = require('../tools/notify');
let gmailWatch, weatherTool;
try { gmailWatch  = require('../tools/gmail-watch'); } catch (_) {}
try { weatherTool = require('../tools/weather');     } catch (_) {}

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

// ─── DAILY OWNER BRIEFING — 6:30am ───────────────────────────────────────────
async function runDailyBriefing() {
  logger.info('Scheduler', 'Running daily briefing…');
  try {
    const [leads, jobs, phases, settings] = await Promise.all([
      readTab('Leads'), readTab('Jobs'), readTab('Job Phases'), readTab('Settings'),
    ]);

    const settingsMap = {};
    (settings || []).forEach(r => {
      if (r['Label'] && r['Value']) settingsMap[r['Label'].trim()] = r['Value'];
      // Also try A/B column pattern
      const keys = Object.keys(r).filter(k => !k.startsWith('_') && !k.startsWith('__'));
      if (keys.length >= 2) settingsMap[r[keys[0]]?.trim?.()] = r[keys[1]];
    });
    const ownerEmail = settingsMap['Company Email'] || settingsMap['Gmail Send-From Address'] || '';
    const ownerName  = settingsMap['Owner / Salesperson Name'] || 'there';
    const companyName= settingsMap['Company Name'] || 'SPEC Systems';
    if (!ownerEmail) { logger.warn('Scheduler', 'No owner email for daily briefing'); return; }

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    // ── LEADS ──
    const hotNewLeads = leads.filter(l => {
      const score  = parseInt(g(l, 'Lead Score', 'AI Score') || '0');
      const status = (g(l, 'Lead Status', 'Status') || '').toLowerCase();
      const contact= g(l, 'Last Contact', 'Last Contacted');
      return score >= 70 && status === 'new' && !contact;
    });

    const staleLeads = leads.filter(l => {
      const status = (g(l, 'Lead Status', 'Status') || '').toLowerCase();
      if (['converted','dead','lost'].includes(status)) return false;
      const days = daysBetween(g(l, 'Last Contact', 'Last Contacted'));
      return days !== null && days >= 3;
    });

    const newLeadsToday = leads.filter(l => {
      const ts = g(l, 'Timestamp', 'Date Added');
      if (!ts) return false;
      const d = new Date(ts);
      const n = new Date();
      return d.toDateString() === n.toDateString();
    });

    // ── JOBS ──
    const activeJobs = jobs.filter(j => {
      const s = (g(j,'Job Status','Status')||'').toLowerCase();
      return s.includes('progress') || s.includes('active');
    });

    const proposalsOut = jobs.filter(j =>
      /awaiting approval|sent/i.test(g(j,'Proposal Status','Proposal Sent') || '')
    );

    const unpaidDeposits = jobs.filter(j =>
      /yes/i.test(g(j,'Deposit Invoice Sent','') || '') &&
      !/yes|paid/i.test(g(j,'Deposit Paid','Deposit Invoice Paid') || '')
    );

    const unpaidFinals = jobs.filter(j =>
      /yes/i.test(g(j,'Final Invoice Sent','') || '') &&
      !/yes|paid/i.test(g(j,'Final Invoice Paid','Final Paid') || '')
    );

    // Phases due/overdue today
    const phasesOverdue = phases.filter(p => {
      const end  = g(p,'End Date','Due Date','Phase End');
      const stat = (g(p,'Status','Phase Status')||'').toLowerCase();
      if (!end || stat.includes('complete')) return false;
      return daysBetween(end) !== null && daysBetween(end) > 0;
    });

    // ── BUILD SECTIONS ──
    const urgentItems = [];
    if (hotNewLeads.length)    urgentItems.push(`🔥 <strong>${hotNewLeads.length} hot lead${hotNewLeads.length>1?'s':''}</strong> with no first contact yet`);
    if (unpaidDeposits.length) urgentItems.push(`💰 <strong>${unpaidDeposits.length} deposit${unpaidDeposits.length>1?'s':''} overdue</strong> — contracts signed but not paid`);
    if (unpaidFinals.length)   urgentItems.push(`💰 <strong>${unpaidFinals.length} final invoice${unpaidFinals.length>1?'s':''} unpaid</strong>`);
    if (phasesOverdue.length)  urgentItems.push(`⚠️ <strong>${phasesOverdue.length} phase${phasesOverdue.length>1?'s':''} overdue</strong> — past scheduled end date`);

    const watchItems = [];
    if (staleLeads.length)   watchItems.push(`⏰ ${staleLeads.length} lead${staleLeads.length>1?'s':''} with no contact in 3+ days`);
    if (proposalsOut.length) watchItems.push(`📋 ${proposalsOut.length} proposal${proposalsOut.length>1?'s':''} out awaiting client approval`);

    // Lead names for hot leads section
    const hotLeadNames = hotNewLeads.slice(0,5).map(l =>
      `${g(l,'First Name','')} ${g(l,'Last Name','')}`.trim() +
      (g(l,'Lead Score','AI Score') ? ` (${g(l,'Lead Score','AI Score')}/100)` : '')
    );

    const activeJobNames = activeJobs.slice(0,5).map(j =>
      `${g(j,'First Name','')} ${g(j,'Last Name','')}`.trim() +
      ` — ${g(j,'Service Type','Project Type') || 'Project'}`
    );

    // ── HTML EMAIL ──
    const html = `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#F4F5F7;padding:20px">

  <div style="background:#0A2240;border-radius:14px 14px 0 0;padding:24px 28px">
    <div style="color:#BF9438;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Daily Briefing</div>
    <div style="color:#ffffff;font-size:20px;font-weight:800">${today}</div>
    <div style="color:rgba(255,255,255,.6);font-size:13px;margin-top:4px">Good morning, ${ownerName} — here's what needs your attention today.</div>
  </div>

  <!-- SNAPSHOT -->
  <div style="background:#fff;border:1px solid #E5E7EB;border-top:none;padding:20px 28px">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px;margin-bottom:20px">
      ${[
        { n: newLeadsToday.length, label: 'New leads today', color: newLeadsToday.length>0?'#0A2240':'#6B7280' },
        { n: hotNewLeads.length,   label: 'Hot, uncontacted', color: hotNewLeads.length>0?'#DC2626':'#6B7280' },
        { n: activeJobs.length,    label: 'Active jobs', color: '#0A2240' },
        { n: proposalsOut.length,  label: 'Awaiting approval', color: proposalsOut.length>0?'#F59E0B':'#6B7280' },
      ].map(s => `
        <div style="text-align:center;background:#F9FAFB;border-radius:10px;padding:14px 8px">
          <div style="font-size:28px;font-weight:900;color:${s.color}">${s.n}</div>
          <div style="font-size:11px;color:#6B7280;margin-top:2px;line-height:1.3">${s.label}</div>
        </div>
      `).join('')}
    </div>

    ${urgentItems.length ? `
    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:16px 20px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:800;color:#DC2626;margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">🚨 Needs Attention</div>
      ${urgentItems.map(i=>`<div style="font-size:14px;color:#374151;margin-bottom:6px">${i}</div>`).join('')}
    </div>` : `
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:14px 20px;margin-bottom:16px">
      <div style="font-size:14px;color:#15803D;font-weight:600">✅ No urgent items — you're in good shape today!</div>
    </div>`}

    ${watchItems.length ? `
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:16px 20px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:800;color:#92400E;margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">👀 Keep an Eye On</div>
      ${watchItems.map(i=>`<div style="font-size:14px;color:#374151;margin-bottom:6px">${i}</div>`).join('')}
    </div>` : ''}

    ${hotLeadNames.length ? `
    <div style="margin-bottom:16px">
      <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">🔥 Hot Leads Needing First Contact</div>
      ${hotLeadNames.map(n=>`<div style="font-size:14px;color:#0A2240;font-weight:600;padding:6px 0;border-bottom:1px solid #F3F4F6">${n}</div>`).join('')}
    </div>` : ''}

    ${activeJobNames.length ? `
    <div style="margin-bottom:16px">
      <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">🏗️ Active Jobs</div>
      ${activeJobNames.map(n=>`<div style="font-size:14px;color:#374151;padding:6px 0;border-bottom:1px solid #F3F4F6">${n}</div>`).join('')}
    </div>` : ''}

    <div style="text-align:center;margin-top:20px">
      <a href="${process.env.RAILWAY_PUBLIC_DOMAIN ? 'https://'+process.env.RAILWAY_PUBLIC_DOMAIN : (process.env.APP_URL || '#')}" style="display:inline-block;background:#0A2240;color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:10px;font-size:15px">Open Dashboard →</a>
    </div>
  </div>

  <div style="text-align:center;font-size:12px;color:#9CA3AF;padding:16px">
    Automated morning briefing from ${companyName}
  </div>
</div>`.trim();

    const { sendEmail } = require('../tools/gmail');
    await sendEmail({
      to:      ownerEmail,
      subject: `☀️ Morning Briefing — ${today}`,
      body:    `Good morning ${ownerName}! Here's your daily summary: ${urgentItems.length} urgent items, ${activeJobs.length} active jobs, ${hotNewLeads.length} hot leads uncontacted.`,
      html,
    });

    logger.success('Scheduler', `Daily briefing sent to ${ownerEmail}`);
  } catch (err) {
    logger.error('Scheduler', `Daily briefing failed: ${err.message}`);
  }
}

// ─── WEATHER ALERTS — daily 7:00am ───────────────────────────────────────────
async function runWeatherAlerts() {
  if (!weatherTool || !process.env.OPENWEATHER_API_KEY) return;
  logger.info('Scheduler', 'Running weather alerts…');
  const jobs = await readTab('Jobs');
  for (const job of jobs) {
    const status = (g(job, 'Job Status', 'Status') || '').toLowerCase();
    if (!status.includes('progress') && !status.includes('active')) continue;

    const address = [
      g(job, 'Street Address', 'Address'),
      g(job, 'City'),
      g(job, 'State'),
    ].filter(Boolean).join(', ');

    if (!address) continue;

    const alerts = await weatherTool.checkWeatherAlerts(address);
    if (!alerts?.length) continue;

    const clientName  = `${g(job,'First Name','')} ${g(job,'Last Name','')}`.trim() || 'Client';
    const projectType = g(job, 'Service Type', 'Project Type') || 'Project';
    const summary     = weatherTool.summarizeAlerts(alerts);

    await notifyOwner({
      subject: `⛈️ Weather Alert — ${clientName} job site`,
      message: `Heads up — significant weather is forecast for the ${clientName} ${projectType} job site at ${address} in the next 48 hours.\n\nForecast: ${summary}\n\nYou may want to adjust the schedule or notify your crew.`,
      urgent: true,
    }).catch(err => logger.error('Scheduler', `Weather notify failed: ${err.message}`));

    logger.warn('Scheduler', `Weather alert sent for ${clientName}: ${summary}`);
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

  // Daily owner briefing — 6:30am (first thing in the morning)
  cron.schedule('30 6 * * *', runDailyBriefing, { timezone: 'America/Chicago' });

  // Weather alerts — daily at 7:00am (before scan so owner has heads up)
  cron.schedule('0 7 * * *', runWeatherAlerts, { timezone: 'America/Chicago' });

  // Smart daily scan — every morning at 7:30am (runs BEFORE other tasks)
  cron.schedule('30 7 * * *', async () => {
    logger.info('Scheduler', 'Running smart daily scan…');
    await safeRoute('daily_scan', {});
  }, { timezone: 'America/Chicago' });

  // Monthly learning synthesis — 2nd of month at 6:00am (after report)
  cron.schedule('0 6 2 * *', async () => {
    logger.info('Scheduler', 'Running monthly learning synthesis…');
    await safeRoute('synthesize_learnings', {});
  }, { timezone: 'America/Chicago' });

  // Monthly performance report — 1st of month at 7:00am
  cron.schedule('0 7 1 * *', runMonthlyReport, { timezone: 'America/Chicago' });

  // Gmail watch renewal — every day at 6:00am (watch expires after 7 days)
  cron.schedule('0 6 * * *', async () => {
    if (!gmailWatch) return;
    try {
      await gmailWatch.startWatch();
      logger.success('Scheduler', 'Gmail watch renewed');
    } catch (err) {
      logger.error('Scheduler', `Gmail watch renewal failed: ${err.message}`);
    }
  }, { timezone: 'America/Chicago' });

  logger.success('Scheduler', '✅ All cron jobs scheduled');
}

module.exports = {
  startScheduler,
  // Export runners for manual testing
  runDailyBriefing, runNurtureSequence, runProposalFollowUps, runWeeklyUpdates,
  runInvoiceFollowUps, runReviewFollowUps, runThirtyDayCheckIns,
  runMonthlyReport, runWeatherAlerts,
};
