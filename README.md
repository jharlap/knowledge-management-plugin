# Knowledge Management Plugin for Claude

Keep notes in the tools you know — Word docs in `~/Documents`, Google Docs in Drive — and let Claude search them without loading everything into context.

The plugin syncs your documents into a local [QMD](https://github.com/tobi/qmd) search index (BM25 + optional semantic search). Claude gets four tools: `sync`, `search`, `get_document`, and `list_sources`.

## Installation

1. Download the latest `.mcpb` file from [Releases](../../releases)
2. Double-click it — Claude Desktop will prompt you to install
3. Fill in the setup form (see Configuration below)
4. **Add the custom instruction below** so Claude automatically uses your knowledge base
5. Ask Claude to `sync` your documents

No Node.js, no npm, no terminal required.

## Required: tell Claude to use your knowledge base

Claude won't automatically search your documents unless you tell it to. Add this to **Settings → Custom Instructions** in Claude Desktop:

> I have a knowledge-management extension that indexes my Word documents and Google Docs. Before answering any question that might be in my notes or documents, search the knowledge base using the search tool. Use list_sources to see what's indexed and mention any available updates. Use sync to refresh the index when asked or when the last sync was more than a day ago. Always search before telling me you don't have information on a topic.

This is a one-time setup step. Once added, Claude will proactively search your documents in every conversation.

## Configuration

The installer will ask for:

| Setting | Description |
|---|---|
| Documents folder | Path to your local Word docs folder (default: `~/Documents`) |
| Sync Google Docs? | `true` or `false` |
| Google Drive folder ID | Optional — restrict to a subfolder. Find it in the Drive URL. Leave empty for all docs. |
| Sync interval (minutes) | How often to re-sync while Claude is running (default: 60) |
### Setting up Google Docs sync

Set **Sync Google Docs?** to `true` in the installer. The first time you sync, a browser window opens asking you to authorize read-only access to your Google Drive — click Allow. That's it. Your authorization is stored locally and renewed automatically.

## Usage

Once installed, just talk to Claude:

- *"Sync my documents"* — picks up new and changed files
- *"Search my notes for the Q4 budget discussion"*
- *"Find the document about the API migration plan"*
- *"What do my notes say about onboarding?"*
- *"Show me the full contents of the project kickoff doc"*

Claude will search the index and retrieve relevant content without you having to specify which file to look in.

## How it works

```
~/Documents/*.docx  ──► pandoc ──► local markdown mirror ──► QMD index
Google Docs (cloud) ──► Drive API ──► pandoc ──────────────► QMD index
                                                                   │
                          Claude search/get tools ◄────────────────┘
```

- **pandoc** (bundled, no install needed) converts Word and Google Docs to clean markdown
- **QMD** indexes the markdown for fast keyword search (BM25) and optional semantic search
- **Incremental sync** — only changed files are re-processed
- **Auto-sync** — the index refreshes automatically when Claude starts, if it's been longer than your configured interval

## Keeping it up to date

The plugin uses [Renovate](https://github.com/apps/renovate) to automatically open pull requests when dependencies update — including the bundled pandoc binary. Merge the PR, the release workflow builds and publishes a new `.mcpb`, and Claude Desktop notifies you of the update.

## Development

See [CLAUDE.md](CLAUDE.md) for architecture notes, local development instructions, and how to add new sync sources.

## License

MIT
