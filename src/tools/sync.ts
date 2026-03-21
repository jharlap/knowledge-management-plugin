import type { Config } from '../config.js';
import { runSync } from '../sync/index.js';

export async function handleSync(config: Config): Promise<string> {
  const summary = await runSync(config);

  const lines: string[] = [];

  if (summary.word) {
    lines.push(`Word docs: ${summary.word.indexed} indexed, ${summary.word.unchanged} unchanged, ${summary.word.removed} removed`);
    for (const e of summary.word.errors) lines.push(`  ⚠ ${e}`);
  }

  if (summary.gdocs) {
    lines.push(`Google Docs: ${summary.gdocs.indexed} indexed, ${summary.gdocs.unchanged} unchanged`);
    for (const e of summary.gdocs.errors) lines.push(`  ⚠ ${e}`);
  } else if (!config.googleDocsEnabled) {
    lines.push(`Google Docs: disabled`);
  }

  if (summary.qmdUpdated) {
    lines.push(`Search index updated.`);
  } else {
    lines.push(`Search index unchanged (no new or removed documents).`);
  }

  for (const e of summary.errors) lines.push(`⚠ ${e}`);

  return lines.join('\n');
}
