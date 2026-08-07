# Design: Circular Icon Picker for Folders & Tags

**Date:** 2026-08-07
**Status:** Approved
**Scope:** Add a reusable circular icon picker with a searchable, paginated popover listing all Material Icons; integrate it into `FolderEditDialog` so folders and tags can have custom icons; render those icons in `FolderTreeComponent`; wire the selected icon end-to-end through the SDK to the SQLite storage layer.

## Goals

- Reusable `IconPicker.vue` component: a round button that opens a popover with the full Material Icons set, searchable and paginated.
- Folders and tags can pick a custom icon in `FolderEditDialog`.
- Selected icons persist and render in the folder/tag tree.
- Minimal, low-risk changes; follow existing patterns (shadcn-vue Popover, Material Icons font, object-spread SDK passthrough).

## Non-Goals

- Custom (user-uploaded) icon images.
- Multiple icon fonts/variants beyond the existing `material-icons` (filled) family.
- Bulk icon assignment; icon is a per-item property.

## Background & Key Findings

- **UI primitives** live at `packages/mira-client/src/components/ui/` (imported via `@/components/ui/<name>`). `Popover`, `PopoverTrigger`, `PopoverContent`, `Input`, `Button` all exist. There is intentionally **no `scroll-area`** — use native `overflow-y-auto`.
- **Material Icons font** (`material-icons`, filled variant) is loaded from `assets/fonts/fonts.css` via `index.html`. Standard usage: `<span class="material-icons">name</span>`. The font ligatures cannot be enumerated at runtime, so the icon name list must be shipped as data.
- **No existing IconPicker** in the codebase.
- **`folders.icon` is already fully wired** at the storage layer: `icon TEXT` column in `folders` (`LibraryServerDataSQLite.ts:67`); present in `FolderOperations.ts` INSERT (line 8), UPDATE (line 35 `addField('icon', ...)`), and SELECTs (`SELECT *`). `FolderTreeComponent.vue` already reads `node.icon || defaultIcon`. **Only SDK DTOs and the client write path are missing.**
- **`tags.icon` is a dead `INTEGER` column** (`LibraryServerDataSQLite.ts:79`); `TagOperations.ts` already references `icon` in INSERT/UPDATE/SELECT, but nothing consumes it. Needs a type change to `TEXT` for new libraries; existing libraries keep the column (SQLite flexible typing tolerates storing a name string).
- **Routers/handlers pass request body through via object-spread** (`BaseRouter.handleCrudOperation`), so adding an `icon` field needs **no router/handler changes**.
- **DTO mapping** is a generic passthrough (`rowToMap`), so `icon` already flows out of the DB unchanged.

## Architecture

### 1. Icon data source
Ship a static, canonical list of Material Icons ligature names as `packages/mira-client/src/renderer/data/material-icons.json` (~2,000 names, ~30–40 KB). Loaded once and cached in a module-level constant. This is the standard dependency-free way to enumerate a font whose names are not runtime-queryable.

### 2. `IconPicker.vue` — new component
Location: `packages/mira-client/src/renderer/components/business/IconPicker.vue`.

- **Trigger:** circular button (`w-10 h-10 rounded-full`, glass style consistent with existing dialogs) showing the currently-selected icon (or `defaultIcon` when none chosen).
- **Props:** `modelValue: string` (the selected icon name; empty string = "use default"); `defaultIcon?: string` (fallback when `modelValue` is empty).
- **Emits:** `update:modelValue`.
- **Popover** (`Popover`/`PopoverTrigger`/`PopoverContent` from `@/components/ui/popover`):
  - Sticky search `Input` at the top → client-side, case-insensitive substring filter over the bundled list.
  - Responsive grid of icon buttons, **paginated** (e.g. 72 per page) with simple pagination controls (prev/next + page indicator). Never renders all ~2,000 at once. Searching resets to page 1.
  - Clicking an icon → emit value, close popover. A "Use default" affordance clears the custom icon (`update:modelValue('')`).
- **Behavior:** the popover manages its own open state internally; selecting an icon or pressing Escape/outside closes it.

### 3. `FolderEditDialog.vue` integration
- Add an "Icon" row (label `图标`) containing `IconPicker` bound to a new `formData.icon`, with `defaultIcon` = `tag` → `'label'`, `folder` → `'folder'`.
- Add `icon` to `formData`, the `resetForm()` path (reset to `''`), and the edit-population path (read `folderData.icon`).
- Extend the `save` emit payload type to include `icon?: string` (empty string = keep default / do not send).

### 4. End-to-end wiring
- **`useFolderOperations.ts`** (`FolderTreeComponent/composables/useFolderOperations.ts`): add `icon?` to the `handleItemSave` data type; forward `icon` to `miraSDKService.createFolder`/`updateFolder` (folder path) and to the equivalent tag create/update calls (omit when empty).
- **`MiraSDKService.ts`** (`renderer/services/MiraSDKService.ts`): add `icon` param to `createFolder`/`updateFolder` and to tag create/update methods; pass through to the SDK module calls.
- **SDK types** (`packages/mira-app-core/src/shared/sdk/modules/`):
  - `FolderModule.ts`: add `icon?: string` to `Folder`, `CreateFolderRequest`, `UpdateFolderRequest`; update convenience `createFolder`/`updateFolder` signatures.
  - `TagModule.ts`: add `icon?: string` to `Tag`, `CreateTagRequest`, `UpdateTagRequest`; update convenience signatures.
  - Mirror the same additions in `packages/mira-app-core/src/shared/sdk/types.ts`.
- **Routers/handlers:** no change (object-spread passthrough).
- **Tag schema** (`packages/mira-app-core/src/storage/sqlite/LibraryServerDataSQLite.ts`): change `icon INTEGER` → `icon TEXT` in the `CREATE TABLE` for new libraries. Existing libraries already have the column; SQLite flexible typing tolerates storing a name string. No query change (`TagOperations.ts` already references `icon`).

### 5. `FolderTreeComponent.vue` display
- **Folders:** already render `node.icon || defaultIcon` — no change once `icon` flows through.
- **Tags:** `convertTagsToNodes` hardcodes `icon: 'label'`; change to `icon: t.icon || 'label'` so custom tag icons render.

## Data Flow

```
IconPicker (emit update:modelValue) → FolderEditDialog.formData.icon
  → emit('save', { ..., icon }) → useFolderOperations.handleItemSave
  → miraSDKService.createFolder/updateFolder (or tag equivalents)
  → FolderModule/TagModule.create/update (HTTP body)
  → FolderRouter/TagRouter → BaseRouter.handleCrudOperation (object-spread)
  → libraryService.createFolder/updateFolder → FolderOperations/TagOperations SQL
  → SQLite folders.icon / tags.icon
```

Read path (already works for folders, needs one-line change for tags):

```
SQLite SELECT * → rowToMap (passthrough) → FolderModule/TagModule DTO → SDK response
  → FolderTreeComponent convertFoldersToNodes (already: icon || 'folder')
    / convertTagsToNodes (change to: icon || 'label') → <span class="material-icons">
```

## Error Handling

- Icon picker is purely client-side; no network calls. Pagination/search errors are not applicable.
- SDK persistence failures surface through the existing `useFolderOperations` error handling (toast/dialog). Empty/`undefined` icon is omitted so the DB column stays null and the default icon renders — no broken UI.

## Testing

Manual end-to-end verification:
1. Create a folder → choose an icon → confirm it renders in the tree and the default is replaced.
2. Edit an existing folder/tag → change icon → confirm update persists across reload.
3. Create a tag → choose an icon → confirm it renders in the tag tree.
4. In the picker: verify search filters correctly, pagination advances, "Use default" clears the icon, selecting an icon closes the popover and updates the round trigger button.
5. Reload the app → confirm icons persist (DB round-trip).

No automated tests exist for these UI flows in the repo; manual verification is the established pattern for dialog/tree work.

## Risks

- **Tag schema type change** touches a base `CREATE TABLE`; safe for new libraries, and existing libraries already have the column (flexible typing). No destructive migration.
- **Bundled icon list drifts** from the font over time — acceptable; the list is a snapshot and stale names simply render nothing (font ligature miss), which the `defaultIcon` fallback mitigates.
- **Popover size/scroll** inside the dialog (which is itself `Teleport`ed to body) — mitigated by Popover's own portal and explicit `PopoverContent` width/height with `overflow-y-auto`.
