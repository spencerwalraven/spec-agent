/**
 * Job creation helper — converts a lead row into a new Jobs tab row.
 * Called by the orchestrator when a lead is converted.
 */

const { readRow, appendRow, updateCell, getLastRow } = require('./sheets');

/**
 * Create a new job from a converted lead.
 * @param {number} leadRow  - Row number in Leads tab
 * @returns {number}        - New row number in Jobs tab
 */
async function createJobFromLead(leadRow) {
  const lead = await readRow('Leads', leadRow);

  // Generate a Job ID: JOB-XXX based on current Jobs count
  const lastRow  = await getLastRow('Jobs');
  const jobNum   = String(lastRow).padStart(3, '0');
  const jobId    = `JOB-${jobNum}`;

  const today    = new Date().toLocaleDateString('en-US');

  const jobData  = {
    'Job ID':             jobId,
    'First Name':         lead['First Name']          || '',
    'Last Name':          lead['Last Name']            || '',
    'Email':              lead['Email']                || '',
    'Phone Number':       lead['Phone Number']         || '',
    'Street Address':     lead['Street Address']       || '',
    'City':               lead['City']                 || '',
    'State':              lead['State']                || '',
    'Zip Code':           lead['Zip Code']             || '',
    'Service Type':       lead['Service Requested']    || '',
    'Project Description':lead['Tell us about your project'] || '',
    'Budget':             lead['Budget']               || '',
    'Timeline':           lead['Timeline']             || '',
    'Job Status':         'New Job',
    'Lead Source':        lead['How did you hear about us?'] || '',
    'Date Created':       today,
    'Salesperson':        lead['Assigned Salesmen']    || '',
  };

  await appendRow('Jobs', jobData);
  const newRow = await getLastRow('Jobs');

  console.log(`[Jobs] Created ${jobId} at row ${newRow} from lead row ${leadRow}`);
  return { jobId, rowNumber: newRow };
}

module.exports = { createJobFromLead };
