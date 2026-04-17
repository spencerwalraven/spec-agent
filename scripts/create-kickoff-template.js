/**
 * Creates a SPEC Sheets - Landscaping Project Kickoff Plan template
 * in the authenticated Google account's Drive.
 *
 * Usage:
 *   node scripts/create-kickoff-template.js
 *
 * Requires the same Google OAuth credentials as the main app
 * (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN in .env).
 *
 * Prints the new doc ID at the end — paste it into Settings → Kickoff Template ID.
 */

require('dotenv').config();
const { google } = require('googleapis');

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

const KICKOFF_TEMPLATE_BODY = `HOW TO USE THIS KICKOFF TEMPLATE

Read this page before sending. Delete it when done.

STEP 1:  Make a copy
File > Make a copy. Name it "[Client Name] - Project Kickoff". Never edit the original template.

STEP 2:  Replace all [BRACKETED] text
Use Find & Replace (Ctrl+H / Cmd+H) to swap all placeholders with real information.

STEP 3:  Customize the phase schedule
Modify the phase rows to match your specific project timeline. Add or remove phases as needed.

STEP 4:  Review team assignments and contact info
Fill in the crew lead, project manager, and any subcontractors assigned to the job.

STEP 5:  Delete this instructions page
Once your kickoff plan is ready, delete this page and send it to your client to set expectations.

PRO TIP: Send kickoff plans within 24 hours of contract signing. It builds confidence and reduces day-one questions.

Want kickoff plans that generate themselves from your CRM? Check out SPEC Systems at specsystemshq.com

[INSERT YOUR LOGO HERE]

[YOUR COMPANY NAME]

[PHONE]  |  [EMAIL]  |  [WEBSITE]
[CITY/SERVICE AREA, STATE]  |  License #: [LICENSE]


PROJECT KICKOFF PLAN

Prepared for:      [CLIENT NAME]
Project Address:   [PROJECT ADDRESS]
Date:              [DATE]
Project:           [PROJECT TITLE]
Project ID:        [CONTRACT-NUMBER]


WELCOME, [CLIENT NAME]

We're excited to get started on your [PROJECT TITLE]. This kickoff plan gives you a clear picture of what happens next — timeline, who's on your crew, how we'll communicate, and what we need from you.

Any questions during the project? Text or call your project manager directly using the contact info below. We respond fast.


PROJECT SUMMARY

[BRIEF PROJECT DESCRIPTION]

Selected Tier:      [Good / Better / Best]
Contract Value:     [TOTAL AMOUNT]
Estimated Duration: [X] weeks
Start Date:         [START DATE]
Target Completion:  [END DATE]


YOUR PROJECT TEAM

Project Manager:     [YOUR NAME]
                     [PHONE]  |  [EMAIL]
Crew Lead:           [Will be assigned at kickoff]
Subcontractors:      [Listed below, as needed]

Your project manager is your single point of contact. Any question — scope, scheduling, payments, concerns — goes to them. They will loop in the crew or subs as needed.


PHASE SCHEDULE

PHASE 1 — Site Preparation
Week 1 — Remove existing materials, grade and prepare site, soil amendment.
Crew lead will walk the site with you the morning of day one.

PHASE 2 — Hardscape Install
Weeks 2-3 — Pavers, walls, edging, and any stone features.
Heaviest equipment and deliveries happen during this phase.

PHASE 3 — Irrigation & Utilities
Week 3 — Drip lines, smart controller, and any electrical for lighting.
Water will be off for short windows — we'll give 24-hour notice.

PHASE 4 — Plantings & Softscape
Week 4 — Trees, shrubs, perennials, mulch, and final sod if applicable.
We will schedule a walkthrough to confirm plant placement before planting.

PHASE 5 — Lighting & Final Touches
Week 4-5 — Landscape lighting install, final grading, cleanup.

PHASE 6 — Final Walkthrough
Final day — Full walkthrough with you. We address any punch list items, hand off care instructions, and take before-and-after photos.

Timeline is weather-dependent. We'll notify you within 24 hours if any phase shifts.


WHAT TO EXPECT DAILY

Work Hours:          Typically 7:30 AM – 4:30 PM, Monday through Friday
Daily Check-In:      Brief morning update with crew lead
Daily Wrap-Up:       Site cleaned and secured at end of each day
Weather Delays:      Texts sent by 6:30 AM if rain or conditions push us
Noise Windows:       Heaviest noise weeks 1-2 during demo and hardscape


WHAT WE NEED FROM YOU

1.  Property access — gate codes, keys, or confirmed access windows
2.  Water source — one outdoor spigot available for the crew during work hours
3.  Pets secured — dogs and cats kept inside or in a safe area while we work
4.  Parking — let us know the best spot for the work truck and dumpster
5.  HOA approval — if your community requires it, please confirm this is in place
6.  Your phone reachable — for same-day decisions on material swaps or design tweaks


COMMUNICATION

Primary:            Text your project manager — fastest response
Email:              [EMAIL] — for anything that needs documentation
Weekly Updates:     Every Friday, you'll get a short recap of the week plus next week's plan
Photos:             We send progress photos at the end of each phase


PAYMENT SCHEDULE

Deposit:            Already received — thank you
Progress Payment:   Due when [MILESTONE]
Final Payment:      Due after final walkthrough and your approval

Payment links will be emailed ahead of each due date. We accept check, bank transfer, or credit card.


CHANGE ORDERS

If anything changes during the project — scope additions, material upgrades, unexpected site conditions — we document it in a written change order with updated pricing and timeline. Nothing extra gets billed without your written approval.


YOUR RESPONSIBILITIES REMINDER

- Secure pets and personal items in work areas
- Keep vehicles clear of driveway and work zones
- Notify us of any known hazards, buried utilities, or property conditions
- Provide HOA approvals if required
- Be reachable by phone during work hours for fast decisions


NEXT STEPS

1.  Review this kickoff plan — call with any questions
2.  Confirm the start date by replying to this email
3.  We will call 811 for utility marking 3 business days before start
4.  Day 1 — Your project manager walks the site with you before crew arrives

We're looking forward to transforming your property.


Warm regards,

[YOUR NAME]
[YOUR COMPANY NAME]
[PHONE]  |  [EMAIL]  |  [WEBSITE]


CLIENT ACKNOWLEDGMENT

I have reviewed this kickoff plan and understand the timeline, responsibilities, and payment schedule outlined above.

Client Signature: _________________________  Date: _____________
Printed Name: ____________________________   Phone: ____________


This kickoff plan was generated on [DATE].

Template by SPEC Sheets  |  specsystemshq.com/sheets
`;

async function main() {
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    console.error('ERROR: GOOGLE_REFRESH_TOKEN not set in .env');
    console.error('Run this script from the same machine that hosts the CRM, or copy the .env file.');
    process.exit(1);
  }

  const auth  = getAuth();
  const docs  = google.docs({ version: 'v1', auth });
  const drive = google.drive({ version: 'v3', auth });

  console.log('Creating kickoff template document...');

  // 1. Create the doc
  const created = await docs.documents.create({
    requestBody: { title: 'SPEC Sheets - Landscaping Project Kickoff' },
  });
  const docId = created.data.documentId;
  console.log(`Created: https://docs.google.com/document/d/${docId}/edit`);

  // 2. Insert the template body
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [{
        insertText: { location: { index: 1 }, text: KICKOFF_TEMPLATE_BODY },
      }],
    },
  });

  // 3. Apply basic formatting (bold on section headers)
  try {
    const doc = await docs.documents.get({ documentId: docId });
    const content = doc.data.body?.content || [];
    const reqs = [];
    const SECTION_HEADERS = new Set([
      'HOW TO USE THIS KICKOFF TEMPLATE',
      'PROJECT KICKOFF PLAN',
      'PROJECT SUMMARY',
      'YOUR PROJECT TEAM',
      'PHASE SCHEDULE',
      'WHAT TO EXPECT DAILY',
      'WHAT WE NEED FROM YOU',
      'COMMUNICATION',
      'PAYMENT SCHEDULE',
      'CHANGE ORDERS',
      'YOUR RESPONSIBILITIES REMINDER',
      'NEXT STEPS',
      'CLIENT ACKNOWLEDGMENT',
    ]);
    for (const block of content) {
      if (!block.paragraph) continue;
      const text = (block.paragraph.elements || [])
        .map(el => el.textRun?.content || '').join('').trim();
      if (SECTION_HEADERS.has(text)) {
        reqs.push({
          updateTextStyle: {
            range: { startIndex: block.startIndex, endIndex: block.endIndex - 1 },
            textStyle: {
              bold: true,
              fontSize: { magnitude: 13, unit: 'PT' },
              foregroundColor: { color: { rgbColor: { red: 0.039, green: 0.133, blue: 0.251 } } },
            },
            fields: 'bold,fontSize,foregroundColor',
          },
        });
      }
    }
    if (reqs.length) {
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: { requests: reqs },
      });
      console.log(`Applied formatting to ${reqs.length} section headers`);
    }
  } catch (fmtErr) {
    console.warn('Formatting step failed (non-fatal):', fmtErr.message);
  }

  // 4. Share with anyone with the link
  try {
    await drive.permissions.create({
      fileId: docId,
      requestBody: { role: 'reader', type: 'anyone' },
    });
  } catch (permErr) {
    console.warn('Could not set public permission:', permErr.message);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('DONE! Kickoff template created.');
  console.log('');
  console.log(`Doc ID:  ${docId}`);
  console.log(`URL:     https://docs.google.com/document/d/${docId}/edit`);
  console.log('');
  console.log('NEXT: Paste that Doc ID into Settings → Kickoff Template ID.');
  console.log('═══════════════════════════════════════════════════════════════');

  return { docId, docUrl: `https://docs.google.com/document/d/${docId}/edit` };
}

// Export for reuse in the admin endpoint (so it can run without CLI)
module.exports = { createKickoffTemplate: main };

// When run directly from CLI, also execute
if (require.main === module) {
  main().catch(err => {
    console.error('Failed:', err.message);
    process.exit(1);
  });
}
