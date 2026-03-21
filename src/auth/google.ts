import fs from 'fs/promises';
import http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '../credentials.js';

const execAsync = promisify(exec);

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const TOKEN_FILE = 'google.json';

export async function getAuthClient(tokensDir: string): Promise<OAuth2Client> {
  const tokenPath = path.join(tokensDir, TOKEN_FILE);

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error(
      'Google OAuth credentials are not configured. ' +
      'If you built this from source, copy src/credentials.example.ts to src/credentials.ts and fill in your GCP credentials.',
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    'http://localhost', // placeholder; overridden with the actual port below
  );

  // Try loading a saved token first
  try {
    const raw = await fs.readFile(tokenPath, 'utf-8');
    oauth2Client.setCredentials(JSON.parse(raw));
    // googleapis refreshes expired access tokens automatically via the refresh token
    return oauth2Client;
  } catch {
    // No saved token — run the browser consent flow
  }

  const { port, server } = await startCallbackServer();
  const redirectUri = `http://localhost:${port}/callback`;

  const authClient = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirectUri);

  const authUrl = authClient.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // always request refresh_token
  });

  console.error('[knowledge-management] Opening browser for Google authorization...');
  await execAsync(`open "${authUrl}"`);

  const code = await waitForCode(server, port);
  const { tokens } = await authClient.getToken(code);
  authClient.setCredentials(tokens);

  await fs.mkdir(tokensDir, { recursive: true });
  await fs.writeFile(tokenPath, JSON.stringify(tokens, null, 2));

  return authClient;
}

function startCallbackServer(): Promise<{ port: number; server: http.Server }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Could not determine callback server port'));
        return;
      }
      resolve({ port: addr.port, server });
    });
    server.on('error', reject);
  });
}

function waitForCode(server: http.Server, port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('Google auth timed out after 5 minutes'));
    }, 5 * 60 * 1000);

    server.on('request', (req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400);
        res.end('<h1>Authorization failed</h1><p>You can close this tab.</p>');
        clearTimeout(timeout);
        server.close();
        reject(new Error(`Google auth error: ${error}`));
        return;
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorized!</h1><p>Knowledge Management is connected to Google. You can close this tab.</p>');
        clearTimeout(timeout);
        server.close();
        resolve(code);
      }
    });
  });
}
