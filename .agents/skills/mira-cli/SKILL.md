---
name: mira-cli
description: How to operate a Mira media-library server from the command line via `mira-app-server` CLI (or `npx ts-node packages/mira-app-server/src/cli.ts`). Use whenever the user wants to manage Mira libraries, files, tags, folders, plugins, devices, inspect the database, or check server health/auth WITHOUT hand-writing HTTP calls — login, list, upload, create, delete, etc. Trigger on any mention of "mira server", "mira 库", "mira-cli", managing mira素材库/文件/标签/文件夹/插件/设备, or a request to script/automate mira operations. Prefer this CLI over raw curl/axios whenever a matching subcommand exists.
---

# mira-cli

Operate a running **Mira App Server** through its bundled CLI instead of hand-crafting HTTP requests. The CLI wraps `mira-app-core/shared/sdk` and exposes every server capability (auth, libraries, files, tags, folders, plugins, devices, database, system) as typed subcommands.

## How to invoke

This is a Node CLI. Two equivalent entry points — use whichever the repo state allows:

```bash
# Compiled binary (after `pnpm --filter mira-app-server build`)
node packages/mira-app-server/dist/cli.js <command> [options]

# From source (no build needed; used by the `cli` npm script)
npx ts-node packages/mira-app-server/src/cli.ts <command> [options]
```

When unsure which works, prefer `ts-node` from source — it reflects the current code. The binary `mira-app-server` is also available on PATH if the package is linked/installed globally.

Always confirm the server is up first: `system health` returns `{"status":"ok",...}` when reachable.

## Global options (apply to every command)

| Flag | Purpose |
|------|---------|
| `-s, --server <url>` | Target server. Default `http://localhost:8081`. |
| `--token <token>` | Override the auth token (skip profile lookup). |
| `--profile <name>` | Use a specific saved profile's server+token. |
| `--json` | **Emit raw JSON.** Use this when you (the agent) need to parse output programmatically — it skips the human-readable tables and prints structured data. |

> ⚠️ **Option-name pitfall:** `-s`/`--server` and `--token` are GLOBAL only. Do not pass them as subcommand flags (e.g. `login -s X` silently drops the value because commander routes the global flag away from the subcommand). Put global flags before OR after the full command, e.g. `--json files list <lib>` or `-s http://host files list <lib>`.

## Auth & credentials (read this before any data command)

Credentials persist to `~/.mira/credentials.json` as **named profiles**. One profile is "current" at a time; data commands auto-use the current profile's server+token.

```bash
# Login (creates/updates the "default" profile). -u/-p optional; prompts if omitted.
npx ts-node src/cli.ts login -u admin -p admin123 -s http://localhost:8081
# Login to a DIFFERENT server under a named profile, then switch to it:
npx ts-node src/cli.ts login -u alice -p pw -s http://other-host:8081 --profile prod
npx ts-node src/cli.ts auth use prod

# Manage profiles
auth list            # show all profiles, * marks current
auth add <name>      # manual add (server/token via global -s/--token or interactive)
auth use <name>      # switch current
auth remove <name>   # delete

whoami               # show current logged-in user (verifies token still valid)
logout               # clear current profile's token (stays logged-out until next login)
```

**First-run:** a fresh server auto-creates admin `admin` / password `admin123` (printed in server logs). Log in with those once, then change credentials if needed.

**When a command fails with `❌ 未登录`** → run `login` first.
**When it fails with a network/auth error on a known-good token** → the token expired or the server restarted; re-login.

## Output conventions (important for agents)

- **Default = human-readable tables / key-value.** Good for showing the user.
- **`--json` = structured JSON.** Use whenever you will parse the result to make a downstream decision. Error responses in JSON mode look like `{"ok": false, "error": "..."}`.
- Success messages (`✅ ...`) are suppressed in `--json` mode to keep output clean — only the data object is printed.

## Typical agent workflow

1. `system health` — confirm server reachable.
2. `login -u <u> -p <p> -s <server>` — authenticate once (persists).
3. Capture a `libraryId` with `--json libraries list`, then pipe to the operation you need (`files list <id>`, `tags list <id>`, …). Most data commands take `libraryId` as the first positional arg.
4. When scripting multiple steps, pass `--json` and parse; when showing the user a result, omit it for a readable table.

## MCP server mode (`--mcp`)

The same binary also runs as a **Model Context Protocol server** over stdio, exposing the full SDK as 50 tools an MCP client (Claude, other agents) can call directly. This is the preferred integration when an agent connects to Mira programmatically rather than shelling out to CLI subcommands.

```bash
# Start the MCP server (stdio transport). Connects to the default server or -s override.
node packages/mira-app-server/dist/cli.js --mcp [-s http://host:8081] [--token <tok>] [--debug]
```

- **Tool naming**: `<module>_<action>` — e.g. `libraries_list`, `files_upload`, `tags_create`, `db_tables`, `system_health`, `auth_login`. One-to-one with CLI subcommands.
- **Auth model is identical to the CLI**: tools reuse the current profile's token. Before any data tool, either (a) pre-run `mira-app-server login` so a profile exists, or (b) call the `auth_login` tool first — it saves the credential and immediately makes subsequent tools work.
- **No-auth tools**: `system_health`, `system_info` work without login.
- **Error convention**: failures return `{ isError: true, content: [{type:'text', text: message}] }`. An "未登录" error means call `auth_login` first.
- **stdout is sacred**: in `--mcp` mode the server writes ONLY JSON-RPC to stdout; all logs go to stderr (`--debug` enables `[mira-mcp]` diagnostics). Do not expect human-readable output.
- **`files_upload`** takes a `paths` array of LOCAL file paths (the server reads & streams them); `files_download` writes to `output` (or CWD) and returns `{savedTo, bytes}`.

When choosing between CLI subcommand vs MCP tool: MCP is for agent clients speaking the protocol; CLI subcommands are for shell/one-shot use. The capabilities are the same.

## Command reference

Every module's full subcommand list + flags is in `references/`. Read the relevant file when you need exact syntax for a module:

- [`references/auth-and-profiles.md`](references/auth-and-profiles.md) — login, logout, whoami, auth profile management
- [`references/libraries.md`](references/libraries.md) — library CRUD + start/stop/restart
- [`references/files.md`](references/files.md) — upload/download/list/rename/delete/restore + filters
- [`references/tags-folders.md`](references/tags-folders.md) — tags & folders CRUD + file associations
- [`references/plugins-devices-db-system.md`](references/plugins-devices-db-system.md) — plugins, devices, database inspection, system info

If a user's need maps cleanly to one subcommand, run it directly — do not reinvent the HTTP call. Only fall back to raw `curl`/SDK calls when no subcommand covers the operation.

## Notes & gotchas

- **`files upload` reads local paths** and streams them as multipart — pass one or more `<filePath...>`. Works in Node (the CLI handles the `FormData`/`Blob` construction; you do not need a browser `File` object).
- **`files delete` defaults to recycle-bin.** Add `--permanent` to truly delete.
- **`db` commands require a `<libraryId>`** — each library has its own SQLite database.
- **Numeric IDs** (tag/folder/file ids) are parsed as integers by the CLI; pass them bare (`tags delete <lib> 3`).
- **`files update` / `devices send`** take a JSON *string* argument — quote it: `files update <lib> <id> '{"website":"..."}'`.
- The CLI never edits the server source or the SDK — it is a thin client. If a command returns a surprising shape, check the SDK module in `packages/mira-app-core/src/shared/sdk/modules/`.
