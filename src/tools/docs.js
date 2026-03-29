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

// ─── AGENT TOOL WRAPPERS ─────────────────────────────────────────────────────

async function toolCreateDoc({ title, body }) {
  const result = await createDoc({ title, body });
  return `Document created: ${result.docUrl}`;
}

module.exports = { createDoc, getDoc, toolCreateDoc };
