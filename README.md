# Knowledge Management Plugin for Claude

Keep notes in the tools you know — Word docs in `~/Documents`, Google Docs in Drive — and let Claude search them without loading everything into context.

The plugin syncs your documents into a local [QMD](https://github.com/tobi/qmd) search index (BM25 + optional semantic search). Claude gets four tools: `sync`, `search`, `get_document`, and `list_sources`.

## Installation

1. Download the latest `.mcpb` file from [Releases](../../releases)
2. Double-click it — Claude Desktop will prompt you to install
3. Fill in the setup form (see Configuration below)
4. Ask Claude to `sync` your documents

No Node.js, no npm, no terminal required.

## Configuration

The installer will ask for:

| Setting | Description |
|---|---|
| Documents folder | Path to your local Word docs folder (default: `~/Documents`) |
| Sync Google Docs? | `true` or `false` |
| Google Drive folder ID | Optional — restrict to a subfolder. Find it in the Drive URL. Leave empty for all docs. |
| Sync interval (minutes) | How often to re-sync while Claude is running (default: 60) |
| Google OAuth Client ID | From your Google Cloud project (see below) |
| Google OAuth Client Secret | From your Google Cloud project |

### Setting up Google Docs sync

You'll need a free Google Cloud project with your own OAuth credentials. This takes about 5 minutes and means Google Drive access is authorized directly between you and Google — no third-party app involved.

**Step 1 — Create a project**

Open [console.cloud.google.com/projectcreate](https://console.cloud.google.com/projectcreate), give it any name (e.g. "My Knowledge Plugin"), click **Create**.

**Step 2 — Enable the Drive API**

With your new project selected, open [console.cloud.google.com/apis/library/drive.googleapis.com](https://console.cloud.google.com/apis/library/drive.googleapis.com) and click **Enable**.

**Step 3 — Configure the OAuth consent screen**

Go to [console.cloud.google.com/apis/credentials/consent](https://console.cloud.google.com/apis/credentials/consent):
- User type: **External**
- App name: anything (e.g. "Knowledge Plugin")
- Add your email as a **Test user** (under "Test users" → Add users)
- Save and continue through the remaining screens

**Step 4 — Create credentials**

Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials):
- Click **Create Credentials** → **OAuth client ID**
- Application type: **Desktop app**
- Click **Create**
- Copy the **Client ID** and **Client Secret**

Paste these into the plugin's configuration fields. The first time you sync Google Docs, a browser window will open asking you to authorize access. After that it's automatic.

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
