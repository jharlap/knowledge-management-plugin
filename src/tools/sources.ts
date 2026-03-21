import type { Config } from '../config.js';
import { loadState } from '../sync/state.js';

export async function handleListSources(config: Config): Promise<string> {
  const state = await loadState(config.stateFile);

  const wordCount = Object.keys(state.wordFiles).length;
  const gdocCount = Object.keys(state.gdocFiles).length;

  const lines = [
    '## Knowledge Management Sources',
    '',
    `**Word documents**`,
    `  Path: ${config.documentsPath}`,
    `  Indexed: ${wordCount} file${wordCount !== 1 ? 's' : ''}`,
    `  Last sync: ${state.lastSync.word ?? 'never'}`,
    '',
    `**Google Docs**`,
    `  Enabled: ${config.googleDocsEnabled ? 'yes' : 'no'}`,
  ];

  if (config.googleDocsEnabled) {
    lines.push(
      `  Folder: ${config.googleDriveFolderId ?? 'all docs'}`,
      `  Indexed: ${gdocCount} file${gdocCount !== 1 ? 's' : ''}`,
      `  Last sync: ${state.lastSync.gdocs ?? 'never'}`,
    );
  }

  lines.push('', `**Sync interval:** ${config.syncIntervalMinutes} minutes`);

  return lines.join('\n');
}
