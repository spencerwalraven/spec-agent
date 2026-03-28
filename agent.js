require('dotenv').config();
const OpenAI = require('openai');
const { readLead, findLeadByEmail, updateLead } = require('./src/tools/sheets-compat');
const { sendEmail, readEmailThread, markAsRead } = require('./tools/gmail');
const fs = require('fs');

// Lazy init — don't throw at startup if key is missing
let openai;
function getOpenAI() {
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

// Load client config
function getClientConfig(clientId = 'default') {
  const path = `./clients/${clientId}.json`;
  return JSON.parse(fs.readFileSync(path, 'utf-8'));
}

// ─── TOOL DEFINITIONS ────────────────────────────────────────────────────────

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'read_lead',
      description: 'Read all information about a lead from the spreadsheet by their row number',
      parameters: {
        type: 'object',
        properties: {
          rowNumber: { type: 'number', description: 'The row number of the lead in the spreadsheet' }
        },
        required: ['rowNumber']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_lead',
      description: 'Update a field for a lead in the spreadsheet. Fields: leadScore (Hot/Warm/Cold), leadStatus (New/Contacted/Replied/Appointment Scheduled/Converted/Dead), agentNotes, emailThread, lastContact, appointmentDate',
      parameters: {
        type: 'object',
        properties: {
          rowNumber: { type: 'number', description: 'The row number of the lead' },
          field: { type: 'string', description: 'The field name to update' },
          value: { type: 'string', description: 'The value to set' }
        },
        required: ['rowNumber', 'field', 'value']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Send an email to the lead. Use threadId to reply in the same conversation thread.',
      parameters: {
        type: 'object',
        properties: {
          to:       { type: 'string', description: 'Email address to send to' },
          subject:  { type: 'string', description: 'Email subject line' },
          body:     { type: 'string', description: 'The full email body — write this in plain text, no HTML' },
          threadId: { type: 'string', description: 'Gmail thread ID to reply in (optional, omit for new thread)' }
        },
        required: ['to', 'subject', 'body']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_email_thread',
      description: 'Read the full email conversation thread so you have full context before replying',
      parameters: {
        type: 'object',
        properties: {
          threadId: { type: 'string', description: 'The Gmail thread ID to read' }
        },
        required: ['threadId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'notify_owner',
      description: 'Send an urgent notification to the business owner — use this for hot leads, appointments booked, or anything that needs their immediate attention',
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: 'Short subject line for the alert' },
          message: { type: 'string', description: 'The full alert message for the owner' }
        },
        required: ['subject', 'message']
      }
    }
  }
];

// ─── TOOL EXECUTOR ───────────────────────────────────────────────────────────

async function executeTool(name, args, context) {
  const config = context.config;
  console.log(`\n→ Executing tool: ${name}`, args);

  switch (name) {

    case 'read_lead':
      return JSON.stringify(await readLead(args.rowNumber));

    case 'update_lead':
      return await updateLead(args.rowNumber, args.field, args.value);

    case 'send_email':
      const result = await sendEmail({
        to:       args.to,
        subject:  args.subject,
        body:     args.body,
        threadId: args.threadId || null,
      });
      // Store the thread ID so we can reply in the same thread later
      if (result.threadId && context.rowNumber) {
        await updateLead(context.rowNumber, 'emailThread', result.threadId);
        await updateLead(context.rowNumber, 'lastContact', new Date().toISOString());
      }
      return `Email sent successfully. Thread ID: ${result.threadId}`;

    case 'read_email_thread':
      const thread = await readEmailThread(args.threadId);
      return JSON.stringify(thread);

    case 'notify_owner':
      await sendEmail({
        to:      config.ownerEmail,
        subject: `🔔 SPEC Agent Alert: ${args.subject}`,
        body:    args.message,
      });
      return 'Owner notified';

    default:
      return `Unknown tool: ${name}`;
  }
}

// ─── AGENT LOOP ──────────────────────────────────────────────────────────────

async function runAgent(systemPrompt, userMessage, context) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: userMessage  },
  ];

  console.log('\n═══════════════════════════════════');
  console.log('Agent starting...');
  console.log('═══════════════════════════════════');

  // Loop: keep calling the model until it stops using tools
  for (let i = 0; i < 10; i++) {
    const response = await getOpenAI().chat.completions.create({
      model:    'gpt-4o',
      messages,
      tools:    TOOLS,
      tool_choice: 'auto',
    });

    const message = response.choices[0].message;
    messages.push(message);

    // If no tool calls, we're done
    if (!message.tool_calls || message.tool_calls.length === 0) {
      console.log('\n✓ Agent finished.');
      console.log('Final thought:', message.content);
      return message.content;
    }

    // Execute each tool call
    for (const toolCall of message.tool_calls) {
      const args   = JSON.parse(toolCall.function.arguments);
      const result = await executeTool(toolCall.function.name, args, context);

      messages.push({
        role:         'tool',
        tool_call_id: toolCall.id,
        content:      String(result),
      });
    }
  }

  console.log('Agent reached max iterations');
}

// ─── HANDLE NEW LEAD ─────────────────────────────────────────────────────────

async function handleNewLead(webhookData, clientId = 'default') {
  const config = getClientConfig(clientId);

  // The webhook from Make.com will include the row number of the new lead
  const rowNumber = webhookData.rowNumber || webhookData.row;
  if (!rowNumber) {
    console.error('No row number in webhook data:', webhookData);
    return;
  }

  console.log(`\nNew lead received — row ${rowNumber}`);

  const systemPrompt = `
You are the AI lead agent for ${config.businessName}, a ${config.services} company in ${config.location}.
You represent the owner, ${config.ownerName}. Your tone is: ${config.agentPersonality}

YOUR JOB RIGHT NOW:
1. Read the lead data from the spreadsheet (row ${rowNumber})
2. Score them: Hot, Warm, or Cold based on these criteria:
   - Hot: ${config.leadScoring.hot}
   - Warm: ${config.leadScoring.warm}
   - Cold: ${config.leadScoring.cold}
3. Update their score in the spreadsheet
4. Write and send a personalized email that:
   - References their specific project by name
   - Feels like it came from ${config.ownerName} personally
   - Is warm, professional, and NOT salesy
   - Ends with a clear next step (book a call via: ${config.calendlyLink})
5. Update their status to "Contacted" in the spreadsheet
6. If they scored Hot, notify the owner

Write the email in plain conversational text. No bullet points, no formal headers.
Sign it as ${config.ownerName} from ${config.businessName}.
  `.trim();

  const userMessage = `A new lead just came in at row ${rowNumber}. Read their data, score them, and send them a personalized response right now.`;

  await runAgent(systemPrompt, userMessage, { config, rowNumber });
}

// ─── HANDLE EMAIL REPLY ──────────────────────────────────────────────────────

async function handleEmailReply(emailData, clientId = 'default') {
  const config = getClientConfig(clientId);

  // Find this lead in the sheet by their email
  const senderEmail = emailData.from?.match(/<(.+)>/)?.[1] || emailData.from;
  const lead = await findLeadByEmail(senderEmail);

  if (!lead) {
    console.log(`No lead found for email: ${senderEmail} — skipping`);
    return;
  }

  console.log(`\nEmail reply from lead at row ${lead.rowNumber}`);

  const systemPrompt = `
You are the AI lead agent for ${config.businessName}, a ${config.services} company in ${config.location}.
You represent ${config.ownerName}. Your tone is: ${config.agentPersonality}

YOUR JOB RIGHT NOW:
1. Read the full email thread to understand the complete conversation history
2. Read the lead's data from the spreadsheet to get full context
3. Figure out what they want: more info, a quote, booking, or something else
4. Write and send a reply that directly addresses what they said
5. Update their status and add notes in the spreadsheet
6. If they want to book → send the Calendly link: ${config.calendlyLink} and update status to "Appointment Scheduled"
7. If they are clearly interested (Hot) → notify the owner
8. If they say they're not interested → update status to "Dead" and let them go gracefully

IMPORTANT RULES:
- ALWAYS read the thread first so your reply is in context
- Reply in the same thread (use the threadId)
- Never be pushy or salesy
- If something seems complex or the lead is upset, notify the owner instead of handling it yourself
- Sign as ${config.ownerName} from ${config.businessName}
  `.trim();

  const userMessage = `
${lead.firstName} ${lead.lastName} (${senderEmail}) just replied to an email.
Their lead data is at row ${lead.rowNumber}.
Their email thread ID is: ${lead.emailThread || emailData.threadId}

Read the thread, understand what they said, and respond appropriately right now.
  `.trim();

  await runAgent(systemPrompt, userMessage, {
    config,
    rowNumber: lead.rowNumber,
  });
}

module.exports = { handleNewLead, handleEmailReply };
