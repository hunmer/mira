# Plugins, Devices, Database, System reference

## plugins

Command group: `plugins`.

```bash
plugins list
  --library <id>       # filter by library
  --category <cat>     # filter by category
  --status <active|inactive>

plugins install <name> <libraryId>
  --version <version>  # omit for "latest"

plugins enable <id>
plugins disable <id>
plugins uninstall <id>     (alias: rm)
plugins search <query>     # matches name/description/author/tags
```

Plugin `id` returned by `list` is the library id it belongs to (a plugin is scoped to a library). `search` returns an empty result when nothing matches — that is not an error.

## devices

Command group: `devices`. Connections are WebSocket clients attached to a library.

```bash
devices list
  --library <id>       # only devices for one library

devices stats          # { totalLibraries, totalConnections, libraryStats }
devices disconnect <clientId> <libraryId>
devices send <clientId> <libraryId> <message>     # message = JSON STRING (or plain text)
#   e.g. devices send c1 L1 '{"action":"reload"}'
```

`devices list` flattens the per-library map into one table of `clientId, libraryId, status, ipAddress, lastActivity`.

## db (database inspection)

Command group: `db`. **Every subcommand needs `<libraryId>`** — each library has its own SQLite DB.

```bash
db tables <libraryId>           # table name + row count
db schema <libraryId> <table>   # columns: name, type, notnull, pk, dflt_value
db data <libraryId> <table>
  --limit <n>                   # int — cap rows shown
db info <libraryId>             # name + rowCount summary
```

Common tables: `files`, `folders`, `tags`, plus internal ones. `db data` prints the raw rows as JSON (use `--json` for structured output; default already prints JSON for row data since it has no tabular formatter).

> Note: these commands are read-only. There is no CLI path for writing SQL — for that you'd use the server directly. If a user asks to modify DB rows, tell them the CLI only supports inspection.

## system

Command group: `system`. These do **not** require auth (use anonymous client).

```bash
system health        # /api/health — status, uptime, version, authRequired, allowRegistration
system info          # version, nodeVersion, environment, uptime
system uptime        # human-readable uptime (e.g. "1小时23分钟")
```

There is also a legacy top-level `health` command (curls `http://localhost:<port>/health` directly) kept for backward compatibility — prefer `system health` which goes through the SDK.
