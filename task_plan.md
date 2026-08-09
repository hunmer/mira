# Task Plan: Custom File Format Plugin APIs

## Goal
Add client and server plugin APIs for custom file formats, covering thumbnail/detail rendering and path-based backend processing, then document and verify the extension flow with a 3D-capable example where appropriate.

## Current Phase
Phase 14 complete

## Phases

### Phase 1: Requirements & Discovery
- [x] Read the handoff and required skill instructions
- [x] Trace client/server plugin lifecycle and file preview flows
- [x] Record constraints and reusable patterns
- **Status:** complete

### Phase 2: API Design
- [x] Define minimal registration, matching, cleanup, and invocation contracts
- [x] Decide the smallest useful 3D validation example
- [x] Record decisions and affected files
- **Status:** complete

### Phase 3: Implementation
- [x] Implement client custom-format registration and rendering/open handling
- [x] Implement server path-based custom-format processing
- [x] Add/update documented 3D validation example
- [x] Update client/server plugin documentation
- **Status:** complete

### Phase 4: Testing & Verification
- [x] Add focused static verification for registration, matching, cleanup, and invocation paths
- [x] Build/type-check affected packages (production build and server tsc)
- [x] Reinstall core into server if mira-app-core changes (not applicable)
- [x] Check persistent service restart via procm-mcp (no `procm-commands.json` exists)
- **Status:** complete

### Phase 5: Delivery
- [x] Review diff and verify requirements coverage
- [x] Complete planning records and hand off concise acceptance steps
- **Status:** complete

### Phase 6: Hovercard-only 3D Preview
- [x] Add a generic custom hovercard renderer to the client file-format API
- [x] Route grid/list/waterfall hovercards through shared preview content
- [x] Move the 3D iframe renderer from thumbnails to hovercards
- [x] Build the client and 3D plugin, then regenerate the marketplace index
- **Status:** complete

### Phase 7: AI Format Plugin Guide
- [x] Add a concise client/server implementation checklist under `docs/`
- [x] Include lifecycle, hovercard-only iframe rule, build, index, and verification steps
- **Status:** complete

### Phase 8: Browser-safe Image Preview
- [x] Trace thumbnail generation, file routes, and temporary-file conventions
- [x] Add ImageMagick-backed thumbnails for non-browser image formats
- [x] Add an on-demand preview stream API backed by `tmp` cache
- [x] Add focused smoke verification and run server/client verification
- **Status:** complete

### Phase 9: JIT Audio/Video Preview
- [x] Trace existing video/audio players, URL handling, and FFmpeg format coverage
- [x] Expand FFmpeg thumbnail generation for browser-incompatible media
- [x] Add authenticated JIT HLS playlist and segment streaming under temp cache
- [x] Wire browser preview players to HLS for converted formats
- [x] Build, smoke-test seekable segment generation, and restart service
- **Status:** complete

### Phase 9: Ghostscript Delegate Guard
- [x] Reproduce PDF failure and verify missing Ghostscript
- [x] Disable PDF/EPS/AI thumbnail registration when Ghostscript is unavailable
- [x] Rebuild, restart via procm, and verify clean startup logs
- **Status:** complete

### Phase 10: Spine Bundle Format
- [x] Trace server plugin routes, file-id resolution, SDK file APIs, and Spine plugin flow
- [x] Define safe `.spine` ZIP extraction and temp-cache contract
- [x] Implement backend plugin extraction, thumbnail generation, and extra-file HTTP routes
- [x] Add SDK methods and adapt the client Spine plugin to `.spine`
- [x] Run focused security, type, build, and integration checks
- **Status:** complete

### Phase 11: Server Web Plugin Distribution
- [x] Trace server plugin metadata/static routes, Web remote loading, and desktop plugin dialog state
- [x] Move online client plugin projects into matching server plugin `web` directories
- [x] Add an HTTP API for enabled server Web plugins and their dist assets
- [x] Add a desktop “服务器插件” tab with enabled-by-default toggles and no uninstall action
- [x] Load enabled server plugins through the existing Web remote-plugin path
- [x] Build/test affected packages and review the final diff
- **Status:** complete

### Phase 12: Local Format Plugin Installation Repair
- [x] Trace server plugin resolution and existing local install mechanism
- [x] Update the 3D native rebuild script for npm 11
- [x] Restore 3D and Spine plugin packages under the server plugin node_modules
- [x] Build both plugins and verify server-side module resolution
- [x] Check server health and verify plugin initialization with an isolated loader
- **Status:** complete

### Phase 13: Server Web Plugin URL Loading Repair
- [x] Reproduce the malformed token-bearing entry URL from the client log
- [x] Fix URL resolution for validation and script injection
- [x] Run focused checks and affected client build
- [x] Record acceptance steps
- **Status:** complete

### Phase 14: Multi-Viewer Preview API
- [x] Trace SDK response unwrapping, file lookup, Web plugin metadata, and registered format ownership
- [x] Define a server-side Viewer resolver contract supporting multiple viewers per format
- [x] Implement `files().getPreviewViewers(libraryId, fileId)` and matching backend route
- [x] Update bundled iframe Viewer plugin registrations
- [x] Add focused tests and verify Core SDK build plus Server install/type-check
- **Status:** complete

## Key Questions
1. Where are client and server plugin APIs constructed, activated, and disposed?
2. What file metadata is available at thumbnail and detail-open time?
3. Does the backend need an HTTP endpoint, an internal hook, or both for custom processing?
4. Can the repository's existing example plugins host a practical GLB handler without adding global dependencies?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Match existing plugin lifecycle and registration conventions | Keeps cleanup and ownership behavior consistent |
| Treat interactive Vue thumbnail content and detail-open interception as separate capabilities | A format may need either or both |
| Return all matching iframe viewers instead of one preview URL | A file format may be supported by multiple plugins/viewers |
| Keep built-in non-iframe preview selection client-side | The new endpoint represents plugin-provided iframe viewers only |
| Resolve viewers through server format handlers, not manifest templates alone | Spine needs asynchronous extra-resource discovery before its iframe URL can be built |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `mira-web` `vue-tsc` fails in existing `ServerEditDialog.vue:110` (`AcceptableValue` nullability) | 1 | Confirmed unrelated to changed files; server/client production build still passes |
| `node --check` used a duplicated plugin-relative path during final verification | 1 | Re-ran from the plugin directory with `node --check "index.js"`; passed |
| Initial CodeGraph context call used `query` instead of required `task` | 1 | Retried once with the documented `task` argument and obtained loader context |
| `npm install` reported 19 audit findings in the legacy plugin dependency tree | 1 | Kept scope to local plugin installation; did not apply unrelated breaking dependency upgrades |
| Parallel search referenced nonexistent `packages/mira-web/src` | 1 | Use the actual package paths discovered via `rg --files` |
| Server `test` script references missing `sdk/jest.config.js` | 1 | Verify with server type-check/build and a real ImageMagick conversion harness |
| procm restart failed because recorded PID was already absent | 1 | Remove stale process record, then start the configured command |
| procm start did not return and port 8081 remained closed | 1 | Terminated the hanging tool wait; report service restart as unavailable |
| PowerShell `rg` rejected the literal `**/package.json` path | 1 | Use `rg --files -g "package.json"` and pass discovered paths to `rg` |
| Parallel read failed when guessed permission middleware path did not exist | 1 | Use `rg --files` discovery and `Promise.allSettled` for independent reads |
| Spine plugin type-check could not resolve newly declared `yauzl` dependency | 1 | Install the plugin package dependencies, then rerun type-check |
| Client verification used package filter `mira-client`, which matches no workspace package | 1 | Rerun type-check/build with actual package name `mira-web` |
| Core full build includes existing SDK `.test.ts` files with CommonJS-incompatible top-level await and an unrelated Auth mock type error | 1 | Use the SDK ESM build and focused source type-check; do not repeat the same full build |
| Phase 14 Core full build hit the same existing test-file top-level-await/Auth mock errors | 1 | Use SDK ESM build plus focused source type-check, then reinstall Server dependencies |
| PSD plugin standalone build could not find `which` declarations and reported missing local `node_modules` | 1 | Confirmed the plugin root is outside the pnpm workspace; focused source type-check passed using Server's declared `node`/`which` type roots |
| Dist inspection used a repository-root-relative path while running from the Server package | 1 | Re-run once with the absolute Core dist path |
| Server TypeScript rejected Express wildcard access at `req.params[0]` | 1 | Cast params to its runtime string record before accessing the wildcard key |
| Client type-check also reports an existing lazy-plugin type mismatch at `main.ts:51` | 1 | Confirm changed client files introduce no errors via production build and scoped diagnostics |
| Mira CLI library listing requires login and no CLI profile is configured | 1 | Keep validation read-only; verify health plus local manifest/asset contracts without assuming credentials |

## Notes
- Re-read this plan before API design and implementation.
- Update findings after at most two exploration actions.
