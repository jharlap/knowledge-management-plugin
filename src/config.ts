import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

export interface Config {
  // User-facing settings (injected as env vars by .mcpb runtime)
  documentsPath: string;
  googleDocsEnabled: boolean;
  googleDriveFolderId: string | null;
  syncIntervalMinutes: number;
  googleClientId: string | null;
  googleClientSecret: string | null;

  // Internal paths
  dataDir: string;
  mirrorWordDir: string;
  mirrorGdocsDir: string;
  tokensDir: string;
  dbPath: string;
  stateFile: string;
  pandocBin: string;
}

export function loadConfig(): Config {
  const dataDir = path.join(os.homedir(), '.local', 'share', 'knowledge-management');
  const mirrorWordDir = path.join(dataDir, 'mirror', 'word');
  const mirrorGdocsDir = path.join(dataDir, 'mirror', 'gdocs');

  // When running from .mcpb, __dirname is the extension install directory.
  // Fall back to PATH so `pandoc` works during local development.
  const extensionDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const arch = process.arch === 'arm64' ? 'arm64' : 'x86_64';
  const bundledPandoc = path.join(extensionDir, 'bin', `pandoc-${arch}`);

  return {
    documentsPath: process.env.KM_DOCUMENTS_PATH ?? path.join(os.homedir(), 'Documents'),
    googleDocsEnabled: process.env.KM_GOOGLE_DOCS_ENABLED === 'true',
    googleDriveFolderId: process.env.KM_GOOGLE_DRIVE_FOLDER_ID ?? null,
    syncIntervalMinutes: parseInt(process.env.KM_SYNC_INTERVAL_MINUTES ?? '60', 10),
    googleClientId: process.env.KM_GOOGLE_CLIENT_ID ?? null,
    googleClientSecret: process.env.KM_GOOGLE_CLIENT_SECRET ?? null,

    dataDir,
    mirrorWordDir,
    mirrorGdocsDir,
    tokensDir: path.join(dataDir, 'tokens'),
    dbPath: path.join(dataDir, 'index.sqlite'),
    stateFile: path.join(dataDir, 'state.json'),
    pandocBin: bundledPandoc,
  };
}
