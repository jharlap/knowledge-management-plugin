import { createStore } from '@tobilu/qmd';
import type { Config } from '../config.js';

export async function handleSearch(config: Config, query: string, limit = 10): Promise<string> {
  if (!query.trim()) return 'Query cannot be empty.';

  let store;
  try {
    store = await createStore({ dbPath: config.dbPath });
  } catch {
    return 'Search index not found. Run the sync tool first.';
  }

  try {
    const results = await store.search({ query, limit });

    if (results.length === 0) {
      return `No results found for: ${query}`;
    }

    const lines = results.map((r, i) => {
      const score = Math.round(r.score * 100);
      const snippet = r.bestChunk?.trim().replace(/\n+/g, ' ') ?? '';
      return `${i + 1}. **${r.title ?? r.displayPath}** (${score}%)\n   ${r.displayPath}\n   ${snippet}`;
    });

    return lines.join('\n\n');
  } finally {
    await store.close();
  }
}
