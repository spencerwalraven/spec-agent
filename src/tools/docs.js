/**
 * Google Docs + Drive tool library
 * Creates documents from markdown-style text, returns shareable links.
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

  // Insert the content
  if (body) {
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [{
          insertText: {
            location: { index: 1 },
            text: body,
          },
        }],
      },
    });
  }

  // Make it readable by anyone with the link
  await drive.permissions.create({
    fileId: docId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  const docUrl = `https://docs.google.com/document/d/${docId}/edit`;
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
