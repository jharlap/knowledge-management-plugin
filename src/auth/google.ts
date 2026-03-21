import fs from 'fs/promises';
import http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

const execAsync = promisify(exec);

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const TOKEN_FILE = 'google.json';

export async function getAuthClient(
  tokensDir: string,
  clientId: string,
  clientSecret: string,
): Promise<OAuth2Client> {
  const tokenPath = path.join(tokensDir, TOKEN_FILE);

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    // Redirect URI is set dynamically once we know the port
    'http://localhost',
  );

  // Try loading a saved token first
  try {
    const raw = await fs.readFile(tokenPath, 'utf-8');
    const token = JSON.parse(raw);
    oauth2Client.setCredentials(token);

    // If the access token is expired but we have a refresh token, googleapis
    // will refresh it automatically on the next API call. Nothing to do here.
    return oauth2Client;
  } catch {
    // No saved token — run the browser-based consent flow
  }

  const { port, server } = await startCallbackServer();
  const redirectUri = `http://localhost:${port}/callback`;

  // Recreate client with the correct redirect URI now that we have the port
  const authClient = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const authUrl = authClient.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // ensure we always get a refresh_token
  });

  console.error(`[knowledge-management] Opening browser for Google authorization...`);
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
        res.end('<h1>Authorized!</h1><p>Knowledge Management plugin is connected to Google. You can close this tab.</p>');
        clearTimeout(timeout);
        server.close();
        resolve(code);
      }
    });
  });
}
