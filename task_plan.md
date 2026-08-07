# Task Plan

## Goal
Add a General settings toggle that installs/removes an OS login item for the script-managed local backend, allowing mira-app-server to start without the Mira UI.

## Phases
- [complete] Inspect GeneralPanel settings, persistence, and existing OS startup IPC/build conventions.
- [complete] Define cross-platform auto-start entrypoint and IPC contract.
- [complete] Implement the settings toggle and OS startup install/remove behavior.
- [complete] Run focused verification and document acceptance steps.
- [complete] Inspect Electron startup lifecycle, build packaging, and current server process ownership.
- [complete] Define a packaged cross-platform start/status/stop script contract.
- [complete] Implement script-managed deployment startup and Electron auto-start checks.
- [complete] Run focused lifecycle/build verification and document acceptance steps.
- [complete] Inspect current login/auth/library APIs and the user's overlapping LoginView changes.
- [complete] Define the idempotent default-user/library provisioning and post-deploy connection contract.
- [complete] Implement backend provisioning, collapsible deployment UI, fixed dialog sizing, and immediate connection.
- [complete] Run focused verification and document acceptance steps.
- [complete] Inspect the deployment dialog, existing login/server flow, and Electron/backend execution bridge.
- [complete] Define the smallest compatible step execution and output contract.
- [complete] Implement real deployment and per-step backend output handling.
- [complete] Run focused verification and document acceptance steps.
- [complete] Inspect plugin code and Woven Canvas documentation/API.
- [complete] Implement the smallest compatible UI and canvas actions.
- [complete] Build and run focused verification.
- [complete] Summarize changes and acceptance steps.
- [complete] Inspect the existing Mira image preview, whiteboard image data, and double-click event flow.
- [complete] Implement the whiteboard image preview Dialog and connect double-click opening.
- [complete] Run focused build/static verification and document acceptance steps.
- [complete] Compare context-menu handling across media item views and identify the waterfall-only break.
- [complete] Implement the smallest compatible waterfall context-menu fix.
- [complete] Run focused verification and document acceptance steps.
- [complete] Inspect Woven block hierarchy, deletion, selection, and camera-focus APIs.
- [complete] Implement the fixed object-manager trigger and node sidebar.
- [complete] Run focused build/static verification and document acceptance steps.
- [complete] Diagnose and fix Frame release, toolbar spacing, and preview activation regressions.
- [complete] Run scoped static verification and document manual acceptance steps.
- [complete] Compare the requested viewer controls and diagnose multi-select dropdown trigger spacing.
- [complete] Replace the preview footer controls and normalize multi-select toolbar button geometry.
- [complete] Run scoped SFC/style verification and document manual acceptance steps.
- [complete] Verify Viewer.js/v-viewer APIs and compare the existing viewer implementation with the whiteboard preview.
- [complete] Replace manual transforms with a real Viewer.js instance and add plugin dependencies.
- [complete] Run scoped dependency/SFC verification and document manual acceptance steps.
- [complete] Inspect image context-menu, toolbar, and Electron clipboard/file-drag paths.
- [complete] Implement copy-image and native external file drag with minimal IPC changes.
- [complete] Run focused build/static verification and document acceptance steps.

## Errors Encountered
| Error | Attempt | Resolution |
|---|---:|---|
| Parallel shell orchestration discarded output when one `rg` command returned exit 1 | 1 | Re-ran commands with exit-code normalization and per-command error capture. |
| Core declaration lookup used the wrong top-level dependency path; one quoted regex was malformed | 1 | Resolve the nested package path first and use literal/simple searches. |
| Initial implementation patch expected the wrong Vue version in `package.json` | 1 | Split the patch and matched the actual dependency block. |
| `pnpm exec vue-tsc` failed because the plugin does not declare `vue-tsc` | 1 | Run the matching checker version once via `pnpm dlx` without changing project dependencies. |
| Temporary `vue-tsc@2.2.12` resolved incompatible TypeScript 7.0 | 2 | Pin temporary TypeScript to 5.9.3 for the checker invocation. |
| Source type check then reached an existing missing `@types/node` error in `vite.config.ts` | 3 | Use a temporary source-only tsconfig, then remove it after validation. |
| Assumed `CanvasMediaBridge.vue` existed and used an over-escaped dialog regex | 1 | Locate the inline component in `App.vue` and switch to simple literal searches. |
| Full-worktree `git diff --check` failed on unrelated user edits in `FolderTreeComponent.vue` | 1 | Preserve those edits and scope whitespace/SFC checks to the two whiteboard files. |
| Root Node resolution could not find `@vue/compiler-sfc` | 1 | Resolve the compiler from the whiteboard plugin's nested pnpm dependency directory. |
| Combined follow-up patch assumed a duplicated CSS line that was only an overlapping excerpt | 1 | Split the edit into small patches against exact current contexts. |
| CodeGraph context call used `query` but this server version requires `task` | 1 | Inspect the live tool schema and retry with its declared parameter name. |
| Searched the stale handoff path `mira-client`, which does not exist at repository root | 1 | Locate the current client package with `rg --files` before continuing. |
| Whiteboard-wide `vue-tsc` reached an existing `CanvasImagePreview.vue` injected-context narrowing error and the same issue in the new composable | 1 | Fix the new composable's stable context reference and use a scoped temporary config; preserve the unrelated preview component. |
| Client-wide `vue-tsc` failed on numerous existing renderer/type errors | 1 | Rely on the successful main/preload builds and verify changed whiteboard sources separately. |
| Planning skill completion script reported `18/0` because it does not recognize the existing `[complete]` phase format | 1 | Verify the phase list directly; all listed phases are complete and no retry is needed. |
| Standalone SFC probe again could not resolve root `@vue/compiler-sfc` | 1 | Do not repeat the redundant probe; production build and scoped `vue-tsc` already validate the component. |
| Bundled Playwright had no downloaded Chromium executable | 1 | Reuse an installed system Chrome/Chromium executable instead of downloading dependencies. |
| `Synced` runtime queries are valid but its base ECS type is rejected by Vue `useQuery`'s CanvasComponent constraint | 1 | Add one local `unknown` adapter at the query boundary; keep all returned Block/Frame data strictly typed. |
| Normalizing two existing mixed-line-ending files made added CRLF lines fail `git diff --check` | 1 | Rewrote only the changed blocks with their original LF convention; scoped diff check then passed. |
| Full client `vue-tsc` reported numerous existing unrelated errors | 1 | Filtered diagnostics to the four deployment files; no matching errors were reported, and all three relevant production builds passed. |
| First checklist patch assumed an explicit `defineOptions` call that the component does not contain | 1 | Split the patch against the component's actual script and template blocks. |
| Main-process TypeScript check is blocked by existing `DragDropHandler` and mixed Vite-version errors | 1 | Confirmed no diagnostics reference the new lifecycle service/handler changes; production main build passes. |
| Standalone `status` returns exit code 1 when the service is stopped | 1 | This is intentional CLI status semantics; it still emits the JSON health/managed state and does not mutate files. |
| Restoring the changed waterfall line to CRLF made `git diff --check` report trailing whitespace | 1 | Kept the changed line as LF, matching the repository's established handling for this mixed-line-ending file; scoped diff check passes. |
