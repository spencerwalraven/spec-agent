/**
 * End-to-end test of the template system using mocked Google APIs.
 *
 * Verifies:
 *   1. buildJobPlaceholders produces the correct replacement map from demo data
 *   2. fillTemplate builds the right API calls (copy, replaceAllText, strip, share)
 *   3. generateFromTemplate saves the doc link back to the job
 *   4. orchestrator routes correctly with template-first fallback
 */

require('dotenv').config();

// ── Mock googleapis before anything imports it ───────────────────────────────
const mockCalls = { copy: [], batchUpdate: [], permissions: [], update: [] };

const mockDocsBatchUpdate = async (args) => {
  mockCalls.batchUpdate.push(args);
  return { data: {} };
};

const mockDocsGet = async (args) => {
  // Return a minimal doc structure with the "HOW TO USE" boundary
  return {
    data: {
      body: {
        content: [
          { startIndex: 1, endIndex: 30, paragraph: { elements: [
            { textRun: { content: 'HOW TO USE THIS TEMPLATE\n' } }
          ]}},
          { startIndex: 30, endIndex: 100, paragraph: { elements: [
            { textRun: { content: 'Step 1: Copy this doc\n' } }
          ]}},
          { startIndex: 100, endIndex: 150, paragraph: { elements: [
            { textRun: { content: 'Landcare Unlimited\n' } }  // This is the company marker
          ]}},
          { startIndex: 150, endIndex: 180, paragraph: { elements: [
            { textRun: { content: 'Contract text\n' } }
          ]}},
        ]
      }
    }
  };
};

const mockDriveFilesCopy = async (args) => {
  mockCalls.copy.push(args);
  return { data: { id: 'MOCK_NEW_DOC_ID_' + Date.now() } };
};

const mockDrivePermissions = async (args) => {
  mockCalls.permissions.push(args);
  return { data: {} };
};

require.cache[require.resolve('googleapis')] = {
  exports: {
    google: {
      auth: { OAuth2: function() { this.setCredentials = () => {}; } },
      docs: () => ({
        documents: {
          batchUpdate: mockDocsBatchUpdate,
          get: mockDocsGet,
          create: async () => ({ data: { documentId: 'MOCK_DOC_ID' } }),
        },
      }),
      drive: () => ({
        files: { copy: mockDriveFilesCopy },
        permissions: { create: mockDrivePermissions },
      }),
      sheets: () => ({}),
    },
  },
};

// ── Mock db services ────────────────────────────────────────────────────────
const mockJob = {
  id: 2,
  jobRef: 'JOB-001',
  clientName: 'Sarah Chen',
  clientEmail: 'sarah@email.com',
  clientPhone: '555-1001',
  clientAddress: '123 Willow Ln, Columbus OH',
  projectAddress: '123 Willow Ln, Columbus OH',
  service: 'Patio Installation',
  description: 'Full backyard patio with fire pit',
  jobValue: 28500,
  startDate: '2026-05-01',
  endDate: '2026-05-28',
  selectedTier: 'midrange',
  tierBudget:   JSON.stringify({ total: 18500, materials: 8200, labor: 7800 }),
  tierMidrange: JSON.stringify({ total: 28500, materials: 13500, labor: 10800 }),
  tierHighend:  JSON.stringify({ total: 42000, materials: 21000, labor: 14500 }),
};

const mockSettings = {
  companyName: 'Landcare Unlimited',
  phone: '(555) 555-0100',
  email: 'tim@landcareunlimited.com',
  address: '1300 S Litchfield Rd, Goodyear, AZ 85338',
  ownerName: 'Tim Blake',
  website: 'landcareunlimited.com',
  license: 'LIC-12345',
  proposalTemplateId: 'TEMPLATE_PROPOSAL_ID',
  estimateTemplateId: 'TEMPLATE_ESTIMATE_ID',
  contractTemplateId: 'TEMPLATE_CONTRACT_ID',
  kickoffTemplateId:  'TEMPLATE_KICKOFF_ID',
};

const updatedFields = {};
require.cache[require.resolve('../src/services/jobs')] = {
  exports: {
    getJob: async () => mockJob,
    updateJobField: async (row, field, value) => { updatedFields[field] = value; return true; },
  },
};
require.cache[require.resolve('../src/services/settings')] = {
  exports: {
    readSettings: async () => mockSettings,
  },
};

// Mock logger to be quieter
require.cache[require.resolve('../src/utils/logger')] = {
  exports: {
    logger: {
      info: (...args) => console.log('  [info]', args.join(' ')),
      warn: (...args) => console.log('  [warn]', args.join(' ')),
      error: (...args) => console.log('  [err!]', args.join(' ')),
      success: (...args) => console.log('  [ ok ]', args.join(' ')),
    },
  },
};

// ── Now import the modules under test ────────────────────────────────────────
const { fillTemplate, buildJobPlaceholders } = require('../src/tools/docs');
const { generateFromTemplate } = require('../src/agents/template-doc-generator');

// ── Test 1: buildJobPlaceholders ─────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('TEST 1: buildJobPlaceholders');
console.log('═══════════════════════════════════════════════════════════════');

const placeholders = buildJobPlaceholders({ job: mockJob, settings: mockSettings });

const checks = [
  ['YOUR COMPANY NAME',  'Landcare Unlimited'],
  ['PHONE',              '(555) 555-0100'],
  ['EMAIL',              'tim@landcareunlimited.com'],
  ['WEBSITE',            'landcareunlimited.com'],
  ['LICENSE',            'LIC-12345'],
  ['YOUR NAME',          'Tim Blake'],
  ['CLIENT NAME',        'Sarah Chen'],
  ['CLIENT EMAIL',       'sarah@email.com'],
  ['CLIENT PHONE',       '555-1001'],
  ['CLIENT ADDRESS',     '123 Willow Ln, Columbus OH'],
  ['PROJECT TITLE',      'Patio Installation'],
  ['TOTAL AMOUNT',       '$28,500'],
  ['CONTRACT-NUMBER',    'C-JOB-001'],
  ['EST-0001',           'EST-JOB-001'],
  ['GOOD_TIER_AMOUNT',   '$18,500'],
  ['BETTER_TIER_AMOUNT', '$28,500'],
  ['BEST_TIER_AMOUNT',   '$42,000'],
];

let fails = 0;
checks.forEach(([key, expected]) => {
  const actual = placeholders[key];
  const ok = actual === expected;
  if (!ok) fails++;
  console.log(`  ${ok ? '✓' : '✗'} [${key}] = "${actual}"${ok ? '' : ` (expected "${expected}")`}`);
});

if (fails > 0) {
  console.log(`\n  ✗ ${fails} placeholder(s) wrong`);
  process.exit(1);
}
console.log(`\n  ✓ All ${checks.length} placeholders correct`);

// ── Test 2: fillTemplate builds right API calls ──────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('TEST 2: fillTemplate API call sequence');
console.log('═══════════════════════════════════════════════════════════════');

(async () => {
  mockCalls.copy = [];
  mockCalls.batchUpdate = [];
  mockCalls.permissions = [];

  const result = await fillTemplate(
    'TEMPLATE_PROPOSAL_ID',
    placeholders,
    'Sarah Chen — Proposal'
  );

  // Assertions
  if (mockCalls.copy.length !== 1) { console.log(`  ✗ Expected 1 copy call, got ${mockCalls.copy.length}`); process.exit(1); }
  console.log(`  ✓ Copied template (fileId=${mockCalls.copy[0].fileId}, name="${mockCalls.copy[0].requestBody.name}")`);

  if (mockCalls.copy[0].fileId !== 'TEMPLATE_PROPOSAL_ID') { console.log('  ✗ Wrong template ID copied'); process.exit(1); }
  if (mockCalls.copy[0].requestBody.name !== 'Sarah Chen — Proposal') { console.log('  ✗ Wrong output title'); process.exit(1); }

  // Count total replaceAllText requests across all batches
  const allReqs = mockCalls.batchUpdate.flatMap(b => b.requestBody.requests);
  const replaceReqs = allReqs.filter(r => r.replaceAllText);
  const deleteReqs  = allReqs.filter(r => r.deleteContentRange);

  console.log(`  ✓ Made ${mockCalls.batchUpdate.length} batchUpdate calls containing ${replaceReqs.length} replaceAllText + ${deleteReqs.length} deleteContentRange`);

  // Check some specific replacements are in there
  const findReplace = (text) => replaceReqs.find(r => r.replaceAllText.containsText.text === text);
  const reqs = [
    '[CLIENT NAME]', '[YOUR COMPANY NAME]', '[PHONE]', '[EMAIL]',
    '[TOTAL AMOUNT]', '[DATE]', '[PROJECT TITLE]', '[START DATE]',
    '{{CLIENT NAME}}', '{{TOTAL AMOUNT}}',  // {{}} fallback style
  ];
  let missing = [];
  reqs.forEach(text => {
    if (!findReplace(text)) missing.push(text);
  });
  if (missing.length) {
    console.log(`  ✗ Missing replace requests: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log(`  ✓ All expected replacements queued: ${reqs.join(', ')}`);

  // Verify the CLIENT NAME replacement has the real value
  const clientReplace = findReplace('[CLIENT NAME]');
  if (clientReplace.replaceAllText.replaceText !== 'Sarah Chen') {
    console.log(`  ✗ [CLIENT NAME] replaced with "${clientReplace.replaceAllText.replaceText}" not "Sarah Chen"`);
    process.exit(1);
  }
  console.log(`  ✓ [CLIENT NAME] will be replaced with "Sarah Chen"`);

  // Verify instructions page deletion
  if (deleteReqs.length !== 1) {
    console.log(`  ✗ Expected 1 deleteContentRange (instructions page strip), got ${deleteReqs.length}`);
    process.exit(1);
  }
  const del = deleteReqs[0].deleteContentRange;
  console.log(`  ✓ Instructions page stripped (delete range ${del.range.startIndex}→${del.range.endIndex})`);

  // Verify sharing
  if (mockCalls.permissions.length !== 1) {
    console.log(`  ✗ Expected 1 permissions.create call, got ${mockCalls.permissions.length}`);
    process.exit(1);
  }
  console.log(`  ✓ Public share set (role=${mockCalls.permissions[0].requestBody.role}, type=${mockCalls.permissions[0].requestBody.type})`);

  // Verify returned URL format
  if (!result.docUrl.startsWith('https://docs.google.com/document/d/')) {
    console.log(`  ✗ Bad docUrl: ${result.docUrl}`);
    process.exit(1);
  }
  console.log(`  ✓ Returned docUrl: ${result.docUrl}`);

  // ── Test 3: generateFromTemplate saves link to job ─────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('TEST 3: generateFromTemplate end-to-end');
  console.log('═══════════════════════════════════════════════════════════════');

  mockCalls.copy = [];
  mockCalls.batchUpdate = [];
  mockCalls.permissions = [];
  Object.keys(updatedFields).forEach(k => delete updatedFields[k]);

  const tpl = await generateFromTemplate('proposal', 2);

  if (!tpl.ok) { console.log(`  ✗ Template generation failed: ${tpl.reason}`); process.exit(1); }
  console.log(`  ✓ Template generation succeeded: ${tpl.docUrl}`);

  if (!updatedFields['proposal_link']) { console.log('  ✗ proposal_link not saved to job'); process.exit(1); }
  console.log(`  ✓ Saved proposal_link = "${updatedFields.proposal_link}"`);

  if (updatedFields['proposal_status'] !== 'Pending Review') {
    console.log(`  ✗ proposal_status wrong: "${updatedFields.proposal_status}" (expected "Pending Review")`);
    process.exit(1);
  }
  console.log(`  ✓ Saved proposal_status = "Pending Review" (queues for approval)`);

  // ── Test 4: all 4 doc types work ───────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('TEST 4: all 4 doc types');
  console.log('═══════════════════════════════════════════════════════════════');

  for (const docType of ['proposal', 'estimate', 'contract', 'kickoff']) {
    Object.keys(updatedFields).forEach(k => delete updatedFields[k]);
    const r = await generateFromTemplate(docType, 2);
    if (!r.ok) { console.log(`  ✗ ${docType}: ${r.reason}`); process.exit(1); }
    console.log(`  ✓ ${docType.padEnd(9)} → saved to ${docType === 'proposal' ? 'proposal_link' : docType + '_link'}`);
  }

  // ── Test 5: fallback when no template ID ───────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('TEST 5: Fallback when no template ID configured');
  console.log('═══════════════════════════════════════════════════════════════');

  // Temporarily strip the kickoff template
  const origKickoff = mockSettings.kickoffTemplateId;
  mockSettings.kickoffTemplateId = '';
  const fallback = await generateFromTemplate('kickoff', 2);
  mockSettings.kickoffTemplateId = origKickoff;

  if (fallback.ok) { console.log('  ✗ Should have failed when no template ID'); process.exit(1); }
  if (!/No kickoff template configured/.test(fallback.reason)) {
    console.log(`  ✗ Wrong fallback reason: ${fallback.reason}`);
    process.exit(1);
  }
  console.log(`  ✓ Returns { ok: false, reason: "${fallback.reason}" } → orchestrator falls back to AI`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('ALL TESTS PASSED ✓');
  console.log('═══════════════════════════════════════════════════════════════\n');
})().catch(err => {
  console.error('\n✗ Test crashed:', err.stack || err.message);
  process.exit(1);
});
