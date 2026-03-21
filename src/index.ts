import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from './config.js';
import { loadState } from './sync/state.js';
import { runSync, isSyncStale } from './sync/index.js';
import { handleSync } from './tools/sync.js';
import { handleSearch } from './tools/search.js';
import { handleGet } from './tools/get.js';
import { handleListSources } from './tools/sources.js';

const config = loadConfig();

// CLI mode: `node dist/index.js sync` — used by LaunchAgent / manual runs
if (process.argv[2] === 'sync') {
  const summary = await runSync(config);
  const errors = [
    ...(summary.word?.errors ?? []),
    ...(summary.gdocs?.errors ?? []),
    ...summary.errors,
  ];
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  process.exit(0);
}

// MCP server mode
const server = new Server(
  { name: 'knowledge-management', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'sync',
      description: 'Sync Word documents and Google Docs into the local search index. Run this to pick up new or updated files.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'search',
      description: 'Search across all indexed documents. Use this to find notes, docs, or meeting transcripts without loading full files.',
      inputSchema: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', description: 'Natural language or keyword query' },
          limit: { type: 'number', description: 'Maximum results to return (default: 10)' },
        },
      },
    },
    {
      name: 'get_document',
      description: 'Retrieve the full content of a document by its path or docid (e.g. #abc123 from search results).',
      inputSchema: {
        type: 'object',
        required: ['ref'],
        properties: {
          ref: { type: 'string', description: 'Document path or docid' },
        },
      },
    },
    {
      name: 'list_sources',
      description: 'Show configured sources, how many documents are indexed, and when they were last synced.',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let text: string;

    switch (name) {
      case 'sync':
        text = await handleSync(config);
        break;

      case 'search': {
        const query = String((args as Record<string, unknown>)?.query ?? '');
        const limit = Number((args as Record<string, unknown>)?.limit ?? 10);
        text = await handleSearch(config, query, limit);
        break;
      }

      case 'get_document': {
        const ref = String((args as Record<string, unknown>)?.ref ?? '');
        text = await handleGet(config, ref);
        break;
      }

      case 'list_sources':
        text = await handleListSources(config);
        break;

      default:
        text = `Unknown tool: ${name}`;
    }

    return { content: [{ type: 'text', text }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
  }
});

// Auto-sync on startup if the index is stale
const state = await loadState(config.stateFile);
if (isSyncStale(config, state)) {
  // Fire and forget — don't block server startup
  runSync(config).catch((err) =>
    console.error('[knowledge-management] Background sync failed:', err),
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
