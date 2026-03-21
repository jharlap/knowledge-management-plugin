# CLAUDE.md — Knowledge Management Plugin

## What this is

A Claude Desktop Extension (.mcpb) that syncs Word documents from `~/Documents` and Google Docs into a local [QMD](https://github.com/tobi/qmd) search index. Claude can then search and retrieve relevant content without loading full files into context.

## Architecture

```
~/Documents/*.docx  ──► pandoc ──► ~/.local/share/km/mirror/word/*.md ──► QMD index
Google Docs (cloud) ──► googleapis (export as docx) ──► pandoc ──► mirror/gdocs/*.md ──┘
                                                                              │
Claude ◄──────────────────────── MCP tools (search, get, sync) ─────────────┘
```

**Key design decisions:**
- Google Docs are exported as `.docx` then converted by pandoc — same pipeline as local Word docs, consistent output quality
- pandoc binaries (arm64 + x86_64) are bundled inside the `.mcpb` so users need no system tools
- QMD handles BM25 keyword search; `store.embed()` adds semantic search but downloads ~2GB of models, so it's attempted but failures are silently ignored
- Sync state (file mtimes, Google modifiedTime) is persisted in `~/.local/share/km/state.json` so re-runs are incremental
- The MCP server auto-syncs on startup if the index is stale (older than `syncIntervalMinutes`)
- `node dist/index.js sync` is a standalone CLI mode for running via a LaunchAgent cron

## Project structure

```
src/
  index.ts          Entry point — CLI sync mode or MCP server mode
  config.ts         Typed config from env vars (injected by .mcpb runtime)
  auth/
    google.ts       OAuth2 browser loopback flow — spins up local HTTP server,
                    opens browser, catches callback, saves token to disk
  sync/
    state.ts        Load/save sync state (mtimes, modifiedTimes)
    word.ts         Walk documentsPath for .docx, run pandoc, update mirror
    gdocs.ts        List Drive files, export as docx, run pandoc, update mirror
    index.ts        Orchestrate word + gdocs sync, then qmd update/embed
  tools/
    sync.ts         MCP tool: trigger sync, return human-readable summary
    search.ts       MCP tool: qmd search wrapper
    get.ts          MCP tool: qmd get wrapper
    sources.ts      MCP tool: show config + last sync times

manifest.json       .mcpb manifest — user_config schema, env var mapping
versions.json       Pinned binary versions (pandoc) — updated by Renovate
renovate.json       Renovate config — tracks npm packages + pandoc GitHub releases
.github/workflows/
  ci.yml            Type-check + smoke test on every PR
  release.yml       Download pandoc binaries, pack .mcpb, publish GitHub Release on v* tags
```

## Data directory

Everything lives under `~/.local/share/knowledge-management/`:

```
state.json          Sync state (file mtimes, google modifiedTimes)
index.sqlite        QMD search index
tokens/
  google.json       Google OAuth tokens (access + refresh)
mirror/
  word/             Markdown mirror of Word docs (relative paths preserved)
  gdocs/            Markdown mirror of Google Docs ({id}-{name}.md)
```

## Running locally

```bash
npm install
npm run build

# Run as MCP server (reads env vars for config)
KM_DOCUMENTS_PATH=~/Documents node dist/index.js

# Run a one-shot sync
KM_DOCUMENTS_PATH=~/Documents node dist/index.js sync

# With Google Docs
KM_GOOGLE_DOCS_ENABLED=true \
KM_GOOGLE_CLIENT_ID=your-client-id \
KM_GOOGLE_CLIENT_SECRET=your-client-secret \
node dist/index.js sync
```

## Releasing

Push a tag to trigger the release workflow:

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions downloads the pandoc binaries specified in `versions.json`, packs everything into a `.mcpb`, and creates a GitHub Release. Users download the `.mcpb` and double-click to install.

## Dependency updates

Renovate is configured to:
- Auto-merge patch + minor npm updates
- Open PRs for major npm bumps
- Track pandoc GitHub releases via `versions.json` and open PRs when new versions ship

Enable Renovate on this repo at [https://github.com/apps/renovate](https://github.com/apps/renovate).

## Adding a new sync source

1. Create `src/sync/newsource.ts` following the pattern of `word.ts` — accept `Config` and `SyncState`, write markdown to a mirror directory, update state
2. Add the mirror directory to `Config` in `config.ts`
3. Call it from `src/sync/index.ts`
4. Add the new collection to the `createStore` config in `src/sync/index.ts`
5. Add any new user_config fields to `manifest.json`
