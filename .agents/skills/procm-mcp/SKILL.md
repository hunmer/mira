---
name: procm-mcp
description: HTTP API fallback for procm-mcp when the MCP server/tools are unavailable (not connected, tools missing, or transport error). Use whenever the agent needs to start/stop/restart a local background process, read or grep its stdout/stderr logs, send stdin input or a signal (Ctrl+C = SIGINT), or run commands from a project's procm-commands.json — AND the procm-mcp MCP tools are NOT working, so the same operations must be done over plain HTTP (or the `procm-mcp` CLI). Covers endpoint paths, request/response shapes, port & token discovery, and error codes.
---

# procm-mcp (HTTP fallback)

procm-mcp normally exposes its process manager as MCP tools (`start-process`,
`process`, `process-logs`, `process-input`, `procm-command`). **This skill is
the fallback for when those tools are not available** — the MCP server won't
connect, the `mcp__procm-mcp__*` tools don't appear, a tool call times out, or
the editor's MCP integration is broken. Every operation the tools do is also
exposed as a plain localhost HTTP API, and the same backend ships a `procm-mcp`
CLI that wraps it. Use either to keep working while MCP is down.

## When to use this skill

Reach for this skill when you would normally call a procm-mcp MCP tool but
cannot. Concretely:

- the `mcp__procm-mcp__*` tools are missing from the tool list, **or**
- a tool call fails with a connection / transport / timeout error, **or**
- the user says "MCP isn't working" / "use HTTP instead" / "the server won't connect".

If the MCP tools work, prefer them — they're the primary path. This skill is
the backup.

## Prerequisites: find a live backend

The HTTP API is served by a `procm-mcp` backend process. It must already be
running — this skill does not start it.

- **Host/port:** bound to `http://127.0.0.1:<port>`. Port comes from
  `--port <n>`, else `PROCM_HTTP_PORT`, else **7331**. There is no port-file
  discovery — if the port is unknown, try 7331, then ask the user.
- **Auth (optional):** if the backend was started with `PROCM_HTTP_TOKEN` set,
  every request must carry `Authorization: Bearer <token>`. Token is unknown to
  the agent; the user must supply it.
- **Liveness check** — one request tells you if it's up and which port works:

```bash
curl -s http://127.0.0.1:7331/api/processes        # add -H "Authorization: Bearer $T" if token-protected
```

Non-2xx / connection refused → backend not on that port. A 200 JSON body with
`serverId`/`pid` → you're in. The `procm-mcp ping` CLI does the same check.

> **Note:** a stdio-MCP backend only serves HTTP if `PROCM_HTTP_PORT` was set
> (dashboard is optional in that mode). A `procm-mcp --server` backend always
> serves HTTP. If you cannot find any live port, the fallback is unavailable —
> tell the user to start one: `procm-mcp --server` (or set `PROCM_HTTP_PORT`
> for the MCP backend).

## Endpoint reference

All paths are under `/api`. `:id` is a process id (8-char nanoid, stable across
restarts). Bodies are JSON; `Content-Type: application/json` on writes.

### Process lifecycle

| Operation | Method + path | Body / query | Success |
|---|---|---|---|
| **List** (live + history) | `GET /api/processes` | — | `{ serverId, pid, processes: [...] }` |
| **Start** | `POST /api/processes` | `{ script, cwd, args?, name?, envs?, desc? }` | `201 { id, name }` |
| **Get one** (live only) | `GET /api/processes/:id` | — | `200` process view |
| **Stop, keep record** | `POST /api/processes/:id/stop` | `{}` | `200 { id, stopped: true }` |
| **Restart** | `POST /api/processes/:id/restart` | `{}` | `200 { id, restarted: true }` |
| **Delete** (stop + erase) | `DELETE /api/processes/:id` | — | `200 { id, deleted: true }` |
| **Bulk delete** | `DELETE /api/processes` | `{ ids?: string[] }` (omit = all) | `200 { deleted, notFound }` |

Process view fields: `id, name, script, args, cwd, status, pid, exitCode,
error, desc, startedAt, lastStartedAt, stoppedAt`. Status is one of
`spawning | running | exited | error`.

**Start validation (returns 400 otherwise):**

- `script` and `cwd` are both required and must be non-empty.
- `script` cannot contain spaces — split into `script` + `args`.
- `script` cannot contain `=` — put env vars in `envs: { KEY: "value" }`,
  not as `KEY=value` prefixes.

### Logs

| Operation | Method + path | Query |
|---|---|---|
| **Tail** recent | `GET /api/processes/:id/logs` | `stream=stdout\|stderr` (default stdout), `count` (default 200) |
| **Grep** | `GET /api/processes/:id/logs` | `grep=<regex>`, `stream` (optional; omit = both), `count` (default 50), `ignoreCase=1` |

Returns `{ stream, text }` where each line is `[ISO] message`. Invalid grep
regex → `400 { error }`. Logs resolve live **or** persisted record, so a
stopped/expired process's logs are still readable.

Related (less common): `GET /api/processes/:id/log-files` (on-disk paths),
`GET /api/processes/:id/log-download` (merged file as attachment),
`GET /api/processes/:id/command` (paste-and-run reproduction of the launch).

### Input (stdin / signal) — `process-input` equivalent

`POST /api/processes/:id/input` — body is **one of**:

```jsonc
// write text to the process's stdin
{ "text": "y", "newline": true }     // newline defaults to true; set false for raw bytes

// deliver an OS signal
{ "signal": "SIGINT" }               // Ctrl+C
```

- `text` and `signal` are **mutually exclusive** — both → `400`.
- Allowed signals: `SIGINT SIGTERM SIGKILL SIGHUP SIGUSR1 SIGUSR2 SIGTSTP
  SIGCONT SIGQUIT`. Anything else → `400`.
- **Ctrl+C is `SIGINT`, not a `\x03` byte** — piped stdio has no TTY, so a raw
  control byte is usually ignored. Use the signal.
- Responses: `200 { ok: true, kind: "text", bytes }` /
  `200 { ok: true, kind: "signal", signal }`. Failures: `404` (unknown id) or
  `400` (no writable stdin / bad args / signal error) with `{ error }`.

### Misc endpoints

| Path | Purpose |
|---|---|
| `GET /api/meta` | `{ serverId, pid, cwd, startedAt }` — backend metadata |
| `POST /api/favorites/scan` `{ path }` | Scan a folder for project launch commands |
| `POST /api/open-folder` `{ path }` | Reveal a folder in the OS file manager |

> The `procm-command` MCP tool (start commands from `procm-commands.json` by
> name) has **no dedicated HTTP endpoint**. Its equivalent over HTTP is to read
> `procm-commands.json` yourself and `POST /api/processes` with the matched
> entry's `script/args/cwd/envs`. Set `name` to the command's key so it lines
> up with how `procm-command` would have named it.

## Copy-paste request patterns

The agent can issue these directly with `curl`/`fetch`. Replace `$PORT`,
`$ID`, `$T` (token, only if needed).

```bash
# 0. reachability + token check
curl -s http://127.0.0.1:$PORT/api/processes ${T:+-H "Authorization: Bearer $T"}

# 1. start a process (capture the returned id)
curl -s -X POST http://127.0.0.1:$PORT/api/processes ${T:+-H "Authorization: Bearer $T"} \
  -H "Content-Type: application/json" \
  -d '{"script":"npm","args":["run","dev"],"cwd":"G:/myapp","name":"dev"}'

# 2. tail logs
curl -s "http://127.0.0.1:$PORT/api/processes/$ID/logs?stream=stdout&count=200" ${T:+-H "Authorization: Bearer $T}"

# 3. grep both streams, case-insensitive
curl -s "http://127.0.0.1:$PORT/api/processes/$ID/logs?grep=error&ignoreCase=1&count=50" ${T:+-H "Authorization: Bearer $T"}

# 4. answer an interactive prompt (stdin)
curl -s -X POST "http://127.0.0.1:$PORT/api/processes/$ID/input" ${T:+-H "Authorization: Bearer $T"} \
  -H "Content-Type: application/json" -d '{"text":"y"}'

# 5. Ctrl+C (SIGINT)
curl -s -X POST "http://127.0.0.1:$PORT/api/processes/$ID/input" ${T:+-H "Authorization: Bearer $T"} \
  -H "Content-Type: application/json" -d '{"signal":"SIGINT"}'

# 6. stop but keep the history record
curl -s -X POST "http://127.0.0.1:$PORT/api/processes/$ID/stop" ${T:+-H "Authorization: Bearer $T"} -d '{}'

# 7. restart (keeps the id)
curl -s -X POST "http://127.0.0.1:$PORT/api/processes/$ID/restart" ${T:+-H "Authorization: Bearer $T"} -d '{}'

# 8. delete (stop + erase record)
curl -s -X DELETE "http://127.0.0.1:$PORT/api/processes/$ID" ${T:+-H "Authorization: Bearer $T"}
```

## CLI alternative

If `procm-mcp` is on PATH, the CLI is a thinner way to hit the same API. It's
often faster for one-off checks than building a `fetch`. Default port 7331;
override with `--port` or `PROCM_HTTP_PORT`; token via `--token` or
`PROCM_HTTP_TOKEN`.

```
procm-mcp ping                                    reachability check
procm-mcp ps                                      list processes
procm-mcp info <id>                               details
procm-mcp logs <id> [--stream stdout|stderr] [-n 200]
procm-mcp grep <id> <pattern> [--stream s] [-n 50] [-i]
procm-mcp start <script> [args...] [--cwd <dir>] [--name <n>] [--env KEY=VAL ...]
procm-mcp restart <id>
procm-mcp stop <id>                               stop + delete
```

> The CLI has **no** `input` subcommand — for stdin/signal, use the HTTP
> `POST /api/processes/:id/input` endpoint directly (step 4/5 above).

## Error codes

| Status | Meaning | Typical cause |
|---|---|---|
| `200` | success | — |
| `201` | created | `POST /api/processes` start |
| `400` | bad request | script validation failed; `input` got both/neither text+signal; bad signal name; no writable stdin |
| `401` | unauthorized | token required but missing/wrong (`Authorization: Bearer`) |
| `404` | not found | unknown id; or live-only op (`GET /:id`, `stop`) on a stopped process |
| `405` | method not allowed | wrong verb on a known path (e.g. GET on `/stop`) |
| `500` | server error | unexpected — check backend logs |

Connection refused / `ECONNREFUSED` / fetch-failed → no backend on that port.

## Fallback decision tree

1. A procm-mcp operation is needed.
2. Are the `mcp__procm-mcp__*` tools present **and** do they respond? → use them; skip this skill.
3. Otherwise, is a backend reachable? `curl http://127.0.0.1:7331/api/processes`
   - no → ask the user to run `procm-mcp --server` (or report the port); stop.
   - yes → use the HTTP endpoints above (or the CLI for non-input ops).
4. Once MCP is restored, switch back to the tools — they're the primary path.

## Source of truth

- HTTP routes + request/response shapes: `src/http-server.ts` (the request
  handler; the `apiMatch` regex lists every `:id/:action`).
- Backend modes, port & token resolution, signal handlers: `src/index.ts`.
- Process lifecycle / stdin / signals / signal whitelist:
  `src/process-manager.ts` (`sendProcessInput`, `startProcess`,
  `restartProcess`, `ALLOWED_INPUT_SIGNALS`).
- CLI wrapper over the same API: `src/cli-client.ts`.
- Data dir (per-server logs + global `processes.json`): `os.tmpdir()/procm-mcp/`
  — see `src/procm-mcp-dir.ts`.

When this doc and the source disagree, **the source is right** — read the
relevant file before trusting the prose here.
