import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { Config } from '../config.js';
import type { SyncState } from './state.js';

const execFileAsync = promisify(execFile);

export interface WordSyncResult {
  indexed: number;
  unchanged: number;
  removed: number;
  errors: string[];
}

export async function syncWordDocs(config: Config, state: SyncState): Promise<WordSyncResult> {
  const result: WordSyncResult = { indexed: 0, unchanged: 0, removed: 0, errors: [] };

  await fs.mkdir(config.mirrorWordDir, { recursive: true });

  // Find pandoc: prefer bundled binary, fall back to PATH
  const pandoc = await resolvePandoc(config.pandocBin);

  // Walk the documents directory
  const currentPaths = new Set<string>();
  for await (const srcPath of walkDir(config.documentsPath, /\.docx$/i)) {
    currentPaths.add(srcPath);

    const stat = await fs.stat(srcPath);
    const mtime = stat.mtimeMs;
    const existing = state.wordFiles[srcPath];

    if (existing && existing.mtime === mtime) {
      result.unchanged++;
      continue;
    }

    // Derive a stable mirror path from the source path
    const rel = path.relative(config.documentsPath, srcPath);
    const mirrorRel = rel.replace(/\.docx$/i, '.md');
    const mirrorPath = path.join(config.mirrorWordDir, mirrorRel);

    try {
      await fs.mkdir(path.dirname(mirrorPath), { recursive: true });
      const { stdout } = await execFileAsync(pandoc, [
        '-f', 'docx',
        '-t', 'markdown',
        '--wrap=none',
        srcPath,
      ]);
      await fs.writeFile(mirrorPath, stdout);
      state.wordFiles[srcPath] = { mtime, mirrorPath: mirrorRel };
      result.indexed++;
    } catch (err) {
      result.errors.push(`${srcPath}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Remove mirror files for deleted source docs
  for (const [srcPath, entry] of Object.entries(state.wordFiles)) {
    if (!currentPaths.has(srcPath)) {
      const mirrorPath = path.join(config.mirrorWordDir, entry.mirrorPath);
      await fs.rm(mirrorPath, { force: true });
      delete state.wordFiles[srcPath];
      result.removed++;
    }
  }

  state.lastSync.word = new Date().toISOString();
  return result;
}

async function resolvePandoc(bundledPath: string): Promise<string> {
  try {
    await fs.access(bundledPath, fs.constants.X_OK);
    return bundledPath;
  } catch {
    return 'pandoc'; // fall back to PATH
  }
}

async function* walkDir(dir: string, pattern: RegExp): AsyncGenerator<string> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(fullPath, pattern);
    } else if (entry.isFile() && pattern.test(entry.name)) {
      yield fullPath;
    }
  }
}
