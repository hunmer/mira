# Files reference

Command group: `files`. All commands take `<libraryId>` as the first positional argument.

## list

```bash
files list <libraryId>
  --title <title>      # fuzzy match on file name/title
  --ext <extension>    # e.g. --ext mp4
  --tag <tag>          # repeatable: --tag 3 --tag 重要
  --folder-id <id>     # filter to a folder
  --limit <n>          # int
  --offset <n>         # int (for pagination)
```

Server returns `{ result, limit, offset, total }`; the CLI flattens to the row array for output. Rows expose `id, title(name), extension, size, tags, folder_id`.

## get

```bash
files get <libraryId> <fileId>     # full metadata of one file
```

## upload

```bash
files upload <libraryId> <paths...>     # one or more LOCAL file paths
  --tag <tag>        # repeatable — adds tags to every uploaded file
  --folder-id <id>   # put uploaded files into this folder
```

Reads each local file and streams multipart. Works in Node (no browser `File`/`FileList` needed). Response includes per-file results with the new `id`:

```json
{ "results": [ { "success": true, "file": "<serverPath>", "result": { "id": 1, ... } } ] }
```

## download

```bash
files download <libraryId> <fileId>
  -o, --output <path>   # destination; omit → uses the file's original name in CWD
```

## rename / update

```bash
files rename <libraryId> <fileId> <name>             # new file name; 409 if a same-name file exists in the folder
files update <libraryId> <fileId> <json>             # json = JSON STRING, arbitrary metadata
#   e.g. files update L1 1 '{"website":"https://example.com"}'
```

## delete / restore / empty-trash

```bash
files delete <libraryId> <fileId>    (alias: rm)
  --permanent          # omit → moves to recycle bin; with it → hard delete

files restore <libraryId> <fileId>          # restore from recycle bin
files empty-trash <libraryId>               # permanently delete all recycled files in the library
```

## Notes

- `fileId` may be numeric; pass it bare.
- Tags passed to `upload --tag` or `tags file-set` may be tag **names or IDs** — the server resolves names to IDs.
- File `size` is in bytes.
