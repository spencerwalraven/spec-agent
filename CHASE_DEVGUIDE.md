# SPEC Systems — Developer Guide for Chase

Hey Chase — this is the full AI CRM we've been building. You're getting the whole codebase. Here's everything you need to understand the system, run it locally, and pick up where we left off.

---

## The Big Picture

This is a Node.js/Express server that runs 15 AI agents (Claude-powered) for home service businesses. It handles the full customer lifecycle automatically:

```
Lead fills form → AI qualifies & responds → Books consult → Gets proposal →
Signs contract → Project planned → Invoiced → Job complete → Review requested
```

The dashboard is a web app (vanilla JS + CSS — no framework) that gives the business owner a CRM view of everything. Agents run in the background via webhooks, Make.com triggers, or manual buttons in the dashboard.

**Stack:**
- Backend: Node.js / Express (single `index.js` — ~2600 lines)
- AI: Anthropic Claude via tool-use loop (`src/agents/base-agent.js`)
- Database: Google Sheets (sheets.js is the ORM)
- Frontend: `public/index.html` + `public/app.js` (PWA, ~4500 lines combined)
- Hosting: Railway (auto-deploys from GitHub push)

---

## Get the Code Running Locally

### 1. Clone & Install
```bash
git clone <Spencer will share the GitHub repo>
cd spec-agent
npm install
```

### 2. Set Up .env
```bash
cp .env.example .env
```

Fill in the minimum to run locally:
```
ANTHROPIC_API_KEY=sk-ant-...         # get from Spencer
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
SHEET_ID=xxx                         # Spencer's test sheet
SESSION_SECRET=any-random-string
LOGIN_USERS=chase:password:owner
APP_URL=http://localhost:3000
```

### 3. Get the Google Refresh Token
```bash
npm run setup
```
Opens a browser → log in with the Google account tied to the test sheet → paste the code → copies GOOGLE_REFRESH_TOKEN into your clipboard. Add it to .env.

### 4. Run It
```bash
node index.js
# or if you have nodemon:
npx nodemon index.js
```

Dashboard: `http://localhost:3000`
Log in with whatever credentials you put in `LOGIN_USERS`

---

## Codebase Map

```
spec-agent/
├── index.js                     # Express server, all API routes, webhook handlers
├── public/
│   ├── index.html               # Full dashboard HTML (all pages rendered client-side)
│   └── app.js                   # Dashboard JS — all page logic, API calls, rendering
├── src/
│   ├── agents/                  # AI agents — each is a Claude tool-use loop
│   │   ├── base-agent.js        # Shared agentic loop (all agents extend this)
│   │   ├── orchestrator.js      # Routes webhook events to the right agent
│   │   ├── lead-agent.js        # Handles new leads — score, respond, schedule
│   │   ├── client-agent.js      # Manages active jobs — invoices, updates, completion
│   │   ├── pricing-agent.js     # Generates line-item estimates with material costs
│   │   ├── planning-agent.js    # Breaks jobs into phases, assigns crew, creates kickoff doc
│   │   ├── marketing-agent.js   # Re-engagement, referrals, performance reports
│   │   ├── job-agent.js         # Handles job-level updates and change orders
│   │   ├── sms-agent.js         # Handles inbound SMS (two-way texting)
│   │   ├── payment-agent.js     # Handles Stripe payment confirmations
│   │   ├── welcome-agent.js     # Onboards new clients post-contract
│   │   ├── sub-confirmation-agent.js # Follows up with subs to confirm schedule
│   │   ├── change-order-agent.js # Generates change order docs
│   │   ├── learning-agent.js    # Extracts insights from completed jobs
│   │   └── smart-orchestrator.js # ML-style routing based on historical performance
│   ├── tools/                   # Tool implementations agents call
│   │   ├── sheets.js            # ALL Google Sheets operations (readTab, updateCell, etc.)
│   │   ├── gmail.js             # Send emails
│   │   ├── gmail-watch.js       # Gmail push notifications (Pub/Sub)
│   │   ├── docs.js              # Create Google Docs
│   │   ├── notify.js            # Multi-channel owner alerts (email + SMS)
│   │   ├── sms.js               # Send Twilio SMS
│   │   ├── stripe.js            # Stripe payment links
│   │   ├── quickbooks.js        # QuickBooks two-way sync (NEW)
│   │   ├── calendar.js          # Google Calendar events
│   │   ├── weather.js           # Weather API (used in scheduling)
│   │   └── jobs.js              # Job-specific sheet helpers
│   └── triggers/
│       ├── webhooks.js          # Express router for /webhook/* endpoints
│       └── scheduler.js         # node-cron jobs (daily follow-ups, etc.)
└── SETUP.md                     # Original setup doc
```

---

## How Agents Work (Important to Understand This)

Every agent follows the same pattern — look at `base-agent.js`:

1. Agent gets a system prompt (instructions) + user message (trigger)
2. Claude decides which tools to call
3. We execute those tools (sheets, email, docs, etc.)
4. Claude gets the results and decides what to do next
5. Loop continues until Claude stops calling tools

```js
// Example: trigger the pricing agent
const pricingAgent = require('./src/agents/pricing-agent');
await pricingAgent.generateEstimate({ rowNumber: 5 });
// This kicks off a full Claude tool-use loop — reads job data,
// fetches material prices, creates a Google Doc estimate, updates the sheet
```

Tools available to each agent are defined in `TOOLS` arrays at the top of each agent file. The actual implementations are in `EXECUTORS` objects right below them.

---

## The Database (Google Sheets)

All data lives in a Google Sheet. Key tabs:

| Tab | What's In It |
|-----|-------------|
| **Leads** | Inbound prospects — status, contact info, service requested |
| **Jobs** | Active/completed projects — budget, timeline, doc links |
| **Clients** | Converted customers — profile, satisfaction scores |
| **Job Phases** | Project timeline — each phase with trade, dates, status |
| **Job Materials** | Materials per job — populated by Pricing Agent |
| **Equipment** | Company assets — trucks, tools, ladders |
| **Team** | Employees + subs — trades, Calendly links, round-robin |
| **Settings** | Business config — editable by owner from dashboard |

**Key functions in `sheets.js`:**
```js
readTab(tabName)              // Returns array of row objects
readRow(tabName, rowNumber)   // Returns single row
updateCell(tab, row, col, val) // Update one cell by column header name
appendRow(tabName, data)      // Add a new row
readSettings()                // Returns all settings as structured object
```

---

## Current Status — What's Built

Everything is working. Here's the full feature list:

### Agents (all built and wired)
- ✅ Lead Agent — auto-responds to new leads, scores them, schedules appointments
- ✅ Email Reply Handler — reads context, crafts appropriate replies
- ✅ SMS Agent — two-way texting with Twilio
- ✅ Calendly Booking Handler — confirmation emails, status updates
- ✅ Pricing Agent — line-item estimates with live material pricing (Tavily)
- ✅ Proposal Agent — professional proposal generation
- ✅ Contract Agent — contract generation + e-sign prep
- ✅ Planning Agent — breaks projects into phases, assigns crew, equipment
- ✅ Client Agent — invoicing (deposit + final), job completion, reviews
- ✅ Payment Agent — handles Stripe payment confirmations
- ✅ Welcome Agent — onboards new clients post-contract
- ✅ Sub Confirmation Agent — follows up with subs to confirm
- ✅ Change Order Agent — generates change order documents
- ✅ Marketing Agent — re-engagement, referrals, monthly performance reports
- ✅ Learning Agent — extracts patterns from completed jobs for future accuracy

### Dashboard
- ✅ Role-based views (owner / sales / field)
- ✅ Leads, Jobs, Clients pages
- ✅ Job detail with document links + Generate buttons
- ✅ Schedule strip (Google Calendar + Leads + Jobs combined)
- ✅ Inventory page — Job Materials per estimate + Equipment management
- ✅ Subcontractor portal (separate login, no access to full dashboard)
- ✅ Settings page — business config, integrations
- ✅ Analytics page

### Integrations
- ✅ Tally form → webhook → Lead Agent
- ✅ Calendly → webhook → status updates
- ✅ Gmail push (Pub/Sub) for real-time email handling
- ✅ Twilio two-way SMS
- ✅ Stripe payment links + webhooks
- ✅ Google Docs (estimate, proposal, contract, kickoff docs)
- ✅ Google Calendar (schedule strip)
- ✅ QuickBooks two-way sync (invoices pushed, payments synced back) ← just finished

---

## What Still Needs Work / Your Area

### 1. Calendly — Deeper Integration
Right now: a single Calendly link lives in Settings and gets pasted into emails.

**What would make it better:**
- Each Team member can have their own Calendly link in the Team tab (column already exists)
- When assigning a lead to a specific rep (round-robin), include THEIR Calendly link in the email (not the default one)
- The lead agent already reads the team tab for round-robin assignment — it just needs to pull the right Calendly link per rep

**Where to make the change:** `src/agents/lead-agent.js` — in the system prompt, instruct it to use `rep.calendlyLink` from the round-robin assignment instead of `settings.calendlyLink`

The rep data comes back from `getNextRep()` in `sheets.js` — it already returns `calendlyLink` in the object.

### 2. QuickBooks — Just Finished, Needs Testing
We just built the full QB two-way sync. It's in `src/tools/quickbooks.js`.

**What's built:**
- OAuth connection flow (Settings → Connect QuickBooks button)
- Invoice push (when CRM generates deposit/final invoice, it also creates it in QB)
- Payment sync (when QB records a payment, CRM updates job status)
- Manual sync button on each job

**What needs verification:**
- Test with a real QB sandbox account
- The OAuth callback URL needs to be whitelisted in the QuickBooks Developer app settings
- `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `QUICKBOOKS_ENVIRONMENT`, `QUICKBOOKS_WEBHOOK_TOKEN` all need to be set

---

## Environment Variables You'll Need

Spencer has the Google credentials and Anthropic key — get those from him.

For testing QuickBooks specifically:
```
QUICKBOOKS_CLIENT_ID=        # From developer.intuit.com
QUICKBOOKS_CLIENT_SECRET=    # Same
QUICKBOOKS_ENVIRONMENT=sandbox
QUICKBOOKS_WEBHOOK_TOKEN=    # From QB webhook settings
```

For testing SMS:
```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE=+1xxxxxxxxxx
```

---

## Deploying Changes

We're on Railway with auto-deploy from GitHub. Workflow:
1. Make changes locally
2. `git add . && git commit -m "description"`
3. `git push`
4. Railway picks it up in ~60 seconds and redeploys

Check Railway logs live: `railway logs` (if you have the Railway CLI) or just watch the Railway dashboard.

---

## Quick Reference — Key Files to Touch for Common Tasks

| Task | File(s) |
|------|---------|
| Change how an email is written | The specific agent's system prompt |
| Add a new webhook endpoint | `src/triggers/webhooks.js` |
| Add a new page to dashboard | `public/index.html` (HTML) + `public/app.js` (navigate() + render function) |
| Add a new agent tool | Tool def in `TOOLS` array + executor in `EXECUTORS` object in that agent file |
| Add a new scheduled task | `src/triggers/scheduler.js` |
| Add a new API endpoint | `index.js` (find the relevant section) |
| Change sheet column mappings | `src/tools/sheets.js` (the `g()` helper + field name strings) |

---

## Notes

- **No build step** — it's vanilla JS + plain Node, just runs directly
- **Sheet column names matter** — agents reference columns by header name. If you rename a column in the sheet, update the agent prompts too
- **Demo mode** — the dashboard has built-in demo data so you can test UI without real sheet data. The `api()` function in `app.js` falls back to `DEMO.*` on API errors
- **Logging** — `src/utils/logger.js` — color-coded logs with `logger.info()`, `logger.success()`, `logger.warn()`, `logger.error()`
- **All agents are singletons** — exported as `module.exports = new XAgent()` so they're instantiated once

---

## Questions?

Hit up Spencer. He's been building this for months and knows every corner of it.
