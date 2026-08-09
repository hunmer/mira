# Progress Log

## Session: 2026-08-10

### Phase 15: Core Production Build Boundary
- **Status:** in progress
- Actions taken:
  - Reproduced from the user-provided output that production `tsc` includes seven SDK test files.
  - Selected a production build-boundary fix instead of changing module semantics or weakening test types.
  - Added production excludes for `src/**/*.test.ts` and `src/**/*.spec.ts`; Vitest configuration remains unchanged.
  - Full `pnpm run build` passed (`tsc` plus SDK ESM build).
  - `vitest list` is unsupported in Vitest 1.6 and was interpreted as a filename filter; switched to collection with a never-matching test-name pattern.
  - Vitest collected 7 SDK test files and 59 tests with all test bodies skipped.
  - Reinstalled workspace dependencies from `mira-app-server` as required after the Core build.
  - Final diff contains only the Core production test excludes; `git diff --check` passed.

### Phase 14: Multi-Viewer Preview API
- **Status:** in progress
- Actions taken:
  - Confirmed the API must return all matching plugin iframe viewers, not one selected URL.
  - Restored the existing planning context and appended Phase 14 without replacing prior work.
  - Selected `files().getPreviewViewers(libraryId, fileId)` as the SDK surface.
  - Confirmed `FileModule`, `ServerWebPlugin`, and `getLoadedWebPlugins()` are the existing ownership boundaries to extend.
  - Rejected a manifest-only template after confirming Spine requires async bundle resource discovery.
  - Selected server format-handler Viewer resolvers plus request-token propagation for protected nested file URLs.
  - Added the Core SDK response types and `FileModule.getPreviewViewers()` URL normalization.
  - Added the backend route and multi-handler Viewer aggregation in `ServerPluginManager`.
  - Registered Viewer resolvers in the 3D, PSD, and Spine server plugins; Spine reuses bundle resource discovery.
  - Core full build was blocked by the already-recorded test-file top-level-await and Auth mock errors; no new diagnostic referenced the changed files.
  - SDK ESM build, focused SDK type-check, server reinstall, server TypeScript, 3D build, and Spine build passed.
  - PSD standalone build reached an existing package-local `which` declaration/install gap; targeted package repair is in progress.
  - PSD source passed a focused type-check using the Server package's declared `node`/`which` types.
  - Multi-Viewer aggregation smoke passed with two matching plugins, priority ordering, and encoded nested file URL assertions.
  - Confirmed generated ESM, CommonJS, and declaration artifacts contain `getPreviewViewers`.
  - Final `git diff --check` passed; Phase 14 implementation and static verification are complete.

### Phase 14 Verification
- `mira-app-core build:sdk:esm`: passed.
- Focused Core SDK TypeScript check: passed.
- `pnpm install` from `mira-app-server`: passed.
- Server `tsc --noEmit`: passed.
- 3D and Spine plugin builds: passed.
- PSD focused TypeScript check: passed.
- Multi-Viewer aggregation smoke: passed (two results, priority order, encoded file URL).
- Full Core build: blocked only by previously recorded test-file errors.
- Persistent server restart: not run because `procm-mcp` is unavailable.

### Phase 12: Local Format Plugin Installation Repair
- **Status:** complete
- Actions taken:
  - Read the repository instructions plus `mira-cli` and `planning-with-files` skills.
  - Restored the existing planning context without replacing prior records.
  - Confirmed both runtime failures are missing packages under the server plugin `node_modules` directory.
  - Selected the repository-local install path; Mira CLI will be used only for final health verification if the server is reachable.
  - Confirmed the durable root cause: the server plugin package dependencies omit 3D and Spine, so installs remove their prior manual links.
  - Updated the 3D native rebuild command for npm 11 and declared both local plugin dependencies in the server plugin package.
  - Ran `npm install` in the server plugin container; both local packages were installed and the Node 22 `gl` native build completed.
  - Left 19 existing npm audit findings unchanged because `npm audit fix --force` is outside scope and may introduce breaking upgrades.

### Phase 13: Server Web Plugin URL Loading Repair
- **Status:** complete
- Actions taken:
  - Read the attached Electron console log and traced the malformed URL to string concatenation in `scriptManager.ts`.
  - Added `resolvePluginFilePath` to preserve HTTP(S) query parameters while appending the plugin entry path.
  - Applied the resolver to both development file validation and script injection.
  - Verified the resolved URL shape and ran `pnpm --filter mira-web build` successfully.
  - Built both plugins successfully and resolved both packages from the exact server plugin paths.
  - Loaded the native `gl` binding under Node 22 ABI 127 and confirmed `webgl.node` exists.
  - Executed both plugin `init` functions in an isolated loader; 3D registered `glb/gltf` and Spine registered `skel/spine`.
  - Mira CLI health returned `status: ok`; the existing non-watch server still needs one procm-managed restart, but no `procm-mcp` tool is available in this session.

## Session: 2026-08-09

### Phase 11: Server Web Plugin Distribution
- **Status:** complete
- Actions taken:
  - Read the applicable repository instructions and `planning-with-files` skill.
  - Restored existing planning context and appended Phase 11 without replacing prior records.
  - Confirmed CodeGraph tools are available; source discovery is next.
  - Queried CodeGraph for server plugin management, desktop plugin UI, and Web remote loading.
  - Confirmed the shared `PluginService` online-plugin path is the intended client loading mechanism.
  - Enumerated online client and backend plugin trees through CodeGraph.
  - Identified two explicit client/server format-plugin pairs and three client-only plugins requiring scope confirmation from repository metadata.
  - Verified the source worktree is otherwise clean.
  - Selected a separate client-side disabled-ID preference for server plugins so they remain non-installable/non-uninstallable remote entries.
  - Mapped `psd-viewer` to `mira_thumb_imagemagick` by backend responsibility.
  - Kept the two client-only plugins out of migration scope pending any contrary metadata.
  - Located the existing authenticated plugin API, SDK module, and `/plugins/:libraryId/:pluginName/*` static asset route.
  - Chose the existing remote script injection path for server Web plugins.
  - Verified the existing static route is text-only and therefore unsuitable for all migrated dist assets.
  - Confirmed migrated format-plugin entry scripts use relative dist URLs and need no internal path rewrite.
  - Identified initialization ordering: plugin service starts before server connection, requiring an explicit post-connect/library sync.
  - Selected SDK-authenticated asset URL construction using existing `HttpClient.getUrl()`.
  - Added server-side loaded Web manifest discovery, `GET /api/plugins/web`, and public binary-safe Web asset serving.
  - Added the Core SDK `ServerWebPlugin` contract and `PluginModule.getWeb()`.
  - Added client server-plugin source metadata, disabled-ID persistence, per-library synchronization, and post-library initialization loading.
  - Reused existing remote script injection and plugin instance enable/disable lifecycle for server plugins.
  - Added the “服务器插件” dialog tab with local-style cards, per-client toggles, refresh, and no uninstall action.
  - Moved 3D, Spine, and PSD client projects into their matching server plugin `web` directories.
  - Removed migrated entries from the online client plugin catalog and added server Web projects to the pnpm workspace.
  - Refreshed the workspace lockfile; only existing deprecation/peer warnings were reported.
  - Core full build was blocked by pre-existing SDK test-file top-level-await and Auth mock type errors; recorded for alternate verification.
  - All three migrated Web plugins passed `vue-tsc`.
  - Client type-check reported only existing errors in `ServerEditDialog.vue:110` and `main.ts:51`.
  - Fixed the one server wildcard route typing error found by the first server check.
  - Server TypeScript, client production build, and all three migrated plugin builds passed.
  - Mira CLI health passed; authenticated library listing was unavailable because no CLI login profile exists.
  - Verified all three manifests through an isolated `ServerPluginManager` harness.
  - Added `web/**/*` to each backend plugin package's publish allowlist.
  - Made server-plugin refresh idempotent by unloading previous instances and scripts only after a successful list sync.
  - Rebuilt the client after the idempotence fix; production build passed.
  - Completed diff/whitespace review and npm pack dry-runs; all three packages include `web/plugin.json`.
  - Did not restart the non-watch 8081 process because procm-mcp is unavailable in this session.

## Session: 2026-08-08

### Phase 10: Spine Bundle Format
- **Status:** in progress
- Actions taken:
  - Read the Spine plugin handoff and applicable skill instructions.
  - Restored existing planning context and recorded the new phase.
  - Confirmed CodeGraph is available; no source files changed yet.
  - Traced the Spine server/client implementations, file module, and plugin route infrastructure.
  - Identified library-local file IDs as the reason HTTP routes require `libraryId` context.
  - Rejected `registerHttpHook` and `ServerPlugin.registerRoute` for endpoint creation after reading their actual contracts.
  - Selected a generic `FileRoutes` endpoint backed by optional format-handler extra-file methods.
  - Defined the tentative authenticated route shape and confirmed the viewer already accepts JSON skeleton data.
  - Confirmed `yauzl` is already installed and client file records carry `libraryId`.
  - Identified the need for SDK-generated authenticated URLs for the separate preview window.
  - Verified query-token authentication is supported and selected `fileId` route naming to preserve library permission checks.
  - Added core format-handler extra-file operations, authenticated routes, and Core SDK list/Blob/URL methods.
  - Added safe Spine ZIP temp caching and `.spine` thumbnail extraction.
  - Wired client plugin API and Spine preview plugin to SDK-generated resource URLs.
  - Built core and reinstalled server workspace dependencies.
  - Restarted `mira-app-server-dev` via procm; verified Spine plugin registration in startup logs.
  - Ran Mira CLI health check and a real upload -> SDK list/get -> permanent delete integration smoke.
  - Completed Phase 10.

### Phase 9: JIT Audio/Video Preview
- **Status:** in progress
- Actions taken:
  - Read the user-provided JIT HLS reference implementation.
  - Chose system FFmpeg CLI with temp-cache output and no static binary package.
  - Added `hls.js` for Chromium/Electron playback; installation reported only existing workspace peer/deprecation warnings.
  - Client type-check remains blocked by the pre-existing `ServerEditDialog.vue:110` `AcceptableValue` mismatch.
  - Real video smoke passed: 10 seconds produced 3 HLS segments; token query propagated to segment URIs; audio waveform thumbnail generated.
  - Real audio-only HLS smoke passed: 5 seconds produced 2 MPEG-TS segments.
  - Verified segment 2 starts at PTS `8.000000`; removed `-avoid_negative_ts make_zero` because it reset the seek offset.
  - Persistent server is listening on port 8081; `/health` returned `status: ok` after the procm start attempt.

### Phase 8: Browser-safe Image Preview
- **Status:** complete
- Actions taken:
  - Read the applicable `ponytail` and `planning-with-files` instructions.
  - Began tracing `ThumbnailService`, file routes, and temporary cache conventions.
  - Confirmed ImageMagick is installed and the deployment UI already documents it as a prerequisite.
  - Selected `/api/files/preview/:libraryId/:fileId` so the existing permission middleware resolves the correct library ID.
  - Added ImageMagick generator registration, WebP preview caching under `dataPath/temp/previews`, and streaming route.
  - Updated client image classification and URL mapping for converted formats.
  - Ran a real ImageMagick WebP smoke conversion from the repository PNG fixture.

### Phase 1: Requirements & Discovery
- **Status:** complete
- Actions taken:
  - Read the user-provided handoff.
  - Read `planning-with-files` and `ponytail` instructions.
  - Created persistent planning files.
  - Queried CodeGraph for client preview/open flows and server plugin/thumbnail registries.
  - Confirmed `PluginAPI.media`, `ThumbnailGenerator`, and global `MiraServer.thumbnailService` extension points.
- Files created/modified:
  - `task_plan.md`
  - `findings.md`
  - `progress.md`

### Phase 2: API Design
- **Status:** complete
- Actions taken:
  - Chose format matchers with independent thumbnail and open capabilities.
  - Reused `ThumbnailService` for generated thumbnails and added a general server process hook.

### Phase 3: Implementation
- **Status:** complete
- Actions taken:
  - Added client file-format types/registry/API and custom thumbnail rendering.
  - Added async detail-open interception.
  - Added server file-format registry/process dispatch and thumbnail bridge.
  - Updated both plugin docs with 3D examples.

### Phase 4: Testing & Verification
- **Status:** complete
- Actions taken:
  - Server `tsc --noEmit` passed.
  - Client Vite production build passed.
  - Client `vue-tsc` exposed an unrelated pre-existing `ServerEditDialog.vue:110` error.
  - `git diff --check` passed.
  - Checked procm-mcp; no project command file exists.

### Phase 5: Delivery
- **Status:** complete

## Test Results
| ImageMagick smoke conversion | repository PNG -> temp WebP | WebP output exists and identifies | Passed | passed |
| Server TypeScript (Phase 8) | `pnpm --filter mira-app-server exec tsc --noEmit` | No errors | Passed | passed |
| Client production build (Phase 8) | `pnpm --filter mira-web build` | Build succeeds | Passed (existing Vite warnings only) | passed |
| Diff whitespace (Phase 8) | `git diff --check` | No errors | Passed | passed |
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Server TypeScript | `pnpm --filter mira-app-server exec tsc --noEmit` | No errors | Passed | passed |
| Client production build | `pnpm --filter mira-web build` | Build succeeds | Passed | passed |
| Client type-check | `pnpm --filter mira-web run type-check` | No errors | Existing `ServerEditDialog.vue:110` nullability error | blocked (unrelated) |
| Diff whitespace | `git diff --check` | No errors | Passed | passed |

## Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-08-08 | `ServerEditDialog.vue:110` `AcceptableValue` not assignable to `string | undefined` | 1 | Unrelated pre-existing type error; no change made |
| 2026-08-08 | Final `node --check` path repeated the plugin directory | 1 | Re-ran with `index.js` from the plugin working directory; passed |
| 2026-08-08 | Search included nonexistent `packages/mira-web/src` | 1 | Continue with repository-discovered package paths |
| 2026-08-08 | `packages/mira-app-server/sdk/jest.config.js` does not exist | 1 | Use build/type-check plus a real converter smoke test |
| 2026-08-08 | procm restart found stale PID (`taskkill` process not found) | 1 | Clean stale record and start configured dev command |
| 2026-08-08 | procm start did not return; port 8081 was not listening | 1 | Terminated the hanging wait; code verification remains complete |
| 2026-08-08 | Retried procm startup | 1 | Started `mira-app-server-dev` as process `iM8tyIh1`; `/health` returned `status: ok` |
| 2026-08-08 | PDF thumbnail failure reproduced | 1 | Confirmed missing Ghostscript delegate; added capability guard and restarted process `iM8tyIh1` |
| 2026-08-08 | PowerShell `rg` rejected `**/package.json` as a path | 1 | Switched to `rg --files -g "package.json"` discovery |
| 2026-08-08 | Guessed permission middleware path caused parallel read failure | 1 | Switched to path discovery and fault-isolated reads |
| 2026-08-08 | Spine plugin could not resolve `yauzl` before install | 1 | Install declared plugin dependencies and rerun TypeScript |
| 2026-08-08 | `pnpm --filter mira-client` matched no package | 1 | Rerun with `mira-web` |

### Backend Process
- Added `procm-commands.json` with `mira-app-server-dev`.
- Started backend through procm-mcp direct process API, process ID `gGBjCzdL`.
- Logs report health endpoint `GET /api/health` returned `200` and libraries/plugins loaded.

### 3D Market Plugin
- Added `online_client_plugins/plugins/mira-3d-format-preview/`.
- Registered GLB/GLTF custom format handlers for interactive thumbnail and detail open.
- Regenerated `online_client_plugins/plugins.json`; catalog now contains 3 plugins.
- `node --check` passed for the plugin entry.
- Upgraded the plugin to a complete Vue 3 + TresJS + Three.js project (v1.1.0).
- Added a Vite-built detail window using `TresCanvas`, `GLTFModel`, and `OrbitControls`.
- Installed dependencies, passed plugin `vue-tsc`, and rebuilt distributable `dist/` assets.

### 3D Server Plugin
- Added `plugins/plugins/mira_3d_format/` with `@gltf-transform/core` parsing and `render-glb` thumbnail generation.
- Added `thumbnailExtensions` support to `ServerPluginManager` so GLTF parsing does not invoke the GLB-only renderer.
- Linked the plugin into `packages/mira-app-server/src/plugins/node_modules` and enabled it in runtime `plugins.json`.
- Verified on procm-mcp alternate ports `8091/8021`: plugin loaded and `/health` returned `status: ok`; verification process was stopped afterward.

### 3D Detail Loading Fix
- Confirmed the file endpoint returns a valid GLB (`67 6C 54 46`) with HTTP 200.
- Root cause: Cientos `GLTFModel` exposes no `load` or `error` events, leaving the page-owned loading flag unchanged.
- Added `ModelScene.vue` using `useGLTF` state/error refs and explicit `loaded`/`error` emits; plugin bumped to `1.1.1`.

### 3D Thumbnail Native Runtime Fix
- Reproduced the reported `gl` binding error: pnpm had skipped `gl` build scripts.
- Ran `npm rebuild gl --build-from-source`; `webgl.node` was generated successfully.
- Rendered the reported GLB to a 256x256 PNG successfully with `render-glb`.
- Added `rebuild:native` and `postinstall` scripts plus deployment instructions.

### 3D Iframe Thumbnail
- Replaced the placeholder canvas renderer with a real `dist/index.html?embed=1&fileUrl=...` iframe.
- Added embed `postMessage` loaded/error events; plugin falls back to `thumbnailPath` on error or 30-second timeout.
- Restored custom-format renderer priority in `MediaThumbnail.vue` and suppressed the empty-registry factory warning.
- Plugin/host builds and deterministic iframe/fallback harnesses passed; client plugin bumped to `1.2.1`.

### Hovercard-only 3D Preview
- Added the generic `renderHoverCard` file-format hook.
- Centralized grid/list/waterfall hovercards on `MediaPreviewHoverCard` and `MediaPreviewContent`.
- Moved the 3D iframe renderer to hovercards; standard thumbnails now use the server PNG through `MediaThumbnail`.
- Client production build, plugin production build, JavaScript syntax check, and `git diff --check` passed.

### AI Format Plugin Guide
- Added `docs/format-extension-plugin-ai-guide.md` with the minimal implementation and verification checklist for format extension plugins.

## 5-Question Reboot Check
| Question | Answer |
|----------|--------|
| Where am I? | Phase 1: tracing current architecture |
| Where am I going? | Design, implementation, verification, delivery |
| What's the goal? | Add complete client/server custom-format plugin APIs |
| What have I learned? | See `findings.md` |
| What have I done? | Read handoff/skills and initialized task records |
