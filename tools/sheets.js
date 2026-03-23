const { google } = require('googleapis');

function getSheets() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.sheets({ version: 'v4', auth });
}

const SHEET_ID = process.env.SHEET_ID;

// Read a lead row by row number
async function readLead(rowNumber) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `Form Responses 1!A${rowNumber}:AD${rowNumber}`,
  });
  const row = res.data.values?.[0];
  if (!row) return null;

  return {
    rowNumber,
    timestamp:     row[0]  || '',
    firstName:     row[1]  || '',
    lastName:      row[2]  || '',
    email:         row[3]  || '',
    phone:         row[4]  || '',
    address:       row[5]  || '',
    projectType:   row[6]  || '',
    description:   row[7]  || '',
    budget:        row[8]  || '',
    timeline:      row[9]  || '',
    heardAboutUs:  row[10] || '',
    leadScore:     row[14] || '',
    leadStatus:    row[15] || '',
    agentNotes:    row[16] || '',
    emailThread:   row[17] || '',
    lastContact:   row[18] || '',
  };
}

// Find a lead by email address
async function findLeadByEmail(email) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Form Responses 1!A:D',
  });
  const rows = res.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][3]?.toLowerCase() === email.toLowerCase()) {
      return await readLead(i + 1);
    }
  }
  return null;
}

// Update a specific field for a lead
async function updateLead(rowNumber, field, value) {
  const sheets = getSheets();
  const fieldToColumn = {
    leadScore:   'O',
    leadStatus:  'P',
    agentNotes:  'Q',
    emailThread: 'R',
    lastContact: 'S',
    appointmentDate: 'T',
    converted:   'U',
  };
  const col = fieldToColumn[field];
  if (!col) throw new Error(`Unknown field: ${field}`);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Form Responses 1!${col}${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[value]] },
  });

  console.log(`Updated row ${rowNumber} field ${field} = ${value}`);
  return `Updated ${field} to "${value}"`;
}

// Get the next empty row (for new leads added manually)
async function getLastLeadRow() {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Form Responses 1!A:A',
  });
  return (res.data.values || []).length;
}

module.exports = { readLead, findLeadByEmail, updateLead, getLastLeadRow };
