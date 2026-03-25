/**
 * Stripe tool — creates payment links for deposit and final invoices.
 *
 * Requires STRIPE_SECRET_KEY in env.
 * Stripe docs: https://stripe.com/docs/api/payment_links
 */

const { logger } = require('../utils/logger');

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set');
  const Stripe = require('stripe');
  return Stripe(process.env.STRIPE_SECRET_KEY);
}

/**
 * Create a one-time Stripe Payment Link for an invoice.
 * @param {object} opts
 * @param {number}  opts.amountCents  - Amount in cents (e.g. 50000 = $500.00)
 * @param {string}  opts.description  - Line item description shown to customer
 * @param {string}  opts.jobId        - Job ID (stored in metadata)
 * @param {string}  opts.clientEmail  - Pre-fill customer email (optional)
 * @returns {Promise<{ url: string, id: string }>}
 */
async function createPaymentLink({ amountCents, description, jobId, clientEmail }) {
  const stripe = getStripe();

  // Create a one-time price on the fly
  const price = await stripe.prices.create({
    unit_amount: Math.round(amountCents),
    currency:    'usd',
    product_data: {
      name: description || 'Invoice Payment',
    },
  });

  const linkParams = {
    line_items: [{ price: price.id, quantity: 1 }],
    metadata:   { jobId: jobId || '' },
    after_completion: {
      type:         'redirect',
      redirect:     { url: process.env.STRIPE_REDIRECT_URL || process.env.APP_URL || 'https://your-app.railway.app/paid' },
    },
  };

  // Pre-fill email if provided (requires Stripe.js or checkout)
  if (clientEmail) {
    linkParams.customer_creation      = 'always';
    // Note: email pre-fill is only supported in Payment Links via customer_email field
  }

  const paymentLink = await stripe.paymentLinks.create(linkParams);

  logger.success('Stripe', `Payment link created: $${(amountCents / 100).toFixed(2)} — ${paymentLink.url}`);
  return { url: paymentLink.url, id: paymentLink.id };
}

/**
 * Check if Stripe is configured.
 */
function isConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

module.exports = { createPaymentLink, isConfigured };
