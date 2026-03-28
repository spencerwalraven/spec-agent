/**
 * Job creation helper — converts a lead into a new job.
 * Called by the orchestrator when a lead is converted.
 * Now backed by PostgreSQL (was Google Sheets).
 */

const dbLeads   = require('../services/leads');
const dbJobs    = require('../services/jobs');
const dbClients = require('../services/clients');
const { getOne } = require('../db');

const COMPANY_ID = 1;

/**
 * Create a new job from a converted lead.
 * @param {number} leadRow  - Lead ID (was row number in Sheets era)
 * @returns {{ jobId: string, rowNumber: number }}
 */
async function createJobFromLead(leadRow) {
  const lead = await dbLeads.getLead(leadRow);
  if (!lead) throw new Error(`Lead ${leadRow} not found`);

  // Find or create client record
  let client;
  if (lead.email) {
    const existing = await getOne(
      `SELECT * FROM clients WHERE LOWER(email) = LOWER($1) AND company_id = $2`,
      [lead.email, COMPANY_ID]
    );
    if (existing) {
      client = existing;
    }
  }
  if (!client) {
    client = await dbClients.createClient({
      name:    lead.name,
      email:   lead.email,
      phone:   lead.phone,
      address: lead.address,
      source:  lead.source,
      lead_id: lead.id,
    });
  }

  // Create the job
  const job = await dbJobs.createJob({
    clientId:       client.id,
    title:          lead.projectType || 'New Project',
    service:        lead.projectType || '',
    description:    lead.description || '',
    address:        lead.address || '',
    status:         'pending',
    estimatedValue: 0,
  });

  // job comes back as the raw insertOne result — get the formatted version
  const created = await dbJobs.getJob(job.id);
  const jobId   = created ? created.jobId : `JOB-${job.id}`;

  console.log(`[Jobs] Created ${jobId} (id ${job.id}) from lead ${leadRow}`);
  return { jobId, rowNumber: job.id };
}

module.exports = { createJobFromLead };
