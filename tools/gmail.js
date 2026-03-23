const { google } = require('googleapis');

function getGmail() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth });
}

// Send an email (new thread or reply)
async function sendEmail({ to, subject, body, threadId = null }) {
  const gmail = getGmail();

  // Build the raw email
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ];
  const raw = Buffer.from(emailLines.join('\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const params = {
    userId: 'me',
    requestBody: { raw, ...(threadId && { threadId }) },
  };

  const res = await gmail.users.messages.send(params);
  console.log(`Email sent to ${to} — message ID: ${res.data.id}`);
  return { messageId: res.data.id, threadId: res.data.threadId };
}

// Read a full email thread (all messages in the conversation)
async function readEmailThread(threadId) {
  const gmail = getGmail();
  const res = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full',
  });

  const messages = res.data.messages.map((msg) => {
    const headers = msg.payload.headers;
    const getHeader = (name) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    // Extract body text
    let body = '';
    const extractText = (part) => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body += Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) part.parts.forEach(extractText);
    };
    extractText(msg.payload);

    return {
      from:    getHeader('from'),
      to:      getHeader('to'),
      subject: getHeader('subject'),
      date:    getHeader('date'),
      body:    body.trim(),
    };
  });

  return messages;
}

// Get recent unread emails
async function getUnreadEmails() {
  const gmail = getGmail();
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread',
    maxResults: 10,
  });
  return res.data.messages || [];
}

// Mark a message as read
async function markAsRead(messageId) {
  const gmail = getGmail();
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: { removeLabelIds: ['UNREAD'] },
  });
}

module.exports = { sendEmail, readEmailThread, getUnreadEmails, markAsRead };
