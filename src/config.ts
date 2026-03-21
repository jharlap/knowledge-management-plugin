import os from 'os';
import path from 'path';
import { readFileSync } from 'fs';
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

// Read user config directly from Claude Desktop's settings file.
// Claude Desktop stores user_config in:
//   ~/Library/Application Support/Claude/Claude Extensions Settings/<extensionId>.json
// This is the fallback when env var template substitution doesn't happen.
function readExtensionSettings(extensionDir: string): Record<string, unknown> {
  try {
    const extensionId = path.basename(extensionDir);
    const claudeDir = path.dirname(path.dirname(extensionDir));
    const settingsPath = path.join(claudeDir, 'Claude Extensions Settings', `${extensionId}.json`);
    const raw = readFileSync(settingsPath, 'utf8');
    const data = JSON.parse(raw) as { userConfig?: Record<string, unknown> };
    return data.userConfig ?? {};
  } catch {
    return {};
  }
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

  // Prefer env vars (substituted by mcpb runtime); fall back to settings file.
  const settings = readExtensionSettings(extensionDir);
  function cfg(envKey: string, settingsKey: string): string | undefined {
    const fromEnv = env(envKey);
    if (fromEnv !== undefined) return fromEnv;
    const v = settings[settingsKey];
    return v !== undefined ? String(v) : undefined;
  }

  const rawInterval = parseInt(cfg('KM_SYNC_INTERVAL_MINUTES', 'sync_interval_minutes') ?? '60', 10);

  return {
    documentsPath: cfg('KM_DOCUMENTS_PATH', 'documents_path') ?? path.join(os.homedir(), 'Documents'),
    googleDocsEnabled: cfg('KM_GOOGLE_DOCS_ENABLED', 'google_docs_enabled') === 'true',
    googleDriveFolderId: cfg('KM_GOOGLE_DRIVE_FOLDER_ID', 'google_drive_folder_id') ?? null,
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
