# SPEC Agent — Setup Guide

## Step 1 — Google Cloud Setup (20 minutes)

1. Go to console.cloud.google.com
2. Create a new project called "spec-agent"
3. Click "APIs & Services" → "Enable APIs"
4. Search and enable:
   - **Gmail API**
   - **Google Sheets API**
5. Go to "APIs & Services" → "Credentials"
6. Click "Create Credentials" → "OAuth Client ID"
7. Application type: **Desktop App**
8. Name it "SPEC Agent"
9. Download the JSON — you'll get your **Client ID** and **Client Secret**

---

## Step 2 — Create Your .env File

Copy `.env.example` to `.env` and fill in:

```
OPENAI_API_KEY=     ← your existing OpenAI key
GOOGLE_CLIENT_ID=   ← from step 1
GOOGLE_CLIENT_SECRET= ← from step 1
SHEET_ID=           ← the long ID in your Google Sheet URL
WEBHOOK_SECRET=     ← make up any random string
```

---

## Step 3 — Get Your Gmail Refresh Token

```bash
npm install
npm run setup
```

Follow the prompts — it opens a browser, you log in, paste the code back.
Copy the `GOOGLE_REFRESH_TOKEN` it gives you into your `.env`

---

## Step 4 — Deploy to Railway

1. Push this repo to GitHub
2. In Railway: New Project → Deploy from GitHub repo
3. Add all your `.env` variables in Railway's "Variables" tab
4. Railway will auto-deploy and give you a URL like `https://spec-agent-production.up.railway.app`

---

## Step 5 — Connect Make.com

In your existing Make.com Scenario 1 (New Lead):
- Add an HTTP module at the END of the scenario
- Method: POST
- URL: `https://your-railway-url.up.railway.app/webhook/new-lead`
- Body: `{ "rowNumber": {{row number variable from your sheet}} }`

For email replies — add a new Make.com scenario:
- Trigger: Gmail → Watch Emails (filter for replies to your lead emails)
- HTTP POST to: `https://your-railway-url.up.railway.app/webhook/email-reply`
- Body: `{ "from": "{{sender email}}", "threadId": "{{thread id}}", "subject": "{{subject}}" }`

---

## Step 6 — Test It

Send a test lead through your form and watch the Railway logs.
You should see the agent wake up, score the lead, and send an email within 60 seconds.

---

## Adding a New Client

1. Copy `clients/default.json` → `clients/yourclientname.json`
2. Fill in their business details
3. Connect their Gmail and Sheet (add new env variables for each client)
4. Point Make.com webhook to: `/webhook/new-lead?clientId=yourclientname`
