/**
 * Creates all 4 SPEC Sheets document templates (Proposal, Estimate, Contract,
 * Kickoff) in the authenticated Google account's Drive.
 *
 * These templates live in Railway's Google account so they're always
 * accessible for `drive.files.copy`. No sharing configuration needed.
 *
 * Each template uses [BRACKETED] placeholders that the template-doc-generator
 * fills in at document creation time.
 *
 * Exports { createAllTemplates } for use in the admin setup-demo endpoint.
 * Can also be run directly: node scripts/create-all-templates.js
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

// ─── TEMPLATE CONTENT ───────────────────────────────────────────────────────

const PROPOSAL_BODY = `[YOUR COMPANY NAME]

[PHONE]  |  [EMAIL]  |  [WEBSITE]
[CITY/SERVICE AREA, STATE]  |  License #: [LICENSE]

───────────────────────────────────────────────────────────────

PROJECT PROPOSAL

Prepared for:    [CLIENT NAME]
Project Address: [PROJECT ADDRESS]
Date:            [DATE]
Project:         [PROJECT TITLE]
Proposal #:      [PROPOSAL_NUMBER]

───────────────────────────────────────────────────────────────

Dear [CLIENT NAME],

Thank you for the opportunity to present this proposal for your [PROJECT TITLE]. We're excited to transform your property with quality work you'll enjoy for years to come.

[PROJECT DESCRIPTION]

───────────────────────────────────────────────────────────────

PROJECT SCOPE

SITE PREPARATION
•  Remove existing materials and overgrown vegetation
•  Haul away all debris and dispose of properly
•  Grade and prepare work areas with proper drainage
•  Soil amendment as needed for project requirements

PRIMARY INSTALLATION
•  Professional installation to manufacturer specifications
•  Quality materials selected for your tier choice
•  Proper base preparation and compaction
•  Finishing details completed to industry standards

FINAL FINISHING
•  Mulching, edging, and bed preparation
•  Cleanup and debris removal
•  Client walkthrough and punch list
•  Care and maintenance instructions

───────────────────────────────────────────────────────────────

INVESTMENT OPTIONS — THREE TIERS

We offer three tiers so you can match the investment to what fits best for your home.

▸ GOOD TIER — [GOOD_TIER_AMOUNT]
  The Essential Package
  • Standard-grade materials and layouts
  • Professional installation
  • All labor, materials, and cleanup included
  • Industry-standard warranty

▸ BETTER TIER — [BETTER_TIER_AMOUNT]  RECOMMENDED
  The Premium Package
  • Everything in Good, plus:
  • Premium materials and product upgrades
  • Enhanced design features
  • Extended warranty coverage
  • Post-installation care consultation

▸ BEST TIER — [BEST_TIER_AMOUNT]
  The Signature Experience
  • Everything in Better, plus:
  • Top-of-the-line materials
  • Custom design elements
  • Lifetime craftsmanship guarantee
  • Quarterly check-ins for the first year

───────────────────────────────────────────────────────────────

PROJECT TIMELINE

Estimated Duration: [X-X weeks]
Start Date:         [START DATE]
Target Completion:  [END DATE]

Weather and material availability may affect the timeline. We will notify you within 24 hours of any schedule changes.

───────────────────────────────────────────────────────────────

WHAT'S INCLUDED

✓  All labor and professional installation
✓  All materials specified in your selected tier
✓  Proper site preparation and grading
✓  Debris removal and daily cleanup
✓  Professional project management
✓  Post-installation walkthrough
✓  Care and maintenance instructions
✓  Licensed, insured, and bonded crew
✓  Satisfaction guarantee

───────────────────────────────────────────────────────────────

PAYMENT TERMS

30% Deposit    Due upon acceptance to secure your project date
40% Midpoint   Due when [MILESTONE]
30% Final      Due upon project completion and your approval

We accept checks, bank transfers, and major credit cards.

───────────────────────────────────────────────────────────────

NEXT STEPS

1.  Review the three tier options above
2.  Select the package that fits your vision
3.  Reply to this email or give us a call to confirm
4.  We'll send the formal contract and schedule your start date

We're ready when you are.


Warm regards,

[YOUR NAME]
[YOUR COMPANY NAME]
[PHONE]  |  [EMAIL]  |  [WEBSITE]

───────────────────────────────────────────────────────────────

CLIENT ACCEPTANCE

By signing below, I accept this proposal and authorize the work described above at the selected tier.

Selected Tier:    □ Good   □ Better   □ Best

Client Signature: _________________________  Date: _____________
Printed Name:     _________________________  Phone: ____________

───────────────────────────────────────────────────────────────

This proposal is valid for 30 days from the date above.

Generated by [YOUR COMPANY NAME]  |  Powered by SPEC Systems
`;

const ESTIMATE_BODY = `[YOUR COMPANY NAME]

[PHONE]  |  [EMAIL]  |  [WEBSITE]
[CITY/SERVICE AREA, STATE]  |  License #: [LICENSE]

───────────────────────────────────────────────────────────────

JOB ESTIMATE

Estimate #:     [EST-0001]
Date:           [DATE]
Valid Until:    [DATE + 30 DAYS]
Prepared By:    [YOUR NAME]

───────────────────────────────────────────────────────────────

PREPARED FOR

Client:    [CLIENT NAME]
Address:   [CLIENT ADDRESS]
Phone:     [CLIENT PHONE]
Email:     [CLIENT EMAIL]

───────────────────────────────────────────────────────────────

PROJECT DESCRIPTION

[PROJECT DESCRIPTION]

───────────────────────────────────────────────────────────────

COST BREAKDOWN

SITE PREPARATION
Debris Removal          1     Clear existing vegetation
Grading                 1     Grade and prepare all work areas
Soil Amendment          As needed

MATERIALS & INSTALLATION
Primary materials       Per scope
Installation labor      Professional crew
Secondary materials     Per scope

FINISHING
Mulch / Edging          Per scope
Final cleanup           Included

───────────────────────────────────────────────────────────────

TOTAL ESTIMATE:         [TOTAL AMOUNT]

───────────────────────────────────────────────────────────────

NOTES & ASSUMPTIONS

•  This estimate is based on the site visit conducted on [DATE] and information provided by the client.
•  Prices include all labor, materials, equipment, and cleanup unless otherwise noted.
•  Estimate does not include permits, engineering, or unforeseen underground conditions.
•  Material prices are subject to change based on availability. Substitutions of equal quality may be made with client approval.
•  Estimate assumes normal soil conditions. Rock, caliche, or heavily compacted soil may require additional charges.

───────────────────────────────────────────────────────────────

ESTIMATED TIMELINE

Estimated project duration: [X-X weeks] from start date
Earliest available start:   [START DATE]
Target completion:          [END DATE]

Timeline is weather-dependent and subject to material availability.

───────────────────────────────────────────────────────────────

NEXT STEPS

Ready to move forward? Here's how:

1.  Approve this estimate by signing below or responding via email
2.  We will send you a detailed Service Contract for signature
3.  A 30% deposit secures your project date and starts material ordering
4.  Questions? Call us at [PHONE] or email [EMAIL]

───────────────────────────────────────────────────────────────

ESTIMATE ACCEPTANCE

I have reviewed this estimate and would like to proceed. I understand this is an estimate and the final price may vary based on actual conditions encountered.

Client Signature: _________________________  Date: _____________
Printed Name:     _________________________  Phone: ____________

───────────────────────────────────────────────────────────────

This estimate is valid for 30 days from the date above.
This is an estimate only, not a binding contract. A formal Service Contract will be provided upon acceptance.

Generated by [YOUR COMPANY NAME]  |  Powered by SPEC Systems
`;

const CONTRACT_BODY = `[YOUR COMPANY NAME]

[PHONE]  |  [EMAIL]  |  [WEBSITE]
[CITY/SERVICE AREA, STATE]  |  License #: [LICENSE]

───────────────────────────────────────────────────────────────

SERVICE CONTRACT

Contract #: [CONTRACT-NUMBER]
Date:       [DATE]

───────────────────────────────────────────────────────────────

CONTRACTOR                      CLIENT
[YOUR COMPANY NAME]             [CLIENT NAME]
[YOUR ADDRESS]                  [CLIENT ADDRESS]
[PHONE]                         [CLIENT PHONE]
[EMAIL]                         [CLIENT EMAIL]
License #: [LICENSE]

───────────────────────────────────────────────────────────────

SECTION 1 — PROJECT DETAILS

Project Address:      [PROJECT ADDRESS]
Project Description:  [PROJECT DESCRIPTION]
Selected Tier:        [Good / Better / Best]
Start Date:           [START DATE]
Estimated Completion: [END DATE]
Duration:             [X] weeks from start date

───────────────────────────────────────────────────────────────

SECTION 2 — SCOPE OF WORK

The Contractor agrees to perform the following work at the project address:

2.1  SITE PREPARATION
     •  Remove existing materials and debris
     •  Grade and prepare all work areas
     •  Soil amendment as needed

2.2  PRIMARY INSTALLATION
     •  Install materials per selected tier specifications
     •  Follow manufacturer guidelines
     •  Quality control at each milestone

2.3  FINISHING
     •  Apply finishing materials (mulch, edging, etc.)
     •  Final cleanup and debris removal
     •  Client walkthrough and punch list completion

───────────────────────────────────────────────────────────────

SECTION 3 — PRICING & PAYMENT

Total Contract Price: [TOTAL AMOUNT]
Selected Tier:        [Good / Better / Best]

PAYMENT SCHEDULE

Deposit (30%)         Due upon signing — secures project date
Progress (40%)        Due when [MILESTONE]
Final (30%)           Due upon completion and final walkthrough

Accepted payment methods: checks, credit cards, bank transfers.

───────────────────────────────────────────────────────────────

SECTION 4 — PROJECT TIMELINE

Work shall commence on or about [START DATE] and be substantially completed within [X] weeks, weather and material availability permitting. The Contractor will notify the Client promptly of any anticipated delays.

───────────────────────────────────────────────────────────────

SECTION 5 — MATERIALS & WARRANTY

5.1  All materials shall be new and of good quality unless otherwise specified.
5.2  The Contractor warrants all workmanship for a period of 1 YEAR from the date of completion.
5.3  Material warranties pass through per manufacturer terms.

───────────────────────────────────────────────────────────────

SECTION 6 — CHANGE ORDERS

Any changes to the scope of work must be agreed upon in writing by both parties before work proceeds. Change orders may affect the contract price and timeline. No additional charges will be incurred without written Client approval.

───────────────────────────────────────────────────────────────

SECTION 7 — CANCELLATION

7.1  The Client may cancel this contract within 3 business days of signing for a full refund of the deposit.
7.2  After the cancellation period, the Client may terminate this contract with written notice and shall pay for all work completed and materials ordered to date.
7.3  The Contractor may terminate for non-payment after 15 days and written notice.

───────────────────────────────────────────────────────────────

SECTION 8 — INSURANCE & LIABILITY

The Contractor maintains general liability insurance and workers compensation as required by [STATE] law. The Contractor is not liable for damage to unmarked underground utilities. The Client agrees to call 811 at least 3 business days before project start.

───────────────────────────────────────────────────────────────

SECTION 9 — DISPUTE RESOLUTION

Any disputes shall first be addressed through good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to mediation in accordance with [STATE] law.

───────────────────────────────────────────────────────────────

SECTION 10 — CLIENT RESPONSIBILITIES

•  Provide reasonable property access during work hours
•  Secure pets and personal items
•  Clear vehicles from work areas
•  Notify of known hazards or site conditions
•  Obtain HOA approvals if required

───────────────────────────────────────────────────────────────

SECTION 11 — GENERAL PROVISIONS

11.1  This contract is the entire agreement between the parties.
11.2  Governed by the laws of the State of [STATE].
11.3  If any provision is unenforceable, the remainder stays in effect.
11.4  Contractor may place a project sign on the property, subject to Client approval.

───────────────────────────────────────────────────────────────

SIGNATURES

By signing below, both parties agree to the terms set forth in this contract.

CONTRACTOR                              CLIENT
Signature: ____________________        Signature: ____________________
Printed:   ____________________        Printed:   ____________________
Date:      ____________________        Date:      ____________________

───────────────────────────────────────────────────────────────

This contract is valid for 30 days from the date of preparation.

Generated by [YOUR COMPANY NAME]  |  Powered by SPEC Systems
`;

const KICKOFF_BODY = `[YOUR COMPANY NAME]

[PHONE]  |  [EMAIL]  |  [WEBSITE]
[CITY/SERVICE AREA, STATE]  |  License #: [LICENSE]

───────────────────────────────────────────────────────────────

PROJECT KICKOFF PLAN

Prepared for:      [CLIENT NAME]
Project Address:   [PROJECT ADDRESS]
Date:              [DATE]
Project:           [PROJECT TITLE]
Project ID:        [CONTRACT-NUMBER]

───────────────────────────────────────────────────────────────

WELCOME, [CLIENT NAME]

We're excited to get started on your [PROJECT TITLE]. This kickoff plan gives you a clear picture of what happens next — timeline, who's on your crew, how we'll communicate, and what we need from you.

Any questions during the project? Text or call your project manager directly. We respond fast.

───────────────────────────────────────────────────────────────

PROJECT SUMMARY

[PROJECT DESCRIPTION]

Selected Tier:      [Good / Better / Best]
Contract Value:     [TOTAL AMOUNT]
Estimated Duration: [X] weeks
Start Date:         [START DATE]
Target Completion:  [END DATE]

───────────────────────────────────────────────────────────────

YOUR PROJECT TEAM

Project Manager:     [YOUR NAME]
                     [PHONE]  |  [EMAIL]
Crew Lead:           Assigned at kickoff
Subcontractors:      As needed

Your project manager is your single point of contact. Any question goes to them. They loop in crew or subs as needed.

───────────────────────────────────────────────────────────────

PHASE SCHEDULE

Week 1 — Site Preparation
Remove existing materials, grade site, soil amendment.

Weeks 2-3 — Primary Installation
Main project work per selected tier specifications.

Week 3 — Secondary Installations
Irrigation, electrical, or related system work.

Weeks 4 — Finishing
Plantings, lighting, edging, final details.

Week 4-5 — Cleanup & Walkthrough
Final cleanup, walkthrough with you, punch list, photos.

Timeline is weather-dependent. We notify within 24 hours of shifts.

───────────────────────────────────────────────────────────────

WHAT TO EXPECT DAILY

Work Hours:        7:30 AM – 4:30 PM, Mon–Fri
Daily Wrap-Up:     Site cleaned and secured end of day
Weather Delays:    Texts sent by 6:30 AM if rain
Noise Windows:     Heaviest weeks 1-2 (demo / primary install)

───────────────────────────────────────────────────────────────

WHAT WE NEED FROM YOU

1.  Property access — gate codes, keys, or confirmed access windows
2.  Water source — one outdoor spigot for the crew
3.  Pets secured — dogs/cats inside or in a safe area during work
4.  Parking — best spot for work truck and dumpster
5.  HOA approval — if your community requires it, confirm in place
6.  Phone reachable — for same-day decisions on swaps or tweaks

───────────────────────────────────────────────────────────────

COMMUNICATION

Primary:           Text your project manager — fastest response
Email:             [EMAIL] — for anything needing documentation
Weekly Updates:    Every Friday, short recap + next week's plan
Photos:            Progress photos at the end of each phase

───────────────────────────────────────────────────────────────

PAYMENT SCHEDULE

Deposit:           Already received — thank you
Progress Payment:  Due when [MILESTONE]
Final Payment:     Due after final walkthrough and your approval

Payment links emailed ahead of each due date. Check, bank transfer, or credit card accepted.

───────────────────────────────────────────────────────────────

CHANGE ORDERS

If anything changes during the project we document it in a written change order with updated pricing and timeline. Nothing extra gets billed without your written approval.

───────────────────────────────────────────────────────────────

NEXT STEPS

1.  Review this kickoff plan — call with any questions
2.  Confirm the start date by replying
3.  We call 811 for utility marking 3 business days before start
4.  Day 1 — Your project manager walks the site with you before crew arrives

We're looking forward to transforming your property.


Warm regards,

[YOUR NAME]
[YOUR COMPANY NAME]
[PHONE]  |  [EMAIL]  |  [WEBSITE]

───────────────────────────────────────────────────────────────

CLIENT ACKNOWLEDGMENT

I have reviewed this kickoff plan and understand the timeline, responsibilities, and payment schedule outlined above.

Client Signature: _________________________  Date: _____________
Printed Name:     _________________________  Phone: ____________

───────────────────────────────────────────────────────────────

Generated by [YOUR COMPANY NAME]  |  Powered by SPEC Systems
`;

const TEMPLATES = {
  proposal: { title: 'SPEC Sheets - Proposal Template',  body: PROPOSAL_BODY },
  estimate: { title: 'SPEC Sheets - Estimate Template',  body: ESTIMATE_BODY },
  contract: { title: 'SPEC Sheets - Contract Template',  body: CONTRACT_BODY },
  kickoff:  { title: 'SPEC Sheets - Kickoff Template',   body: KICKOFF_BODY },
};

// ─── ONE-DOC CREATOR ────────────────────────────────────────────────────────

async function createOne(auth, { title, body }) {
  const docs  = google.docs({ version: 'v1', auth });
  const drive = google.drive({ version: 'v3', auth });

  // 1. Create blank doc
  const created = await docs.documents.create({ requestBody: { title } });
  const docId = created.data.documentId;

  // 2. Insert the body
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [{ insertText: { location: { index: 1 }, text: body } }],
    },
  });

  // 3. Apply section header formatting (bold, navy color)
  try {
    const doc = await docs.documents.get({ documentId: docId });
    const content = doc.data.body?.content || [];
    const reqs = [];
    // Section headers are UPPERCASE lines
    for (const block of content) {
      if (!block.paragraph) continue;
      const text = (block.paragraph.elements || []).map(el => el.textRun?.content || '').join('').trim();
      // Uppercase text of 4-60 chars that doesn't start with a dash/divider
      if (/^[A-Z][A-Z\s&\/—\-#0-9.,()]+$/.test(text) && text.length >= 4 && text.length <= 60 && !/^─+$/.test(text)) {
        reqs.push({
          updateTextStyle: {
            range: { startIndex: block.startIndex, endIndex: block.endIndex - 1 },
            textStyle: {
              bold: true,
              fontSize: { magnitude: 12, unit: 'PT' },
              foregroundColor: { color: { rgbColor: { red: 0.039, green: 0.133, blue: 0.251 } } }, // navy
            },
            fields: 'bold,fontSize,foregroundColor',
          },
        });
      }
    }
    if (reqs.length) {
      // Batch size limit: 50
      for (let i = 0; i < reqs.length; i += 50) {
        await docs.documents.batchUpdate({
          documentId: docId,
          requestBody: { requests: reqs.slice(i, i + 50) },
        });
      }
    }
  } catch (fmtErr) {
    console.warn(`Formatting skipped for ${title}: ${fmtErr.message}`);
  }

  // 4. Share anyone-with-link (for copying)
  try {
    await drive.permissions.create({
      fileId: docId,
      requestBody: { role: 'reader', type: 'anyone' },
    });
  } catch (permErr) {
    console.warn(`Share skipped for ${title}: ${permErr.message}`);
  }

  return { docId, docUrl: `https://docs.google.com/document/d/${docId}/edit`, title };
}

// ─── MAIN ENTRY ─────────────────────────────────────────────────────────────

async function createAllTemplates(only = null) {
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    throw new Error('GOOGLE_REFRESH_TOKEN not set — cannot create templates');
  }

  const auth = getAuth();
  const results = {};
  const types = only ? [only] : Object.keys(TEMPLATES);

  for (const type of types) {
    if (!TEMPLATES[type]) continue;
    try {
      console.log(`Creating ${type} template...`);
      const r = await createOne(auth, TEMPLATES[type]);
      results[type] = r;
      console.log(`  → ${r.docUrl}`);
    } catch (err) {
      console.error(`  ✗ ${type} failed:`, err.message);
      results[type] = { error: err.message };
    }
  }
  return results;
}

module.exports = { createAllTemplates, TEMPLATES };

// CLI mode
if (require.main === module) {
  createAllTemplates()
    .then(results => {
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('DONE! All 4 templates created.\n');
      Object.entries(results).forEach(([type, r]) => {
        if (r.docId) console.log(`${type.padEnd(10)} → ${r.docId}`);
        else         console.log(`${type.padEnd(10)} FAILED: ${r.error}`);
      });
      console.log('\nPaste these IDs into Settings → Document Templates.');
      console.log('═══════════════════════════════════════════════════════════════');
    })
    .catch(err => {
      console.error('Failed:', err.message);
      process.exit(1);
    });
}
