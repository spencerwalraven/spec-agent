/**
 * Template-based document generator.
 *
 * Tries to generate Proposal / Estimate / Contract / Kickoff docs by copying
 * the Google Doc template set in Settings, then replacing [BRACKETED] placeholders
 * with real data from the job.
 *
 * Returns { ok: true, docUrl } on success.
 * Returns { ok: false, reason } if no template is configured or something fails,
 * letting the caller fall back to AI generation.
 */

const { logger } = require('../utils/logger');
const { fillTemplate, buildJobPlaceholders } = require('../tools/docs');
const dbJobs = require('../services/jobs');
const dbSettings = require('../services/settings');

const DOC_TYPES = {
  proposal: {
    settingKey: 'proposalTemplateId',
    linkField:  'proposal_link',
    statusField:'proposal_status',
    docLabel:   'Proposal',
  },
  estimate: {
    settingKey: 'estimateTemplateId',
    linkField:  'estimate_link',
    statusField: null,
    docLabel:   'Estimate',
  },
  contract: {
    settingKey: 'contractTemplateId',
    linkField:  'contract_link',
    statusField:'contract_status',
    docLabel:   'Contract',
  },
  kickoff: {
    settingKey: 'kickoffTemplateId',
    linkField:  'kickoff_link',
    statusField: null,
    docLabel:   'Kickoff Plan',
  },
};

/**
 * Generate a document from a template.
 * @param {string} docType - 'proposal' | 'estimate' | 'contract' | 'kickoff'
 * @param {number} rowNumber - job id
 * @returns {{ok: boolean, docUrl?: string, reason?: string}}
 */
async function generateFromTemplate(docType, rowNumber) {
  const config = DOC_TYPES[docType];
  if (!config) return { ok: false, reason: `Unknown doc type: ${docType}` };

  try {
    const settings = await dbSettings.readSettings();
    const templateId = settings[config.settingKey];

    if (!templateId) {
      return { ok: false, reason: `No ${docType} template configured` };
    }

    const job = await dbJobs.getJob(rowNumber);
    if (!job) return { ok: false, reason: `Job ${rowNumber} not found` };

    // Build placeholder map
    const replacements = buildJobPlaceholders({ job, settings });

    // Output title
    const clientName = job.clientName || job.client_name || 'Client';
    const outputTitle = `${clientName} — ${config.docLabel}`;

    // Fill the template
    const { docUrl } = await fillTemplate(templateId, replacements, outputTitle);

    // Save link back to the job
    await dbJobs.updateJobField(rowNumber, config.linkField, docUrl).catch(err =>
      logger.warn('TemplateDoc', `Could not save ${config.linkField}: ${err.message}`)
    );

    // Mark status as Pending Review so the approval queue picks it up
    if (config.statusField) {
      await dbJobs.updateJobField(rowNumber, config.statusField, 'Pending Review').catch(() => {});
    }

    logger.success('TemplateDoc', `${config.docLabel} generated from template for job ${rowNumber}: ${docUrl}`);
    return { ok: true, docUrl };

  } catch (err) {
    logger.error('TemplateDoc', `Template generation failed (${docType}, job ${rowNumber}): ${err.message}`);
    return { ok: false, reason: err.message };
  }
}

module.exports = { generateFromTemplate, DOC_TYPES };
