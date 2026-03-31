'use strict';
/**
 * SGC Operations Dashboard routes
 * Mounted by index.js via: app.use(require('./src/routes/sgc-ops')({ requireAuth, requireOwner, logger, appDir }))
 */

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { google } = require('googleapis');

// ─── GOOGLE SHEETS HELPER ─────────────────────────────────────────────────────
function getSgcSheets() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.sheets({ version: 'v4', auth });
}

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────
async function deleteSheetRow(tabName, rowNumber) {
  const SGC_SHEET_ID = process.env.SGC_SHEET_ID;
  const sheets = getSgcSheets();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SGC_SHEET_ID });
  const sheet = spreadsheet.data.sheets.find(s => s.properties.title === tabName);
  if (!sheet) throw new Error(`Tab "${tabName}" not found`);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SGC_SHEET_ID,
    requestBody: {
      requests: [{ deleteDimension: { range: {
        sheetId:    sheet.properties.sheetId,
        dimension:  'ROWS',
        startIndex: rowNumber - 1,
        endIndex:   rowNumber,
      }}}],
    },
  });
}

async function readWorkers(agent) {
  try {
    const rows = await agent.sgcReadTab('SGC Workers');
    return rows.map(r => ({ _row: r._row, name: r['Name'] || '', email: r['Email'] || '', phone: r['Phone'] || '' })).filter(w => w.name);
  } catch (_) {
    try { return JSON.parse(process.env.SGC_WORKERS || '[]').map((w, i) => ({ _row: i + 2, ...w })); } catch (_) { return []; }
  }
}

async function ensureWorkersTab(sheets, SGC_SHEET_ID) {
  try {
    const check = await sheets.spreadsheets.values.get({ spreadsheetId: SGC_SHEET_ID, range: 'SGC Workers!A1:C1' });
    if (!check.data.values?.length) throw new Error('no headers');
  } catch (_) {
    try {
      await sheets.spreadsheets.batchUpdate({ spreadsheetId: SGC_SHEET_ID, requestBody: { requests: [{ addSheet: { properties: { title: 'SGC Workers' } } }] } });
    } catch (_) {}
    await sheets.spreadsheets.values.update({ spreadsheetId: SGC_SHEET_ID, range: 'SGC Workers!A1', valueInputOption: 'RAW', requestBody: { values: [['Name', 'Email', 'Phone']] } });
  }
}

function sgcQbBaseUrl(req) {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  if (process.env.APP_URL) return process.env.APP_URL;
  return `${req.protocol}://${req.get('host')}`;
}

// In-memory state
let _lastTallyDebug = null;
const TALLY_ID_MAP  = {};

// ─── ROUTER FACTORY ───────────────────────────────────────────────────────────
module.exports = function createSgcRouter({ requireAuth, requireOwner, logger, appDir }) {
  const router = express.Router();
  const pub    = p => path.join(appDir, 'public', p);

  // ── Pages ─────────────────────────────────────────────────────────────────
  router.get('/sgc',     (req, res) => res.sendFile(pub('sgc.html')));
  router.get('/sgc-ops', (req, res) => res.sendFile(pub('sgc-ops.html')));

  // ── Monday Meeting Prep ───────────────────────────────────────────────────
  router.get('/api/sgc/ops/meeting', async (req, res) => {
    try {
      const agent = require('../agents/sgc-admin-agent');
      const sgcQB = require('../tools/sgc-quickbooks');
      const [subs, insuranceTasks] = await Promise.all([
        agent.sgcReadTab('2025 SubCons'),
        agent.sgcReadTab('Insurance Tasks'),
      ]);

      const total     = subs.length;
      const missingW9 = subs.filter(s => !['yes','Yes','YES'].includes((s['W9 Received '] || s['W9 Received'] || '').trim())).length;
      const missingBT = subs.filter(s => !['yes','Yes','YES'].includes((s['BT Onboarding'] || s['Buildertrend'] || '').trim())).length;
      const needs1099 = subs.filter(s => ['yes','Yes','YES'].includes((s['1099 needed'] || s['1099 Needed'] || '').trim())).length;
      const sent1099  = subs.filter(s => ['yes','Yes','YES'].includes((s['1099 Sent'] || '').trim())).length;
      const compliant = subs.filter(s => {
        const w9 = (s['W9 Received '] || s['W9 Received'] || '').trim().toLowerCase();
        const bt = (s['BT Onboarding'] || s['Buildertrend'] || '').trim().toLowerCase();
        return w9 === 'yes' && bt === 'yes';
      }).length;
      const compliance = { total, missingW9, missingBT, needs1099, sent1099, compliant };

      const now = new Date(); now.setHours(0,0,0,0);
      const expirations = { past: [], d30: [], d60: [], d90: [], beyond: [] };
      for (const task of insuranceTasks) {
        const dueRaw = task['Due Date'] || task['Expiration'] || task['Date'] || '';
        if (!dueRaw) continue;
        const due = new Date(dueRaw); if (isNaN(due)) continue;
        due.setHours(0,0,0,0);
        const days = Math.ceil((due - now) / 86400000);
        const item = { task: task['Task'] || task['Item'] || 'Unnamed', due: dueRaw, days, status: task['Status'] || '' };
        if (days < 0)        expirations.past.push(item);
        else if (days <= 30) expirations.d30.push(item);
        else if (days <= 60) expirations.d60.push(item);
        else if (days <= 90) expirations.d90.push(item);
        else                 expirations.beyond.push(item);
      }

      let invoices = null, expenses = null, materials = null, qbError = null;
      if (sgcQB.isConnected()) {
        try {
          const rawInvoices = await sgcQB.listOpenInvoices();
          const today = new Date(); today.setHours(0,0,0,0);
          invoices = rawInvoices.map(inv => {
            const due = inv.dueDate ? new Date(inv.dueDate) : null;
            const daysOverdue = due ? Math.ceil((today - due) / 86400000) : 0;
            let bucket = 'Current';
            if (daysOverdue > 90) bucket = '90+';
            else if (daysOverdue > 60) bucket = '61–90';
            else if (daysOverdue > 30) bucket = '31–60';
            else if (daysOverdue > 0)  bucket = '1–30';
            return { ...inv, daysOverdue, bucket };
          });

          const expStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
          const expEnd   = new Date().toISOString().split('T')[0];
          const expRes   = await sgcQB.qbRequest('GET', `/query?query=select * from Purchase where TxnDate >= '${expStart}' and TxnDate <= '${expEnd}' MAXRESULTS 50`);
          const purchases = expRes.QueryResponse?.Purchase || [];
          expenses = purchases.map(p => ({
            id:       p.Id,
            date:     p.TxnDate,
            vendor:   p.EntityRef?.name || 'Unknown Vendor',
            amount:   p.TotalAmt,
            account:  p.AccountRef?.name || '',
            memo:     p.PrivateNote || p.Memo || '',
            needsInfo: !p.PrivateNote && !p.Memo,
          }));

          const matRes = await sgcQB.qbRequest('GET', `/query?query=select * from Purchase where TxnDate >= '${expStart}' and TxnDate <= '${expEnd}' MAXRESULTS 50`);
          const matPurchases = matRes.QueryResponse?.Purchase || [];
          materials = matPurchases.filter(p => {
            const acct = (p.AccountRef?.name || '').toLowerCase();
            return acct.includes('material') || acct.includes('supply') || acct.includes('supplies') || acct.includes('lumber') || acct.includes('hardware');
          }).map(p => ({
            date:   p.TxnDate,
            vendor: p.EntityRef?.name || 'Unknown',
            amount: p.TotalAmt,
            memo:   p.PrivateNote || p.Memo || '',
          }));
        } catch (qbErr) {
          qbError = qbErr.message;
        }
      }

      res.json({ compliance, expirations, invoices, expenses, materials, qbError });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Subcontractors ────────────────────────────────────────────────────────
  router.get('/api/sgc/ops/subs', async (req, res) => {
    try {
      const agent = require('../agents/sgc-admin-agent');
      const subs  = await agent.sgcReadTab('2025 SubCons');
      const mapped = subs.map(s => ({
        _row:        s._row,
        name:        s['Name'] || s['Company Name'] || s['SUB'] || '',
        company:     s['Company'] || s['Company Name'] || '',
        trade:       s['Trade'] || s['Specialty'] || s['TRADE'] || '',
        email:       s['Email'] || s['EMAIL'] || '',
        w9:          s['W9 Received '] || s['W9 Received'] || s['W-9'] || '',
        btOnboarded: s['BT Onboarding'] || s['Buildertrend'] || '',
        needs1099:   s['1099 needed'] || s['1099 Needed'] || '',
        sent1099:    s['1099 Sent'] || '',
        totalPaid:   s['2025 Total'] || s['Total Paid'] || s['2025 Total Paid'] || '',
        notes:       s['NOTES'] || s['Notes'] || '',
        docLinks:    s['Doc Links'] || s['Documents'] || '',
      })).filter(s => s.name);
      res.json({ subs: mapped });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.patch('/api/sgc/ops/subs', async (req, res) => {
    try {
      const { row, field, value } = req.body;
      if (!row || !field) return res.status(400).json({ error: 'row and field required' });
      const agent = require('../agents/sgc-admin-agent');
      await agent.sgcUpdateCell('2025 SubCons', row, field, value);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/api/sgc/ops/subs', async (req, res) => {
    try {
      const { name, trade, w9, btOnboarded, needs1099, sent1099, notes } = req.body;
      if (!name) return res.status(400).json({ error: 'name required' });
      const SGC_SHEET_ID = process.env.SGC_SHEET_ID;
      const sheets = getSgcSheets();
      const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId: SGC_SHEET_ID, range: '2025 SubCons!1:1' });
      const headers = headerRes.data.values?.[0] || [];
      const fieldMap = {
        'Name': name, 'Company Name': name, 'SUB': name,
        'Trade': trade||'', 'Specialty': trade||'', 'TRADE': trade||'',
        'W9 Received': w9||'No', 'W9 Received ': w9||'No', 'W-9': w9||'No',
        'BT Onboarding': btOnboarded||'No', 'Buildertrend': btOnboarded||'No',
        '1099 needed': needs1099||'No', '1099 Needed': needs1099||'No',
        '1099 Sent': sent1099||'No',
        'NOTES': notes||'', 'Notes': notes||'',
      };
      const rowValues = headers.map(h => fieldMap[h] !== undefined ? fieldMap[h] : '');
      await sheets.spreadsheets.values.append({ spreadsheetId: SGC_SHEET_ID, range: '2025 SubCons!A1', valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: [rowValues] } });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/api/sgc/ops/subs', async (req, res) => {
    try {
      const row = parseInt(req.body?.row || req.query?.row);
      if (!row) return res.status(400).json({ error: 'row required' });
      await deleteSheetRow('2025 SubCons', row);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Sub document upload ───────────────────────────────────────────────────
  router.post('/api/sgc/ops/subs/:row/docs', async (req, res) => {
    try {
      const row      = parseInt(req.params.row);
      const { fileName, fileData, mimeType, label } = req.body;
      if (!fileName || !fileData) return res.status(400).json({ error: 'fileName and fileData required' });

      // Upload to Google Drive
      const { google: gapi } = require('googleapis');
      const auth = new gapi.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
      auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
      const drive = gapi.drive({ version: 'v3', auth });

      const { Readable } = require('stream');
      const buffer = Buffer.from(fileData, 'base64');
      const stream = Readable.from(buffer);

      const driveRes = await drive.files.create({
        requestBody: { name: fileName, mimeType: mimeType || 'application/octet-stream' },
        media:       { mimeType: mimeType || 'application/octet-stream', body: stream },
        fields:      'id,webViewLink',
      });
      const fileId  = driveRes.data.id;
      const fileUrl = driveRes.data.webViewLink;

      // Make file viewable by anyone with the link
      await drive.permissions.create({ fileId, requestBody: { role: 'reader', type: 'anyone' } });

      // Append link to the "Doc Links" column in the sheet
      const agent = require('../agents/sgc-admin-agent');
      const subs  = await agent.sgcReadTab('2025 SubCons');
      const sub   = subs.find(s => s._row === row);
      if (sub) {
        const existing = sub['Doc Links'] || sub['Documents'] || '';
        const entry    = `${label || fileName}: ${fileUrl}`;
        const updated  = existing ? `${existing}\n${entry}` : entry;
        // Try both possible column names
        try { await agent.sgcUpdateCell('2025 SubCons', row, 'Doc Links', updated); }
        catch (_) { await agent.sgcUpdateCell('2025 SubCons', row, 'Documents', updated); }
      }

      res.json({ ok: true, fileId, fileUrl });
    } catch (e) {
      logger.error('SGC-Docs', `Upload failed: ${e.message}`);
      res.status(500).json({ error: e.message });
    }
  });

  // ── Insurance Tasks ───────────────────────────────────────────────────────
  router.get('/api/sgc/ops/insurance', async (req, res) => {
    try {
      const agent = require('../agents/sgc-admin-agent');
      const tasks = await agent.sgcReadTab('Insurance Tasks');
      res.json({ tasks });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.patch('/api/sgc/ops/insurance', async (req, res) => {
    try {
      const { row, field, value } = req.body;
      if (!row || !field) return res.status(400).json({ error: 'row and field required' });
      const agent = require('../agents/sgc-admin-agent');
      await agent.sgcUpdateCell('Insurance Tasks', row, field, value);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/api/sgc/ops/insurance', async (req, res) => {
    try {
      const { task, type, owner, due, status, notes } = req.body;
      if (!task) return res.status(400).json({ error: 'task name required' });
      const SGC_SHEET_ID = process.env.SGC_SHEET_ID;
      const sheets = getSgcSheets();
      const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId: SGC_SHEET_ID, range: 'Insurance Tasks!1:1' });
      const headers = headerRes.data.values?.[0] || [];
      const fieldMap = {
        'Task': task, 'Item': task, 'Description': task,
        'Type': type || '',
        'Owner': owner || '', 'Assigned To': owner || '',
        'Due Date': due || '', 'Due': due || '',
        'Status': status || 'Not Started',
        'Notes': notes || '', 'NOTES': notes || '',
      };
      const rowValues = headers.map(h => fieldMap[h] !== undefined ? fieldMap[h] : '');
      await sheets.spreadsheets.values.append({ spreadsheetId: SGC_SHEET_ID, range: 'Insurance Tasks!A1', valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: [rowValues] } });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/api/sgc/ops/insurance', async (req, res) => {
    try {
      const row = parseInt(req.body?.row || req.query?.row);
      if (!row) return res.status(400).json({ error: 'row required' });
      await deleteSheetRow('Insurance Tasks', row);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Jobs ──────────────────────────────────────────────────────────────────
  router.get('/api/sgc/ops/jobs', async (req, res) => {
    try {
      const agent = require('../agents/sgc-admin-agent');
      const jobs  = await agent.sgcReadTab('SGC');
      const mapJob = j => ({
        _row:     j._row,
        job:      j['#'],
        customer: j['Customer'],
        address:  j['Address'] || j['Job Address'] || '',
        status:   (j['Job Status '] || j['Job Status'] || '').trim(),
        thru:     j['Thru'] || j['Target End'] || '',
        notes:    j['Notes'] || j['NOTES'] || '',
        budget:   j['Budget'] || '',
        spent:    j['Spent'] || j['Actual Cost'] || '',
      });
      const active    = jobs.filter(j => { const s = (j['Job Status '] || j['Job Status'] || '').trim().toLowerCase(); return s !== 'complete' && s !== 'completed' && s !== 'closed' && s !== ''; });
      const completed = jobs.filter(j => { const s = (j['Job Status '] || j['Job Status'] || '').trim().toLowerCase(); return s === 'complete' || s === 'completed' || s === 'closed'; });
      res.json({ jobs: active.map(mapJob), completed: completed.map(mapJob) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.patch('/api/sgc/ops/jobs', async (req, res) => {
    try {
      const { row, field, value } = req.body;
      if (!row || !field) return res.status(400).json({ error: 'row and field required' });
      const agent = require('../agents/sgc-admin-agent');
      const colName = field === 'Job Status' ? 'Job Status ' : field;
      await agent.sgcUpdateCell('SGC', row, colName, value);
      res.json({ ok: true });
    } catch (e) {
      try {
        const agent = require('../agents/sgc-admin-agent');
        await agent.sgcUpdateCell('SGC', req.body.row, req.body.field, req.body.value);
        res.json({ ok: true });
      } catch (e2) {
        res.status(500).json({ error: e2.message });
      }
    }
  });

  // ── Job Budget ────────────────────────────────────────────────────────────
  router.get('/api/sgc/ops/jobs/:row/budget', async (req, res) => {
    try {
      const row   = parseInt(req.params.row);
      const agent = require('../agents/sgc-admin-agent');
      const SGC_SHEET_ID = process.env.SGC_SHEET_ID;
      const sheets = getSgcSheets();

      // Read or create Budget tab
      let budgetRows = [];
      try {
        const r = await sheets.spreadsheets.values.get({ spreadsheetId: SGC_SHEET_ID, range: 'Job Budgets!A:F' });
        budgetRows = (r.data.values || []).slice(1).filter(r => r[0]);
      } catch (_) {}

      const items = budgetRows
        .filter(r => parseInt(r[0]) === row)
        .map((r, i) => ({ id: i, jobRow: parseInt(r[0]), phase: r[1]||'', description: r[2]||'', budgeted: parseFloat(r[3])||0, actual: parseFloat(r[4])||0, notes: r[5]||'' }));

      const totalBudgeted = items.reduce((s, i) => s + i.budgeted, 0);
      const totalActual   = items.reduce((s, i) => s + i.actual, 0);
      res.json({ items, totalBudgeted, totalActual, variance: totalBudgeted - totalActual });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/api/sgc/ops/jobs/:row/budget', async (req, res) => {
    try {
      const jobRow = parseInt(req.params.row);
      const { phase, description, budgeted, actual, notes } = req.body;
      if (!phase) return res.status(400).json({ error: 'phase required' });
      const SGC_SHEET_ID = process.env.SGC_SHEET_ID;
      const sheets = getSgcSheets();

      // Ensure Budget tab exists with headers
      try {
        const check = await sheets.spreadsheets.values.get({ spreadsheetId: SGC_SHEET_ID, range: 'Job Budgets!A1:F1' });
        if (!check.data.values?.length) throw new Error('no headers');
      } catch (_) {
        try {
          await sheets.spreadsheets.batchUpdate({ spreadsheetId: SGC_SHEET_ID, requestBody: { requests: [{ addSheet: { properties: { title: 'Job Budgets' } } }] } });
        } catch (_) {}
        await sheets.spreadsheets.values.update({ spreadsheetId: SGC_SHEET_ID, range: 'Job Budgets!A1', valueInputOption: 'RAW', requestBody: { values: [['Job Row', 'Phase', 'Description', 'Budgeted', 'Actual', 'Notes']] } });
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId: SGC_SHEET_ID, range: 'Job Budgets!A1',
        valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [[jobRow, phase, description||'', budgeted||0, actual||0, notes||'']] },
      });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.patch('/api/sgc/ops/jobs/:row/budget/:lineIndex', async (req, res) => {
    try {
      const jobRow    = parseInt(req.params.row);
      const lineIndex = parseInt(req.params.lineIndex);
      const { phase, description, budgeted, actual, notes } = req.body;
      const SGC_SHEET_ID = process.env.SGC_SHEET_ID;
      const sheets = getSgcSheets();

      // Find the sheet row for this budget line
      const r = await sheets.spreadsheets.values.get({ spreadsheetId: SGC_SHEET_ID, range: 'Job Budgets!A:F' });
      const allRows = (r.data.values || []).slice(1);
      let matchCount = -1;
      let sheetRowIdx = -1;
      for (let i = 0; i < allRows.length; i++) {
        if (parseInt(allRows[i][0]) === jobRow) {
          matchCount++;
          if (matchCount === lineIndex) { sheetRowIdx = i + 2; break; } // +2 for header + 1-indexed
        }
      }
      if (sheetRowIdx === -1) return res.status(404).json({ error: 'Budget line not found' });

      await sheets.spreadsheets.values.update({
        spreadsheetId: SGC_SHEET_ID, range: `Job Budgets!A${sheetRowIdx}:F${sheetRowIdx}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[jobRow, phase||allRows[sheetRowIdx-2][1], description||allRows[sheetRowIdx-2][2], budgeted??allRows[sheetRowIdx-2][3], actual??allRows[sheetRowIdx-2][4], notes||allRows[sheetRowIdx-2][5]]] },
      });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/api/sgc/ops/jobs/:row/budget/:lineIndex', async (req, res) => {
    try {
      const jobRow    = parseInt(req.params.row);
      const lineIndex = parseInt(req.params.lineIndex);
      const SGC_SHEET_ID = process.env.SGC_SHEET_ID;
      const sheets = getSgcSheets();

      const r = await sheets.spreadsheets.values.get({ spreadsheetId: SGC_SHEET_ID, range: 'Job Budgets!A:F' });
      const allRows = (r.data.values || []).slice(1);
      let matchCount = -1;
      let sheetRowIdx = -1;
      for (let i = 0; i < allRows.length; i++) {
        if (parseInt(allRows[i][0]) === jobRow) {
          matchCount++;
          if (matchCount === lineIndex) { sheetRowIdx = i + 2; break; }
        }
      }
      if (sheetRowIdx === -1) return res.status(404).json({ error: 'Budget line not found' });
      await deleteSheetRow('Job Budgets', sheetRowIdx);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Workers ───────────────────────────────────────────────────────────────
  router.get('/api/sgc/ops/workers', async (req, res) => {
    try {
      const agent = require('../agents/sgc-admin-agent');
      const workers = await readWorkers(agent);
      res.json({ workers });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/api/sgc/ops/workers', async (req, res) => {
    try {
      const { name, email, phone } = req.body;
      if (!name) return res.status(400).json({ error: 'name required' });
      const SGC_SHEET_ID = process.env.SGC_SHEET_ID;
      const sheets = getSgcSheets();
      await ensureWorkersTab(sheets, SGC_SHEET_ID);
      await sheets.spreadsheets.values.append({ spreadsheetId: SGC_SHEET_ID, range: 'SGC Workers!A1', valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: [[name, email||'', phone||'']] } });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.delete('/api/sgc/ops/workers', async (req, res) => {
    try {
      const row = parseInt(req.body?.row);
      if (!row) return res.status(400).json({ error: 'row required' });
      await deleteSheetRow('SGC Workers', row);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Field Reports ─────────────────────────────────────────────────────────
  router.get('/api/sgc/ops/field-reports', async (req, res) => {
    try {
      const agent = require('../agents/sgc-admin-agent');
      const [rows, workers] = await Promise.all([agent.sgcReadTab('Field Reports'), readWorkers(agent)]);
      res.json({ reports: rows, workers });
    } catch (e) {
      res.json({ reports: [], workers: [] });
    }
  });

  router.get('/api/sgc/ops/field-reports/remind', async (req, res) => {
    try {
      const agent = require('../agents/sgc-admin-agent');
      const rows  = await agent.sgcReadTab('Field Reports');
      const todayStr = new Date().toLocaleDateString('en-US');
      const todayReports = rows.filter(r => {
        const sub = r['Submitted At'] || r['Date'] || '';
        return sub && new Date(sub).toLocaleDateString('en-US') === todayStr;
      });
      const submittedNames = todayReports.map(r => (r['Name'] || '').trim().toLowerCase()).filter(Boolean);
      const workers  = await readWorkers(agent);
      const missing  = workers.filter(w => !submittedNames.some(n => n.includes(w.name.toLowerCase())));
      const incomplete = todayReports.filter(r => !(r['Name'] && r['Work Completed Today']));

      const { notifyOwner } = require('../tools/notify');
      const { sendEmail }   = require('../tools/gmail');
      const tallyFormUrl = process.env.SGC_TALLY_FORM_URL || process.env.SGC_TALLY_URL || 'https://tally.so/r/2EL9Wg';
      const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      let workerEmailsSent = 0;

      for (const w of missing) {
        if (!w.email) continue;
        try {
          await sendEmail({
            to: w.email,
            subject: `⏰ Reminder: Please fill out your field report for ${dayName}`,
            body: `Hi ${w.name.split(' ')[0]},\n\nWe haven't received your field report for today (${dayName}) yet.\n\nIt only takes 2 minutes — please fill it out here:\n${tallyFormUrl}\n\nThank you!\nScottsdale General Contracting`,
          });
          workerEmailsSent++;
        } catch (emailErr) {
          logger.warn('SGC-Remind', `Failed to email ${w.name}: ${emailErr.message}`);
        }
      }

      const submittedList  = todayReports.map(r => `  ✓ ${r['Name']}`).join('\n') || '  (none yet)';
      const missingList    = missing.length ? missing.map(w => `  ✗ ${w.name}`).join('\n') : '  None — all submitted!';
      const incompleteList = incomplete.length ? incomplete.map(r => `  ⚠ ${r['Name']} (missing fields)`).join('\n') : '';

      await notifyOwner({
        subject: `📋 SGC Field Report Summary — ${todayStr}`,
        message: `Daily Field Report Check\n\nSubmitted Today (${todayReports.length}):\n${submittedList}\n\nMissing (${missing.length}):\n${missingList}${incompleteList ? `\n\nIncomplete:\n${incompleteList}` : ''}${workerEmailsSent > 0 ? `\n\nReminder emails sent to ${workerEmailsSent} worker(s).` : ''}\n\nView all reports at your SGC dashboard.`,
        urgent: missing.length > 0,
        eventType: 'fieldReportReminder',
      });

      res.json({ ok: true, submitted: todayReports.length, missing: missing.map(w => w.name), incomplete: incomplete.map(r => r['Name']), workerEmailsSent, message: `Summary sent. ${todayReports.length} submitted, ${missing.length} missing.` });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/api/sgc/ops/field-reports/fix-names', async (req, res) => {
    try {
      const agent = require('../agents/sgc-admin-agent');
      const rows = await agent.sgcReadTab('Field Reports');
      let fixed = 0;
      for (const row of rows) {
        const name = row['Name'] || '';
        if (TALLY_ID_MAP[name]) {
          await agent.sgcUpdateCell('Field Reports', row._row, 'Name', TALLY_ID_MAP[name]);
          fixed++;
        }
      }
      res.json({ ok: true, fixed, map: TALLY_ID_MAP });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.delete('/api/sgc/ops/field-reports', async (req, res) => {
    try {
      const row = parseInt(req.body?.row || req.query?.row);
      if (!row) return res.status(400).json({ error: 'row required' });
      await deleteSheetRow('Field Reports', row);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Tally Debug ───────────────────────────────────────────────────────────
  router.get('/api/sgc/ops/debug/tally', (req, res) => res.json(_lastTallyDebug || { message: 'No submission received yet' }));

  // ── Tally Webhook (public — no auth) ──────────────────────────────────────
  router.post('/api/sgc/field-report', async (req, res) => {
    try {
      const payload = req.body;
      _lastTallyDebug = { receivedAt: new Date().toISOString(), payload };

      const fields = payload?.data?.fields || payload?.data?.responses || payload?.fields || [];

      for (const f of fields) {
        if (f.options?.length) {
          for (const opt of f.options) {
            if (opt.id && opt.text) TALLY_ID_MAP[opt.id] = opt.text;
          }
        }
      }

      logger.info('SGC-FieldReport', `Payload keys: ${Object.keys(payload || {}).join(', ')} | data keys: ${Object.keys(payload?.data || {}).join(', ')}`);
      logger.info('SGC-FieldReport', `Fields (${fields.length}): ${JSON.stringify(fields.map(f => ({ type: f.type, label: f.label, key: f.key, value: f.value })))}`);

      const SKIP_TYPES = ['HIDDEN_FIELDS', 'CALCULATED_FIELDS', 'FORM_TITLE', 'PAYMENT'];

      const extractValue = (f) => {
        if (!f) return '';
        let v = f.value;
        if (Array.isArray(v) && f.options?.length) {
          v = v.map(id => f.options.find(o => o.id === id)?.text || id).filter(Boolean).join(', ');
        } else if (Array.isArray(v)) {
          v = v.filter(x => x != null && x !== '').join(', ');
        } else if (v != null && typeof v === 'object') {
          v = Object.values(v).filter(Boolean).join(', ');
        }
        return String(v ?? '').trim();
      };

      const get = (...terms) => {
        for (const term of terms) {
          const lc = term.toLowerCase();
          const f = fields.find(f => {
            if (SKIP_TYPES.includes(f.type)) return false;
            const text = [(f.label||''), (f.title||''), (f.key||'')].join(' ').toLowerCase();
            return text.includes(lc);
          });
          if (f) { const str = extractValue(f); if (str) return str; }
        }
        return '';
      };

      const questionFields = fields.filter(f => !SKIP_TYPES.includes(f.type));
      const getByPos = (idx) => extractValue(questionFields[idx]);
      const isUUID = s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      const looksLikeName = s => {
        if (!s || s.length < 2 || s.length > 60 || isUUID(s)) return false;
        return /^[a-zA-ZÀ-ÿ\s'\-\.]+$/.test(s.trim());
      };
      const nameByHeuristic = () => {
        for (const f of questionFields) {
          const v = extractValue(f);
          if (looksLikeName(v)) return v;
        }
        return '';
      };

      const name   = get('your name', 'full name', 'name', 'who are you', 'employee', 'worker') || getByPos(0) || nameByHeuristic();
      const date   = get('date', 'work date', 'today', 'when') || getByPos(1);
      const work   = get('completed', 'accomplish', 'what did', 'work done', 'finish', 'describe') || getByPos(2);
      const issues = get('issue', 'delay', 'problem', 'concern', 'obstacle', 'anything wrong') || getByPos(3);
      const admin  = get('admin', 'follow up', 'follow-up', 'needs to know', 'anything admin', 'office') || getByPos(4);

      logger.info('SGC-FieldReport', `Mapped → name="${name}" work="${work}" issues="${issues}" admin="${admin}"`);

      const report = {
        'Submitted At':         new Date().toISOString(),
        'Name':                 name || 'Unknown',
        'Date':                 date,
        'Work Completed Today': work,
        'Issues or Delays':     issues,
        'Admin Follow Up':      admin,
      };

      const SGC_SHEET_ID = process.env.SGC_SHEET_ID;
      if (SGC_SHEET_ID) {
        const sheets = getSgcSheets();
        let sheetHeaders = [];
        try {
          const hr = await sheets.spreadsheets.values.get({ spreadsheetId: SGC_SHEET_ID, range: 'Field Reports!1:1' });
          sheetHeaders = hr.data.values?.[0] || [];
        } catch (_) {}

        if (!sheetHeaders.length) {
          try {
            await sheets.spreadsheets.batchUpdate({ spreadsheetId: SGC_SHEET_ID, requestBody: { requests: [{ addSheet: { properties: { title: 'Field Reports' } } }] } });
          } catch (_) {}
          sheetHeaders = Object.keys(report);
          await sheets.spreadsheets.values.update({ spreadsheetId: SGC_SHEET_ID, range: 'Field Reports!A1', valueInputOption: 'RAW', requestBody: { values: [sheetHeaders] } });
        }

        const row = sheetHeaders.map(h => report[h] ?? '');
        await sheets.spreadsheets.values.append({ spreadsheetId: SGC_SHEET_ID, range: 'Field Reports!A1', valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: [row] } });
      }

      logger.info('SGC-FieldReport', `Report received from "${report['Name']}" — Work: "${report['Work Completed Today']?.slice(0,60)}"`);
      res.json({ ok: true });
    } catch (e) {
      logger.error('SGC-FieldReport', `Webhook error: ${e.message}`);
      res.status(500).json({ error: e.message });
    }
  });

  // ── QuickBooks OAuth ──────────────────────────────────────────────────────
  router.get('/api/sgc/quickbooks/connect', (req, res) => {
    try {
      const sgcQb = require('../tools/sgc-quickbooks');
      const redirectUri = `${sgcQbBaseUrl(req)}/api/sgc/quickbooks/callback`;
      res.redirect(sgcQb.getAuthUrl(redirectUri));
    } catch (e) { res.status(500).send(`QB connect error: ${e.message}`); }
  });

  router.get('/api/sgc/quickbooks/callback', async (req, res) => {
    try {
      const { code, realmId, error } = req.query;
      if (error) return res.send(`QuickBooks error: ${error}`);
      if (!code || !realmId) return res.status(400).send('Missing code or realmId');
      const sgcQb = require('../tools/sgc-quickbooks');
      const tokens = await sgcQb.exchangeCodeForTokens(code, realmId, `${sgcQbBaseUrl(req)}/api/sgc/quickbooks/callback`);
      res.send(`<html><body style="font-family:sans-serif;padding:40px;background:#0a0a0a;color:#f0f0f0">
        <h2 style="color:#C9A84C">✅ QuickBooks Connected!</h2>
        <p>Connected to: <strong>${tokens.companyName || 'Your QB Company'}</strong></p>
        <p style="color:#888">This window will close automatically…</p>
        <script>
          if (window.opener) window.opener.postMessage('qb-connected', '*');
          setTimeout(() => window.close(), 2000);
        </script>
      </body></html>`);
    } catch (e) { res.status(500).send(`QB callback error: ${e.message}`); }
  });

  router.get('/api/sgc/quickbooks/status', (req, res) => {
    try {
      const sgcQb = require('../tools/sgc-quickbooks');
      res.json({ connected: sgcQb.isConnected(), company: sgcQb.getCompanyName() });
    } catch (e) { res.json({ connected: false, error: e.message }); }
  });

  router.get('/api/sgc/quickbooks/export-tokens', requireAuth, requireOwner, (req, res) => {
    try {
      const sgcQb = require('../tools/sgc-quickbooks');
      res.json(sgcQb.getTokens());
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/api/sgc/quickbooks/disconnect', (req, res) => {
    try {
      const tokenFile = path.join(appDir, 'src/data/sgc-qb-tokens.json');
      if (fs.existsSync(tokenFile)) fs.unlinkSync(tokenFile);
      res.json({ disconnected: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── SGC Chat ──────────────────────────────────────────────────────────────
  router.post('/api/sgc/chat', async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) return res.status(400).json({ error: 'message required' });
      const sgcAgent = require('../agents/sgc-admin-agent');
      const reply = await sgcAgent.chat(message, history || []);
      res.json({ reply });
    } catch (e) {
      logger.error('SGC-Chat', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── SGC Morning Briefing ──────────────────────────────────────────────────
  router.post('/api/sgc/briefing', async (req, res) => {
    try {
      const { runSGCMorningBriefing } = require('../jobs/sgc-briefing');
      const result = await runSGCMorningBriefing();
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
};
