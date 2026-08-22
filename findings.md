# Findings

- The existing ScreenshotDialog captures the current Electron window, allows rectangular cropping, saves to Pictures/Mira Screenshots, optionally copies to clipboard, and emits a File for FileUploadDialog.
- The current implementation has no annotation model. Native Canvas can provide deterministic export without adding dependencies.
- Use image-local CSS coordinates for selection and commands. Preview draws at scale 1; export scales commands to source pixels and translates by the crop origin.
- Model pen/mosaic as point paths, text as a positioned command, and arrow/rectangle/ellipse as start/end commands. A command stack plus redo stack provides undo/redo.
- The current capture path calls `mainWindow.webContents.capturePage()`, so it cannot include desktop pixels outside the main BrowserWindow.
- Vite already supports multi-page entries and the shared preload exposes generic `invoke`/`send`, so a dedicated screenshot page can reuse ScreenshotDialog without another preload.
- Main-process capture should happen before creating the overlay window; otherwise the overlay is included in its own screenshot.

## File Preview Tab Navigation

- `LibraryPanel.vue` already reads and writes global settings through `useSettingsStore`, while library display defaults use `LibraryPrefs`.
- `/file-preview` is opened from multiple renderer components/services, mostly with object-form `router.push({ path: '/file-preview', query })`; a router-level adapter can cover these without editing every caller.
- `useTabs.ts` supports registered tabs plus `webview` and `custom` tabs; the exact existing embedded-route tab pattern still needs identification.
- Router creation is centralized in `router/index.ts`; there is currently no route-to-tab adapter or `openInTab` navigation option.
- `AppSettings` already persists global booleans with explicit defaults, making it the appropriate home for the preview-tab preference.
- The renderer documentation confirms tabs render Vue components through `TabViewRenderer`, so an embedded preview should use a registered/custom component tab rather than an Electron webview.
- `CustomTabType` can render a Vue component with props and marks runtime component tabs transient, which fits file previews.
- `FilePreviewView.vue` currently reads every input from `useRoute().query`; embedded use requires an optional query prop while retaining route-query fallback.
- A preview tab can be deduplicated by `libraryId + file id`, labeled from `query.title`, and created through `useTabs().createCustomTab()`.
- The router adapter should use `openInTab ?? preview-setting`; explicit `false` must override the enabled preference, while unrelated routes retain the global default `false`.
- Settings defaults exist both in the initial `settings` ref and `resetSettings`; the new boolean must be added to both to preserve migration/reset behavior.
- `LibraryPanel.vue` can expose the preference directly as a computed value from `settingsStore.settings` and persist it with `updateSetting`.
- Both `zh-CN/settings.json` and `en-US/settings.json` require labels/descriptions for the new switch.
- Bug follow-up: image/video entry points use string routes such as `/image-preview/:id`, which bypassed the object-form router adapter. The adapter now resolves those routes, looks up the file in media preview/file stores, and opens the same embedded file-preview tab when enabled.
