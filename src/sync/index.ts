import fs from 'fs/promises';
import { createStore } from '@tobilu/qmd';
import type { Config } from '../config.js';
import { loadState, saveState } from './state.js';
import { syncWordDocs } from './word.js';
import { syncGoogleDocs } from './gdocs.js';

export interface SyncSummary {
  word: { indexed: number; unchanged: number; removed: number; errors: string[] } | null;
  gdocs: { indexed: number; unchanged: number; errors: string[] } | null;
  qmdUpdated: boolean;
  embeddingStatus: 'ok' | 'skipped' | 'failed';
  embeddingError?: string;
  errors: string[];
}

export async function runSync(config: Config): Promise<SyncSummary> {
  const summary: SyncSummary = { word: null, gdocs: null, qmdUpdated: false, embeddingStatus: 'skipped', errors: [] };

  await fs.mkdir(config.dataDir, { recursive: true });

  const state = await loadState(config.stateFile);

  // Sync Word docs
  summary.word = await syncWordDocs(config, state);

  // Sync Google Docs
  if (config.googleDocsEnabled) {
    summary.gdocs = await syncGoogleDocs(config, state);
  }

  await saveState(config.stateFile, state);

  // Always update the QMD index — it's idempotent and handles the case where
  // mirroring succeeded on a previous run but the index update failed.
  try {
      const store = await createStore({
        dbPath: config.dbPath,
        config: {
          collections: {
            word: { path: config.mirrorWordDir, pattern: '**/*.md' },
            gdocs: { path: config.mirrorGdocsDir, pattern: '**/*.md' },
          },
        },
      });

      await store.update();
      try {
        await store.embed();
        summary.embeddingStatus = 'ok';
      } catch (err) {
        summary.embeddingStatus = 'failed';
        summary.embeddingError = err instanceof Error ? err.message : String(err);
      }

      await store.close();
      summary.qmdUpdated = true;
    } catch (err) {
      summary.errors.push(`QMD index update failed: ${err instanceof Error ? err.message : String(err)}`);
    }

  return summary;
}

export function isSyncStale(config: Config, state: { lastSync: { word: string | null; gdocs: string | null } }): boolean {
  const cutoff = Date.now() - config.syncIntervalMinutes * 60 * 1000;
  const wordStale = !state.lastSync.word || new Date(state.lastSync.word).getTime() < cutoff;
  const gdocsStale = config.googleDocsEnabled &&
    (!state.lastSync.gdocs || new Date(state.lastSync.gdocs).getTime() < cutoff);
  return wordStale || gdocsStale;
}
