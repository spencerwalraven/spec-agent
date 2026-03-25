/**
 * Context builder — loads Settings + lead/job data into a clean object
 * so agents always have complete context without redundant sheet reads.
 */

const { readSettings, readRow, findRowByEmail } = require('../tools/sheets');

async function buildLeadContext(rowNumber) {
  const [settings, lead] = await Promise.all([
    readSettings(),
    readRow('Leads', rowNumber),
  ]);
  return { settings, lead, rowNumber };
}

async function buildJobContext(rowNumber) {
  const [settings, job] = await Promise.all([
    readSettings(),
    readRow('Jobs', rowNumber),
  ]);
  return { settings, job, rowNumber };
}

async function buildEmailContext(senderEmail) {
  const [settings, lead] = await Promise.all([
    readSettings(),
    findRowByEmail('Leads', senderEmail),
  ]);
  return { settings, lead, rowNumber: lead?._row };
}

module.exports = { buildLeadContext, buildJobContext, buildEmailContext };
