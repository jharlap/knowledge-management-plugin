import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

export interface Config {
  // User-facing settings (injected as env vars by .mcpb runtime)
  documentsPath: string;
  googleDocsEnabled: boolean;
  googleDriveFolderId: string | null;
  syncIntervalMinutes: number;

  // Internal paths
  dataDir: string;
  mirrorWordDir: string;
  mirrorGdocsDir: string;
  tokensDir: string;
  dbPath: string;
  stateFile: string;
  pandocBin: string;
}

// If the .mcpb runtime fails to substitute a template variable it passes the
// literal string "${user_config.xxx}" — treat that as unset.
function env(key: string): string | undefined {
  const val = process.env[key];
  if (!val || val.startsWith('${')) return undefined;
  return val;
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

  const rawInterval = parseInt(env('KM_SYNC_INTERVAL_MINUTES') ?? '60', 10);

  return {
    documentsPath: env('KM_DOCUMENTS_PATH') ?? path.join(os.homedir(), 'Documents'),
    googleDocsEnabled: env('KM_GOOGLE_DOCS_ENABLED') === 'true',
    googleDriveFolderId: env('KM_GOOGLE_DRIVE_FOLDER_ID') ?? null,
    syncIntervalMinutes: isNaN(rawInterval) ? 60 : rawInterval,

    dataDir,
    mirrorWordDir,
    mirrorGdocsDir,
    tokensDir: path.join(dataDir, 'tokens'),
    dbPath: path.join(dataDir, 'index.sqlite'),
    stateFile: path.join(dataDir, 'state.json'),
    pandocBin: bundledPandoc,
  };
}
