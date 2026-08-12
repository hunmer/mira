# Auth & Profiles reference

Credentials file: `~/.mira/credentials.json` (dir `0o700`, file `0o600`).
Structure: `{ "current": "<name>", "profiles": { "<name>": { server, token, username, updatedAt } } }`.

## login

```bash
login [server]                 # server is positional OR via global -s; default http://localhost:8081
  -u, --username <username>    # omit to prompt interactively
  -p, --password <password>    # omit to prompt (hidden input)
  --profile <name>             # profile name to save under (default: "default")
```

Logs in, stores `accessToken` + server into the named profile, sets it current, then prints the verified user info. If the server reports `authRequired: false` (no auth), it still saves a profile with an empty token so subsequent commands target that server.

Server resolution order for `login`: positional `[server]` arg → global `-s/--server` → `http://localhost:8081`.

## logout

```bash
logout
  --profile <name>   # log out a specific profile instead of current
```

Clears the token on the current (or named) profile and calls the server's logout endpoint. Non-blocking: server-side logout failure does not abort the local token clear.

## whoami

```bash
whoami        # prints server + current profile + user info
```

Use to verify a saved token is still valid. Failure with an auth error means the token expired — re-login.

## auth (profile management)

```bash
auth list                         # table of all profiles (* = current); --json gives array
auth use <name>                   # switch current profile
auth add <name>                   # add manually; server/token from global -s/--token or interactive prompt
  -u, --username <username>       # optional username label
auth remove <name>  (alias: rm)   # delete a profile; if it was current, current falls back to another profile
```

`auth add` example using global flags (NOT subcommand flags — see SKILL.md pitfall):

```bash
-s http://localhost:8081 --token <tok> auth add staging -u bob
```

## user reset-password (recovery — no login needed)

```bash
user reset-password
  -u, --username <username>   # default: admin
  -p, --password <password>   # new password; omit to prompt (hidden, with confirm)
  -d, --data-path <path>      # dir containing users.db; default DATA_PATH env or ./data
```

**This command bypasses HTTP/auth entirely** — it opens `users.db` directly, so it works when you cannot log in (forgotten/changed password). It updates the password hash and revokes ALL of that user's sessions (old tokens die immediately). Use it to recover a deployment whose admin password was changed and the new value is unknown:

```bash
mira-app-server user reset-password -u admin -p admin123 -d ~/.mira-data
# then log in normally:
mira-app-server login -u admin -p admin123
```

Data-path resolution mirrors the server (`MiraServer`): `-d` flag → `DATA_PATH` env → `<cwd>/data`. Run it on the server host (it touches the same `users.db` the running server uses; SQLite handles the brief concurrent write).
