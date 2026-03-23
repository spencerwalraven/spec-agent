require('dotenv').config();
const express = require('express');
const { handleNewLead, handleEmailReply } = require('./agent');

const app  = express();
app.use(express.json());

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status:  'SPEC Agent Server is running ✓',
    version: '1.0.0',
    agents:  ['Lead Agent'],
  });
});

// ─── NEW LEAD WEBHOOK (from Make.com) ────────────────────────────────────────
// Make.com sends this when a new lead submits the form
app.post('/webhook/new-lead', async (req, res) => {
  // Respond immediately so Make.com doesn't time out
  res.status(200).json({ received: true });

  console.log('\n📥 New lead webhook received:', req.body);

  try {
    const clientId = req.query.clientId || 'default';
    await handleNewLead(req.body, clientId);
  } catch (err) {
    console.error('Error handling new lead:', err.message);
  }
});

// ─── EMAIL REPLY WEBHOOK ──────────────────────────────────────────────────────
// Called when a lead replies to an email
// You can set this up via Gmail push notifications or Make.com watching the inbox
app.post('/webhook/email-reply', async (req, res) => {
  res.status(200).json({ received: true });

  console.log('\n📧 Email reply webhook received');

  try {
    const clientId = req.query.clientId || 'default';

    // Handle both Gmail push notification format and Make.com format
    let emailData = req.body;

    // Gmail push notifications come base64 encoded
    if (req.body.message?.data) {
      const decoded = JSON.parse(
        Buffer.from(req.body.message.data, 'base64').toString()
      );
      emailData = decoded;
    }

    await handleEmailReply(emailData, clientId);
  } catch (err) {
    console.error('Error handling email reply:', err.message);
  }
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   SPEC Systems Agent Server v1.0      ║
║   Running on port ${PORT}                ║
║                                       ║
║   Endpoints:                          ║
║   POST /webhook/new-lead              ║
║   POST /webhook/email-reply           ║
╚═══════════════════════════════════════╝
  `);
});
