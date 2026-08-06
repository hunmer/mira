# Task Plan

## Goal
Implement whiteboard context menus, multi-selection toolbar actions, and image flip actions using the existing Woven Canvas integration.

## Phases
- [complete] Inspect plugin code and Woven Canvas documentation/API.
- [complete] Implement the smallest compatible UI and canvas actions.
- [complete] Build and run focused verification.
- [complete] Summarize changes and acceptance steps.
- [in_progress] Inspect the existing Mira image preview, whiteboard image data, and double-click event flow.
- [pending] Implement the whiteboard image preview Dialog and connect double-click opening.
- [pending] Run focused build/static verification and document acceptance steps.

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
