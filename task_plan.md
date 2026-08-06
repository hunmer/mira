# Task Plan

## Goal
Implement whiteboard canvas interactions, image transfer, and an object-management sidebar using the existing Woven Canvas integration.

## Phases
- [complete] Inspect plugin code and Woven Canvas documentation/API.
- [complete] Implement the smallest compatible UI and canvas actions.
- [complete] Build and run focused verification.
- [complete] Summarize changes and acceptance steps.
- [complete] Inspect the existing Mira image preview, whiteboard image data, and double-click event flow.
- [complete] Implement the whiteboard image preview Dialog and connect double-click opening.
- [complete] Run focused build/static verification and document acceptance steps.
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
