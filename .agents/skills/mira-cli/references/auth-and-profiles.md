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
