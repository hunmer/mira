# Libraries reference

Command group: `libraries` (alias: `lib`).

```bash
libraries list
  --status <active|inactive|error>   # filter by status (omit for all)

libraries get <id>                   # full details of one library

libraries create                     # all flags except desc are typically needed
  -n, --name <name>            # REQUIRED
  -p, --path <path>            # REQUIRED — on-disk directory for the library
  --desc <desc>                # description
  --icon <icon>                # icon identifier
  --plugins-dir <dir>          # custom plugins directory
  --no-hash                    # disable content-hash dedup/check

libraries update <id>
  --name <name>
  --desc <desc>
  --no-hash                    # toggles enableHash off

libraries delete <id>   (alias: rm)

# Lifecycle (per-library service start/stop):
libraries start <id>
libraries stop <id>
libraries restart <id>
```

## Getting a library id

`libraryId` is required by `files`, `tags`, `folders`, `db` commands. Capture it with JSON mode:

```bash
LIBID=$(npx ts-node src/cli.ts --json libraries list \
  | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const a=JSON.parse(s);console.log(a[0]?.id||'')})")
```

The `id` is a string timestamp like `"1786039395985"`.

## Notes

- `create` returns the created library object including its `id` — read that from `--json` output.
- A library must be `active` (started) before its files/tags/db are queryable. Newly created libraries auto-start.
