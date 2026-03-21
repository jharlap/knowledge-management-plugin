import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { Config } from '../config.js';
import type { SyncState } from './state.js';
import { getAuthClient } from '../auth/google.js';

const execFileAsync = promisify(execFile);

export interface GdocsSyncResult {
  indexed: number;
  unchanged: number;
  errors: string[];
}

export async function syncGoogleDocs(config: Config, state: SyncState): Promise<GdocsSyncResult> {
  const result: GdocsSyncResult = { indexed: 0, unchanged: 0, errors: [] };

  if (!config.googleClientId || !config.googleClientSecret) {
    result.errors.push('Google client credentials not configured — skipping Google Docs sync');
    return result;
  }

  await fs.mkdir(config.mirrorGdocsDir, { recursive: true });

  const auth = await getAuthClient(config.tokensDir, config.googleClientId, config.googleClientSecret);
  const files = await listGoogleDocs(auth, config.googleDriveFolderId ?? undefined);
  const pandoc = await resolvePandoc(config.pandocBin);

  for (const file of files) {
    if (!file.id || !file.name || !file.modifiedTime) continue;

    const existing = state.gdocFiles[file.id];
    if (existing && existing.modifiedTime === file.modifiedTime) {
      result.unchanged++;
      continue;
    }

    const safeName = file.name.replace(/[/\\?%*:|"<>]/g, '-');
    const mirrorRel = `${file.id}-${safeName}.md`;
    const mirrorPath = path.join(config.mirrorGdocsDir, mirrorRel);

    try {
      // Export as .docx, then convert to markdown via pandoc (same pipeline as Word docs)
      const docxBuffer = await exportAsDocx(auth, file.id);

      const tmpFile = path.join(os.tmpdir(), `km-gdoc-${file.id}.docx`);
      await fs.writeFile(tmpFile, docxBuffer);

      const { stdout } = await execFileAsync(pandoc, [
        '-f', 'docx',
        '-t', 'markdown',
        '--wrap=none',
        tmpFile,
      ]);

      await fs.rm(tmpFile, { force: true });

      // Prepend a title heading so qmd can extract a useful title
      const content = `# ${file.name}\n\n${stdout}`;
      await fs.writeFile(mirrorPath, content);

      state.gdocFiles[file.id] = {
        modifiedTime: file.modifiedTime,
        name: file.name,
        mirrorPath: mirrorRel,
      };
      result.indexed++;
    } catch (err) {
      result.errors.push(`${file.name} (${file.id}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  state.lastSync.gdocs = new Date().toISOString();
  return result;
}

async function listGoogleDocs(auth: OAuth2Client, folderId?: string) {
  const drive = google.drive({ version: 'v3', auth });
  const baseQuery = `mimeType='application/vnd.google-apps.document' and trashed=false`;
  const q = folderId ? `${baseQuery} and '${folderId}' in parents` : baseQuery;

  const files = [];
  let pageToken: string | undefined;

  do {
    const response = await drive.files.list({
      q,
      fields: 'nextPageToken, files(id, name, modifiedTime)',
      pageToken,
      pageSize: 100,
    });
    files.push(...(response.data.files ?? []));
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return files;
}

async function exportAsDocx(auth: OAuth2Client, fileId: string): Promise<Buffer> {
  const drive = google.drive({ version: 'v3', auth });
  const response = await drive.files.export(
    { fileId, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { responseType: 'arraybuffer' },
  );
  return Buffer.from(response.data as ArrayBuffer);
}

async function resolvePandoc(bundledPath: string): Promise<string> {
  try {
    await fs.access(bundledPath, fs.constants.X_OK);
    return bundledPath;
  } catch {
    return 'pandoc';
  }
}
