/**
 * Google Docs + Drive tool library
 * Creates beautifully formatted professional documents.
 */

require('dotenv').config();
const { google } = require('googleapis');
const { logger } = require('../utils/logger');

// Brand colors (RGB 0–1)
const NAVY  = { red: 0.039, green: 0.133, blue: 0.251 }; // #0A2240
const GOLD  = { red: 0.749, green: 0.580, blue: 0.220 }; // #BF9438
const GRAY  = { red: 0.400, green: 0.400, blue: 0.400 };

function rgb(c) { return { color: { rgbColor: c } }; }

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

/**
 * Detect what kind of line this is so we can format it properly.
 */
function classifyLine(text) {
  const t = text.trim();
  if (!t || t === '\n') return 'empty';
  if (/^[═─=\-]{4,}$/.test(t)) return 'divider';
  if (/^(ESTIMATE|PROPOSAL|CONTRACT|KICKOFF|PROJECT PLAN|INVOICE)\s*[—\-:]/i.test(t)) return 'title';
  if (/^#{1,2}\s/.test(t)) return 'heading';
  if (/^[A-Z][A-Z\s&\/\(\)]+$/.test(t) && t.length >= 4 && t.length <= 60) return 'section';
  if (/^(TOTAL|GRAND TOTAL|SUBTOTAL|PROJECT TOTAL|ESTIMATE TOTAL)[:\s]/i.test(t)) return 'total';
  if (/^(Prepared by|Date:|Client:|Company:|Address:|Job ID:|Proposal #:|Contract #:)/i.test(t)) return 'meta';
  if (/^\$[\d,]+/.test(t) || /\$[\d,]+\s*$/.test(t)) return 'amount';
  if (/^Phase \d+:|^PHASE \d+/i.test(t)) return 'phase';
  return 'body';
}

/**
 * Create a professional Google Doc with full branding and formatting.
 * Returns { docId, docUrl }
 */
async function createDoc({ title, body, companyName }) {
  const auth  = getAuth();
  const docs  = google.docs({ version: 'v1', auth });
  const drive = google.drive({ version: 'v3', auth });

  // ── 1. Create blank document ─────────────────────────────────────────────
  const created = await docs.documents.create({ requestBody: { title } });
  const docId   = created.data.documentId;
  logger.info('Docs', `documents.create returned docId: ${docId}`);

  if (!docId) throw new Error('Google Docs API returned no documentId');

  // ── 2. Build clean text to insert ───────────────────────────────────────
  const cleanBody = (body || '')
    .replace(/^#{1,3}\s+/gm, '')        // strip markdown headings
    .replace(/\*\*(.*?)\*\*/g, '$1')    // strip bold markers
    .replace(/\*(.*?)\*/g, '$1')        // strip italic markers
    .replace(/`(.*?)`/g, '$1')          // strip code markers
    .slice(0, 45000);                   // hard limit

  const insertText = cleanBody.endsWith('\n') ? cleanBody : cleanBody + '\n';

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [{
        insertText: { location: { index: 1 }, text: insertText },
      }],
    },
  });

  // ── 3. Apply formatting ──────────────────────────────────────────────────
  try {
    const doc     = await docs.documents.get({ documentId: docId });
    const content = doc.data.body?.content || [];
    const reqs    = [];
    let   isFirst = true;

    // Set document margins
    reqs.push({
      updateDocumentStyle: {
        documentStyle: {
          marginTop:    { magnitude: 72,  unit: 'PT' },
          marginBottom: { magnitude: 72,  unit: 'PT' },
          marginLeft:   { magnitude: 72,  unit: 'PT' },
          marginRight:  { magnitude: 72,  unit: 'PT' },
        },
        fields: 'marginTop,marginBottom,marginLeft,marginRight',
      },
    });

    for (const block of content) {
      if (!block.paragraph) continue;
      const elems   = block.paragraph.elements || [];
      const rawText = elems.map(el => el.textRun?.content || '').join('');
      const kind    = classifyLine(rawText);
      const start   = block.startIndex;
      const end     = block.endIndex;
      const textEnd = end - 1;

      if (kind === 'empty' || kind === 'divider') continue;

      if (kind === 'title' || (isFirst && kind !== 'meta')) {
        reqs.push({
          updateParagraphStyle: {
            range: { startIndex: start, endIndex: end },
            paragraphStyle: {
              namedStyleType: 'HEADING_1',
              spaceBelow: { magnitude: 6, unit: 'PT' },
              spaceAbove: { magnitude: 0, unit: 'PT' },
            },
            fields: 'namedStyleType,spaceBelow,spaceAbove',
          },
        });
        reqs.push({
          updateTextStyle: {
            range: { startIndex: start, endIndex: textEnd },
            textStyle: {
              bold: true,
              fontSize: { magnitude: 22, unit: 'PT' },
              foregroundColor: rgb(NAVY),
              weightedFontFamily: { weightedFontFamily: 'Arial', weight: 400 },
            },
            fields: 'bold,fontSize,foregroundColor,weightedFontFamily',
          },
        });
        isFirst = false;

      } else if (kind === 'heading' || kind === 'section') {
        reqs.push({
          updateParagraphStyle: {
            range: { startIndex: start, endIndex: end },
            paragraphStyle: {
              namedStyleType: 'HEADING_2',
              spaceAbove: { magnitude: 14, unit: 'PT' },
              spaceBelow: { magnitude: 4,  unit: 'PT' },
            },
            fields: 'namedStyleType,spaceAbove,spaceBelow',
          },
        });
        reqs.push({
          updateTextStyle: {
            range: { startIndex: start, endIndex: textEnd },
            textStyle: {
              bold: true,
              fontSize: { magnitude: 11, unit: 'PT' },
              foregroundColor: rgb(NAVY),
              weightedFontFamily: { weightedFontFamily: 'Arial', weight: 400 },
            },
            fields: 'bold,fontSize,foregroundColor,weightedFontFamily',
          },
        });

      } else if (kind === 'phase') {
        reqs.push({
          updateParagraphStyle: {
            range: { startIndex: start, endIndex: end },
            paragraphStyle: {
              namedStyleType: 'HEADING_3',
              spaceAbove: { magnitude: 10, unit: 'PT' },
              spaceBelow: { magnitude: 2,  unit: 'PT' },
            },
            fields: 'namedStyleType,spaceAbove,spaceBelow',
          },
        });
        reqs.push({
          updateTextStyle: {
            range: { startIndex: start, endIndex: textEnd },
            textStyle: {
              bold: true,
              fontSize: { magnitude: 10, unit: 'PT' },
              foregroundColor: rgb(GOLD),
              weightedFontFamily: { weightedFontFamily: 'Arial', weight: 400 },
            },
            fields: 'bold,fontSize,foregroundColor,weightedFontFamily',
          },
        });

      } else if (kind === 'total') {
        reqs.push({
          updateParagraphStyle: {
            range: { startIndex: start, endIndex: end },
            paragraphStyle: {
              spaceAbove: { magnitude: 10, unit: 'PT' },
              spaceBelow: { magnitude: 6,  unit: 'PT' },
            },
            fields: 'spaceAbove,spaceBelow',
          },
        });
        reqs.push({
          updateTextStyle: {
            range: { startIndex: start, endIndex: textEnd },
            textStyle: {
              bold: true,
              fontSize: { magnitude: 14, unit: 'PT' },
              foregroundColor: rgb(NAVY),
              weightedFontFamily: { weightedFontFamily: 'Arial', weight: 400 },
            },
            fields: 'bold,fontSize,foregroundColor,weightedFontFamily',
          },
        });

      } else if (kind === 'meta') {
        reqs.push({
          updateTextStyle: {
            range: { startIndex: start, endIndex: textEnd },
            textStyle: {
              italic: true,
              fontSize: { magnitude: 9, unit: 'PT' },
              foregroundColor: rgb(GRAY),
              weightedFontFamily: { weightedFontFamily: 'Arial', weight: 400 },
            },
            fields: 'italic,fontSize,foregroundColor,weightedFontFamily',
          },
        });

      } else if (kind === 'amount') {
        reqs.push({
          updateTextStyle: {
            range: { startIndex: start, endIndex: textEnd },
            textStyle: {
              bold: true,
              weightedFontFamily: { weightedFontFamily: 'Arial', weight: 400 },
            },
            fields: 'bold,weightedFontFamily',
          },
        });

      } else {
        reqs.push({
          updateTextStyle: {
            range: { startIndex: start, endIndex: textEnd },
            textStyle: {
              fontSize: { magnitude: 10, unit: 'PT' },
              weightedFontFamily: { weightedFontFamily: 'Arial', weight: 400 },
            },
            fields: 'fontSize,weightedFontFamily',
          },
        });
      }
    }

    if (reqs.length > 0) {
      logger.info('Docs', `Applying ${reqs.length} formatting requests`);
      // Send in batches of 50 to stay under API limits
      for (let i = 0; i < reqs.length; i += 50) {
        await docs.documents.batchUpdate({
          documentId: docId,
          requestBody: { requests: reqs.slice(i, i + 50) },
        });
      }
    }
  } catch (fmtErr) {
    logger.warn('Docs', `Formatting step failed (non-fatal): ${fmtErr.message}`);
  }

  // ── 4. Make readable by anyone with link ─────────────────────────────────
  try {
    await drive.permissions.create({
      fileId: docId,
      requestBody: { role: 'reader', type: 'anyone' },
    });
  } catch (permErr) {
    logger.warn('Docs', `Could not set public permission: ${permErr.message}`);
  }

  const docUrl = `https://docs.google.com/document/d/${docId}/edit`;
  logger.info('Docs', `Doc created successfully: ${docUrl}`);
  return { docId, docUrl };
}

/**
 * Get the text content of an existing Google Doc.
 */
async function getDoc(docId) {
  const auth = getAuth();
  const docs = google.docs({ version: 'v1', auth });
  const res  = await docs.documents.get({ documentId: docId });
  let text   = '';
  const content = res.data.body?.content || [];
  for (const block of content) {
    if (block.paragraph) {
      for (const el of (block.paragraph.elements || [])) {
        text += el.textRun?.content || '';
      }
    }
  }
  return text;
}

/**
 * Fill a Google Doc template by:
 *   1. Copying the template to a new file
 *   2. Stripping the "HOW TO USE" instructions page (everything above the logo marker)
 *   3. Replacing every [BRACKETED] placeholder with real data from the replacements map
 *
 * @param {string} templateId - Google Docs ID of the template file
 * @param {object} replacements - { 'CLIENT NAME': 'Sarah Chen', 'DATE': '4/16/2026', ... }
 *                               Keys are the placeholder name WITHOUT brackets.
 *                               Special key 'instructionsMarker' controls where to strip above.
 * @param {string} outputTitle - name for the new doc (e.g. "Sarah Chen - Proposal")
 * @returns {{docId, docUrl}}
 */
async function fillTemplate(templateId, replacements, outputTitle) {
  if (!templateId) throw new Error('Template ID required');
  const auth = getAuth();
  const docs = google.docs({ version: 'v1', auth });
  const drive = google.drive({ version: 'v3', auth });

  // 1. Copy the template
  const copied = await drive.files.copy({
    fileId: templateId,
    requestBody: { name: outputTitle || 'Untitled Document' },
  });
  const docId = copied.data.id;
  logger.info('Docs', `Template copied → ${docId} (${outputTitle})`);

  // 2. Build the replacement requests. Wrap every key in [] for the actual replace.
  const requests = [];
  for (const [key, value] of Object.entries(replacements || {})) {
    if (key === 'instructionsMarker') continue;
    const safe = value == null ? '' : String(value);
    requests.push({
      replaceAllText: {
        containsText: { text: `[${key}]`, matchCase: false },
        replaceText: safe,
      },
    });
    // Also replace {{KEY}} style placeholders (in case of kickoff template)
    requests.push({
      replaceAllText: {
        containsText: { text: `{{${key}}}`, matchCase: false },
        replaceText: safe,
      },
    });
  }

  // 3. Apply replacements in batches of 50
  for (let i = 0; i < requests.length; i += 50) {
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests: requests.slice(i, i + 50) },
    });
  }

  // 4. Strip the "HOW TO USE" instructions section.
  // We do this by deleting content from the start of the doc up to the first
  // occurrence of a known marker (the [YOUR COMPANY NAME] slot or the logo line).
  // The marker in every SPEC Sheets template is the real content starts
  // after the logo table, but since [YOUR COMPANY NAME] has been replaced
  // with the actual company name, we use that as the boundary marker.
  try {
    const companyMarker = replacements['YOUR COMPANY NAME'] || replacements['COMPANY_NAME'];
    if (companyMarker) {
      const doc = await docs.documents.get({ documentId: docId });
      const content = doc.data.body?.content || [];
      // Find the first paragraph that contains the company marker
      let boundaryIndex = null;
      for (const block of content) {
        if (!block.paragraph) continue;
        const text = (block.paragraph.elements || [])
          .map(el => el.textRun?.content || '').join('');
        if (text.includes(companyMarker)) {
          boundaryIndex = block.startIndex;
          break;
        }
      }
      if (boundaryIndex && boundaryIndex > 1) {
        await docs.documents.batchUpdate({
          documentId: docId,
          requestBody: {
            requests: [{
              deleteContentRange: {
                range: { startIndex: 1, endIndex: boundaryIndex },
              },
            }],
          },
        });
        logger.info('Docs', `Stripped instructions page (${boundaryIndex - 1} chars)`);
      }
    }
  } catch (stripErr) {
    logger.warn('Docs', `Could not strip instructions page (non-fatal): ${stripErr.message}`);
  }

  // 5. Share with anyone who has the link (same as createDoc)
  try {
    await drive.permissions.create({
      fileId: docId,
      requestBody: { role: 'reader', type: 'anyone' },
    });
  } catch (permErr) {
    logger.warn('Docs', `Could not set public permission: ${permErr.message}`);
  }

  const docUrl = `https://docs.google.com/document/d/${docId}/edit`;
  logger.success('Docs', `Template filled → ${docUrl}`);
  return { docId, docUrl };
}

/**
 * Build the standard placeholder map for a job.
 * Used by proposal, estimate, contract, kickoff generators.
 */
function buildJobPlaceholders({ job, settings, extra }) {
  const today = new Date();
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

  const startDate = job.startDate || job.start_date || '';
  const endDate   = job.endDate   || job.end_date   || '';
  const durationWeeks = (startDate && endDate)
    ? Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24 * 7)))
    : 4;

  const jobValue = parseFloat(String(job.jobValue || job.job_value || 0).replace(/[^0-9.]/g, '')) || 0;
  const tiers = {};
  try { if (job.tierBudget)   tiers.good   = JSON.parse(typeof job.tierBudget === 'string' ? job.tierBudget : JSON.stringify(job.tierBudget)); } catch (_) {}
  try { if (job.tierMidrange) tiers.better = JSON.parse(typeof job.tierMidrange === 'string' ? job.tierMidrange : JSON.stringify(job.tierMidrange)); } catch (_) {}
  try { if (job.tierHighend)  tiers.best   = JSON.parse(typeof job.tierHighend === 'string' ? job.tierHighend : JSON.stringify(job.tierHighend)); } catch (_) {}

  const fmtMoney = (n) => n ? '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '$0';

  return {
    // Company info (from settings)
    'YOUR COMPANY NAME':        settings.companyName || '',
    'COMPANY_NAME':             settings.companyName || '',
    'PHONE':                    settings.phone || '',
    'PHONE NUMBER':             settings.phone || '',
    'EMAIL':                    settings.email || '',
    'EMAIL ADDRESS':            settings.email || '',
    'WEBSITE':                  settings.website || settings.websiteUrl || '',
    'CITY/SERVICE AREA, STATE': settings.address || '',
    'YOUR ADDRESS':             settings.address || '',
    'YOUR NAME':                settings.ownerName || '',
    'LICENSE':                  settings.license || 'N/A',
    'LICENSE #':                settings.license || 'N/A',
    'STATE':                    (settings.address || '').split(',').pop()?.trim()?.split(' ')?.[0] || '',

    // Client info
    'CLIENT NAME':              job.clientName || job.client_name || '',
    'CLIENT EMAIL':             job.clientEmail || job.client_email || '',
    'CLIENT PHONE':             job.clientPhone || job.client_phone || '',
    'CLIENT ADDRESS':           job.clientAddress || job.client_address || job.projectAddress || job.project_address || '',
    'PROJECT ADDRESS':          job.projectAddress || job.project_address || job.clientAddress || job.client_address || '',

    // Project info
    'PROJECT TITLE':            job.service || job.project_type || job.projectName || 'Project',
    'PROJECT DESCRIPTION':      job.description || job.scope || job.service || '',
    'BRIEF PROJECT DESCRIPTION':job.description || job.service || '',
    'DATE':                     fmtDate(today),
    'DATE + 30 DAYS':           fmtDate(addDays(today, 30)),
    'START DATE':               fmtDate(startDate) || 'TBD',
    'END DATE':                 fmtDate(endDate) || 'TBD',
    'X-X weeks':                durationWeeks + '-' + (durationWeeks + 1) + ' weeks',
    'X':                        String(durationWeeks),

    // IDs & pricing
    'EST-0001':                 'EST-' + (job.jobRef || job.job_ref || job.id || '0001'),
    'CONTRACT-NUMBER':          'C-' + (job.jobRef || job.job_ref || job.id || '0001'),
    'PROPOSAL_NUMBER':          'P-' + (job.jobRef || job.job_ref || job.id || '0001'),
    'TOTAL AMOUNT':             fmtMoney(jobValue),
    'Good / Better / Best':     (job.selectedTier || 'Better').replace(/^\w/, c => c.toUpperCase()),
    'MILESTONE':                'job is at 50% completion',

    // Tier pricing (for proposal)
    'AMOUNT':                   fmtMoney(jobValue), // fallback
    'GOOD_TIER_AMOUNT':         tiers.good   ? fmtMoney(tiers.good.total)   : fmtMoney(jobValue * 0.75),
    'BETTER_TIER_AMOUNT':       tiers.better ? fmtMoney(tiers.better.total) : fmtMoney(jobValue),
    'BEST_TIER_AMOUNT':         tiers.best   ? fmtMoney(tiers.best.total)   : fmtMoney(jobValue * 1.4),

    // Allow caller to override anything
    ...(extra || {}),
  };
}

// ─── AGENT TOOL WRAPPERS ─────────────────────────────────────────────────────

async function toolCreateDoc({ title, body }) {
  const result = await createDoc({ title, body });
  return `Document created: ${result.docUrl}`;
}

module.exports = { createDoc, getDoc, toolCreateDoc, fillTemplate, buildJobPlaceholders };
