# Tags & Folders reference

Tags and folders are per-library, parallel CRUD APIs. Both also link files to a tag/folder. All commands take `<libraryId>` first.

## tags

Command group: `tags`.

```bash
tags list <libraryId>                       # all tags (id, title, parent_id, color, file_count)

tags create <libraryId> <title>
  --parent-id <id>     # int — make this a child of another tag
  --color <color>      # int color code
  --desc <desc>

tags update <libraryId> <id>
  --title <title>
  --parent-id <id>     # int
  --color <color>      # int
  --desc <desc>

tags delete <libraryId> <id>    (alias: rm)

# File ↔ tag association
tags file-set <libraryId> <fileId> <tags...>   # tags = names OR ids (server resolves names)
tags file-get <libraryId> <fileId>             # returns the tags attached to a file
```

## folders

Command group: `folders`.

```bash
folders list <libraryId>
  --parent-id <id>     # int — list children of a folder (omit for all)

folders create <libraryId> <title>
  --parent-id <id>     # int — nested folder
  --color <color>      # int
  --desc <desc>

folders update <libraryId> <id>
  --title <title>
  --parent-id <id>     # int
  --color <color>      # int
  --desc <desc>

folders delete <libraryId> <id>    (alias: rm)
  --delete-files       # also delete files inside; omit → only removes the folder container

# File ↔ folder association
folders move <libraryId> <fileId> <folderId>      # assign file to a folder
folders remove <libraryId> <fileId>               # move file to root (no folder)
```

## Notes

- Both `id` and `--parent-id` are integers; pass bare (`tags create L1 "重要" --color 2`).
- `color` is a numeric code, not a CSS string.
- To attach a tag at upload time, use `files upload ... --tag <name>` rather than a separate `tags file-set`.
