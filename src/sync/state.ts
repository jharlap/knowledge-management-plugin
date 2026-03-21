import fs from 'fs/promises';

export interface WordFileState {
  mtime: number;
  mirrorPath: string; // relative to mirrorWordDir
}

export interface GdocFileState {
  modifiedTime: string;
  name: string;
  mirrorPath: string; // relative to mirrorGdocsDir
}

export interface SyncState {
  lastSync: {
    word: string | null;
    gdocs: string | null;
  };
  wordFiles: Record<string, WordFileState>; // keyed by absolute source path
  gdocFiles: Record<string, GdocFileState>; // keyed by Google Doc file ID
}

const EMPTY: SyncState = {
  lastSync: { word: null, gdocs: null },
  wordFiles: {},
  gdocFiles: {},
};

export async function loadState(stateFile: string): Promise<SyncState> {
  try {
    const raw = await fs.readFile(stateFile, 'utf-8');
    return JSON.parse(raw) as SyncState;
  } catch {
    return structuredClone(EMPTY);
  }
}

export async function saveState(stateFile: string, state: SyncState): Promise<void> {
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
}
