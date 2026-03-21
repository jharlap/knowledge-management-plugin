import { createStore } from '@tobilu/qmd';
import type { Config } from '../config.js';

export async function handleGet(config: Config, docRef: string): Promise<string> {
  if (!docRef.trim()) return 'Document reference cannot be empty.';

  let store;
  try {
    store = await createStore({ dbPath: config.dbPath });
  } catch {
    return 'Search index not found. Run the sync tool first.';
  }

  try {
    const result = await store.get(docRef);

    if ('error' in result) {
      let msg = `Document not found: ${docRef}`;
      if (result.similarFiles && result.similarFiles.length > 0) {
        msg += `\n\nDid you mean:\n${result.similarFiles.map(f => `  - ${f}`).join('\n')}`;
      }
      return msg;
    }

    const lines = [`# ${result.title ?? result.displayPath}`, `*${result.displayPath}*`, ''];
    if (result.context) lines.push(`> ${result.context}`, '');
    lines.push(result.body ?? '(empty document)');

    return lines.join('\n');
  } finally {
    await store.close();
  }
}
