/**
 * Google Docs + Drive tool library
 * Creates documents from markdown-style text, returns shareable links.
 */

require('dotenv').config();
const { google } = require('googleapis');
const { logger } = require('../utils/logger');

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

/**
 * Create a Google Doc with a title and plain text body.
 * Returns { docId, docUrl }
 */
async function createDoc({ title, body }) {
  const auth  = getAuth();
  const docs  = google.docs({ version: 'v1', auth });
  const drive = google.drive({ version: 'v3', auth });

  // Create the document
  const created = await docs.documents.create({ requestBody: { title } });
  const docId   = created.data.documentId;
  logger.info('Docs', `documents.create returned docId: ${docId}`);

  if (!docId) {
    logger.error('Docs', `documents.create response: ${JSON.stringify(created.data).slice(0, 300)}`);
    throw new Error('Google Docs API returned no documentId');
  }

  // Insert the content (chunk if needed to stay under API limits)
  if (body) {
    const MAX_CHUNK = 40000;
    const text = body.slice(0, MAX_CHUNK); // truncate to safe size
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [{
          insertText: {
            location: { index: 1 },
            text,
          },
        }],
      },
    });

    // Apply professional formatting based on paragraph content patterns (best-effort)
    try {
      const doc = await docs.documents.get({ documentId: docId });
      const content = doc.data.body?.content || [];
      const formatRequests = [];

      for (const block of content) {
        if (!block.paragraph) continue;

        const paraText = (block.paragraph.elements || [])
          .map(el => el.textRun?.content || '')
          .join('');
        const trimmed = paraText.trimEnd();

        if (!trimmed) continue;

        // HEADING_1: main document title lines (ESTIMATE, PROPOSAL, CONTRACT, etc.)
        if (/^(ESTIMATE|PROPOSAL|CONTRACT|KICKOFF|PROJECT PLAN)\s*[—\-]/i.test(trimmed)) {
          formatRequests.push({
            updateParagraphStyle: {
              range: { startIndex: block.startIndex, endIndex: block.endIndex },
              paragraphStyle: { namedStyleType: 'HEADING_1' },
              fields: 'namedStyleType',
            },
          });
        }
        // HEADING_2: all-caps section headers (no colon, length >= 4)
        else if (/^[A-Z][A-Z\s&\/]+$/.test(trimmed) && trimmed.length >= 4) {
          formatRequests.push({
            updateParagraphStyle: {
              range: { startIndex: block.startIndex, endIndex: block.endIndex },
              paragraphStyle: { namedStyleType: 'HEADING_2' },
              fields: 'namedStyleType',
            },
          });
        }
        // Bold: total/subtotal lines
        else if (/^(TOTAL|GRAND TOTAL|SUBTOTAL|TOTAL ESTIMATE)[:\s]/i.test(trimmed)) {
          formatRequests.push({
            updateTextStyle: {
              range: { startIndex: block.startIndex, endIndex: block.endIndex - 1 },
              textStyle: { bold: true },
              fields: 'bold',
            },
          });
        }
        // Italic: metadata lines
        else if (/^(Prepared by|Date|Client|Company|Address):/.test(trimmed)) {
          formatRequests.push({
            updateTextStyle: {
              range: { startIndex: block.startIndex, endIndex: block.endIndex - 1 },
              textStyle: { italic: true },
              fields: 'italic',
            },
          });
        }
      }

      if (formatRequests.length > 0) {
        logger.info('Docs', `Applying ${formatRequests.length} formatting requests`);
        await docs.documents.batchUpdate({
          documentId: docId,
          requestBody: { requests: formatRequests },
        });
      }
    } catch (fmtErr) {
      logger.warn('Docs', `Formatting step failed (non-fatal): ${fmtErr.message}`);
    }
  }

  // Make it readable by anyone with the link (best-effort — don't fail if this errors)
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
