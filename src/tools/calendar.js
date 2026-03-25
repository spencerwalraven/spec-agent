/**
 * Google Calendar tool — syncs jobs and phases to the owner's calendar.
 *
 * Uses the same OAuth credentials as Sheets/Docs/Gmail.
 * Calendar ID defaults to 'primary' — set GOOGLE_CALENDAR_ID in env to use a specific calendar.
 */

const { google } = require('googleapis');
const { logger } = require('../utils/logger');

const TZ          = process.env.TZ_NAME || 'America/Chicago';
const CALENDAR_ID = () => process.env.GOOGLE_CALENDAR_ID || 'primary';

// Color mapping (Google Calendar colorId strings)
const COLORS = {
  kickoff:  '9',  // blueberry  — dark blue
  phase:    '7',  // peacock    — teal
  followup: '5',  // banana     — yellow
  complete: '8',  // graphite   — gray
  urgent:   '11', // tomato     — red
};

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

function getCalendar() {
  return google.calendar({ version: 'v3', auth: getAuth() });
}

/** Parse a date string into a full-day or timed event object */
function makeTimeObj(dateStr, hour = 8) {
  if (!dateStr) return null;
  try {
    // If it already has a time component, use it directly
    if (dateStr.includes('T') || dateStr.includes(':')) {
      return { dateTime: new Date(dateStr).toISOString(), timeZone: TZ };
    }
    // Otherwise treat as a date-only and attach the given hour
    const [m, d, y] = dateStr.includes('/') ? dateStr.split('/') : [null, null, null];
    const iso = y ? `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}` : dateStr;
    const dt  = new Date(`${iso}T${String(hour).padStart(2,'0')}:00:00`);
    if (isNaN(dt)) return null;
    return { dateTime: dt.toISOString(), timeZone: TZ };
  } catch { return null; }
}

/**
 * Create a calendar event.
 * Returns { eventId, eventLink } or throws.
 */
async function createEvent({ title, description = '', location = '', startDate, endDate, colorId = COLORS.phase, allDay = false }) {
  const cal = getCalendar();

  let start, end;
  if (allDay) {
    const iso = typeof startDate === 'string' ? startDate.split('T')[0] : new Date(startDate).toISOString().split('T')[0];
    const isoEnd = endDate
      ? (typeof endDate === 'string' ? endDate.split('T')[0] : new Date(endDate).toISOString().split('T')[0])
      : iso;
    start = { date: iso };
    end   = { date: isoEnd };
  } else {
    start = makeTimeObj(startDate, 8);
    end   = endDate ? makeTimeObj(endDate, 17) : { dateTime: new Date(new Date(startDate).getTime() + 8*3600*1000).toISOString(), timeZone: TZ };
    if (!start) throw new Error(`Invalid startDate: ${startDate}`);
  }

  const res = await cal.events.create({
    calendarId: CALENDAR_ID(),
    requestBody: { summary: title, description, location, colorId, start, end },
  });

  logger.success('Calendar', `Event created: "${title}"`);
  return { eventId: res.data.id, eventLink: res.data.htmlLink };
}

/**
 * Update an existing event by ID.
 */
async function updateEvent(eventId, updates) {
  const cal = getCalendar();
  const res = await cal.events.patch({
    calendarId: CALENDAR_ID(),
    eventId,
    requestBody: updates,
  });
  return res.data;
}

/**
 * Delete an event by ID (soft-fail if already gone).
 */
async function deleteEvent(eventId) {
  try {
    const cal = getCalendar();
    await cal.events.delete({ calendarId: CALENDAR_ID(), eventId });
  } catch (e) {
    if (!e.message?.includes('410') && !e.message?.includes('404')) throw e;
  }
}

/**
 * List upcoming events from the calendar (next N days).
 */
async function listUpcomingEvents(days = 60) {
  const cal  = getCalendar();
  const now  = new Date();
  const then = new Date(now.getTime() + days * 86400000);
  const res  = await cal.events.list({
    calendarId:   CALENDAR_ID(),
    timeMin:      now.toISOString(),
    timeMax:      then.toISOString(),
    singleEvents: true,
    orderBy:      'startTime',
    maxResults:   200,
  });
  return res.data.items || [];
}

// ─── HIGH-LEVEL HELPERS ───────────────────────────────────────────────────────

function clientName(job) {
  return `${job['First Name'] || ''} ${job['Last Name'] || ''}`.trim() || 'Client';
}
function jobAddress(job) {
  return [job['Street Address'] || job['Address'], job['City'], job['State']].filter(Boolean).join(', ');
}

/**
 * Create a kickoff event for a job.
 */
async function createKickoffEvent(job, dateStr) {
  const name    = clientName(job);
  const type    = job['Service Type'] || job['Project Type'] || 'Project';
  const address = jobAddress(job);
  const jobId   = job['Job ID'] || '';

  return createEvent({
    title:       `🏗️ KICKOFF — ${name} · ${type}`,
    description: `Job kickoff\nClient: ${name}\nProject: ${type}\nJob ID: ${jobId}\nAddress: ${address}`,
    location:    address,
    startDate:   dateStr,
    colorId:     COLORS.kickoff,
  });
}

/**
 * Create a phase event, returns null if no start date.
 */
async function createPhaseEvent(phase, job) {
  const phaseName = phase['Phase Name'] || phase['Phase'] || 'Phase';
  const startDate = phase['Start Date'] || phase['Phase Start'] || '';
  const endDate   = phase['End Date']   || phase['Due Date']    || phase['Phase End'] || '';
  const trade     = phase['Trade']      || phase['Assigned Trade'] || '';
  if (!startDate) return null;

  return createEvent({
    title:       `${phaseName} — ${clientName(job)}`,
    description: `Phase: ${phaseName}\nTrade: ${trade}\nClient: ${clientName(job)}\nJob: ${phase['Job ID'] || ''}`,
    location:    jobAddress(job),
    startDate,
    endDate:     endDate || startDate,
    colorId:     COLORS.phase,
  });
}

/**
 * Sync all active jobs + their phases to the calendar.
 * Reads Jobs + Job Phases tabs, creates events for anything with a date.
 * Returns a summary of what was created.
 */
async function syncAllJobs() {
  const { readTab, g } = require('./sheets');
  const [jobs, phases] = await Promise.all([readTab('Jobs'), readTab('Job Phases')]);

  let created = 0;
  const errors = [];

  for (const job of jobs) {
    const status = (g(job,'Job Status','Status') || '').toLowerCase();
    if (['lost','dead','cancelled'].some(s => status.includes(s))) continue;

    const jobId   = g(job,'Job ID') || '';
    const name    = clientName(job);

    // Kickoff event
    const kickoffDate = g(job,'Site Visit Date','Kickoff Date','Start Date');
    if (kickoffDate) {
      try {
        await createKickoffEvent(job, kickoffDate);
        created++;
      } catch (e) { errors.push(`Kickoff ${name}: ${e.message}`); }
    }

    // Phase events
    const jobPhases = phases.filter(p => g(p,'Job ID') === jobId);
    for (const phase of jobPhases) {
      try {
        const result = await createPhaseEvent(phase, job);
        if (result) created++;
      } catch (e) { errors.push(`Phase ${g(phase,'Phase Name','Phase')} for ${name}: ${e.message}`); }
    }
  }

  return { created, errors };
}

// ─── AGENT TOOL WRAPPER ───────────────────────────────────────────────────────

async function toolCreateCalendarEvent({ title, description, startDate, endDate, location, type }) {
  const colorId = COLORS[type] || COLORS.phase;
  const result  = await createEvent({ title, description: description || '', location: location || '', startDate, endDate, colorId });
  return `Calendar event created: "${title}" — ${result.eventLink}`;
}

module.exports = {
  createEvent, updateEvent, deleteEvent,
  listUpcomingEvents,
  createKickoffEvent, createPhaseEvent,
  syncAllJobs,
  toolCreateCalendarEvent,
  COLORS,
};
