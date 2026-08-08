# Findings & Decisions

## Requirements
- Client plugins can register handlers for custom file formats.
- A client handler can replace `MediaThumbnail.vue` content with Vue-rendered interactive content, not only an image.
- A client handler can take over opening a file detail view.
- Server plugins can register custom-format processing that receives a local file path and may parse it or generate a thumbnail.
- Update `docs/client-plugin-architecture.md` and `docs/server-plugin-development.md`.
- Use a 3D/GLB plugin as an API validation example if it fits the current plugin architecture.
- Build/reinstall `mira-app-core` when changed; use procm-mcp for persistent service restarts.

## Research Findings
- Current double-click flow reaches `HomeController/interactionHandler.ts`; generic documents route to `/file-preview`.
- `FilePreviewView.vue` chooses preview content from MIME type and filename extension.
- `MediaThumbnail.vue` is the requested list/grid thumbnail integration point.
- Existing file APIs span `mira-app-core` SDK, `MiraSDKService`, and `FileRoutes`.
- A refreshed preview may lack an in-memory SDK connection, so authenticated file URL fallback exists; tokens must not be persisted or logged.
- `MediaThumbnail.vue` currently renders only an image URL or a fallback icon/slot. It has no access to the complete media item and no plugin registry lookup.
- `FilePreviewView.vue` selects built-in preview components with a hard-coded MIME/extension chain.
- `ServerPluginManager.loadPlugin` passes the manager, websocket server, database service, and `MiraClient` to plugin `init`; unload calls plugin cleanup when available.
- `ThumbnailService` already owns a generator registry keyed by extension. This is reusable for plugin thumbnail generation, but current service access and registration ownership still need confirmation.
- `ServerPlugin` currently provides config/data-directory and route helpers; custom format processing is not present there.
- Client `PluginAPI` is declared in `packages/mira-client/src/shared/types.ts`; its `media` namespace already exposes local-file and context-menu registrations, so custom-format registration belongs there.
- `ThumbnailGenerator.generate(srcPath, destPath)` already receives the exact source and destination paths. It covers generated thumbnails but not arbitrary parsed metadata/results.
- `MiraServer` constructs one global `ThumbnailService` before loading libraries; it is available from the server object passed indirectly through the plugin manager.
- Server plugins are initialized with `{ pluginManager, server, dbService, miraClient }`; cleanup is supported by `ServerPluginManager.unloadPlugin`.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Keep format matching centralized in the plugin API | Avoid duplicating extension/MIME precedence across UI entry points |
| Do not make `render-glb` a core runtime dependency unless the server plugin system requires it | Rendering is format-plugin-specific and may require native/headless environment setup |
| Reuse `ThumbnailService` for thumbnail-specific server handling | It already provides extension dispatch and queue/progress behavior |
| Add a general server format registry beside the thumbnail registry | Arbitrary parsing may return structured data and should not be forced through `generate(src, dest): void` |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| Client `vue-tsc` reports existing `ServerEditDialog.vue:110` nullability mismatch | Left unrelated code unchanged; production Vite build passes |
| No `procm-commands.json` in project | Could not restart a named persistent service; no service command was available |

## Resources
- `C:/Users/Administrator/AppData/Local/Temp/file-preview-handoff.md`
- `docs/client-plugin-architecture.md`
- `docs/server-plugin-development.md`
- `packages/mira-client/src/renderer/components/common/MediaThumbnail.vue`

## Visual/Browser Findings
- No browser or image inspection performed.
