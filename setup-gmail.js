/**
 * Run this ONCE to get your Google refresh token.
 * It will open a browser, you log in, and it prints your token.
 *
 * Usage: node setup-gmail.js
 */

require('dotenv').config();
const { google } = require('googleapis');
const readline  = require('readline');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob' // for desktop/CLI apps
);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/spreadsheets',
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('\n═══════════════════════════════════════════');
console.log('SPEC Agent — Gmail Setup');
console.log('═══════════════════════════════════════════');
console.log('\nStep 1: Open this URL in your browser:\n');
console.log(authUrl);
console.log('\nStep 2: Sign in with the Gmail account the agent will use');
console.log('Step 3: Copy the code Google gives you');
console.log('Step 4: Paste it below\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Paste the code here: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    console.log('\n═══════════════════════════════════════════');
    console.log('✓ SUCCESS! Add this to your .env file:');
    console.log('═══════════════════════════════════════════\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\n═══════════════════════════════════════════');
    console.log('Also add this to Railway as an environment variable.');
    console.log('═══════════════════════════════════════════\n');
  } catch (err) {
    console.error('\n✗ Error getting token:', err.message);
    console.log('Make sure your Client ID and Secret are correct in .env');
  }
});
