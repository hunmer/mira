# Gallery DL importer implementation plan

## Goal
Integrate mira-app-core into mira-dashboard-next, provide reusable hierarchical folder/tag tree selection, and implement a server plugin plus custom page that parses multiple gallery-dl URLs and imports selected images into a chosen library/folder/tags under the current authenticated account.

## Phases
- [complete] 1. Inspect existing architecture, auth/API contracts, plugin examples, and dirty worktree overlap.
- [complete] 2. Design the minimal server/client boundary and test strategy.
- [complete] 3. Implement mira-app-core dashboard integration and reusable tree selection.
- [complete] 4. Implement and register the gallery-dl server/web plugin.
- [in_progress] 5. Build, install core/server dependencies, restart existing services, and verify with the current account.

## Constraints
- Preserve unrelated user changes.
- Use current authenticated Mira profile for verification.
- Do not expose tokens or local temporary paths.
- Folder selection is single-select; tag selection is multi-select unless existing APIs require a different contract.

## Design Decisions
- Add a dashboard SDK singleton backed by `mira-app-core/shared/sdk`, using the current localStorage bearer token dynamically.
- Add `LibraryTreeSelect` as a reusable entity-aware component: folder single-select and tag multi-select, built from flat parent_id records.
- Expose the tree component and SDK client through the dashboard plugin runtime.
- Parse each input URL with gallery-dl dump-json and normalize event type 3 records; download only selected normalized URLs during import.
- Dispatch plugin API calls using the selected target `libraryId`, so the host invokes the plugin instance and dbService for that target library.

## Errors Encountered
| Error | Attempt | Resolution |
| --- | --- | --- |
| Parallel read probe returned generic exit code 1 | 1 | Switched to one PowerShell command with explicit non-fatal handling. |
| Parallel targeted inspection failed when a no-match/command-absent probe returned code 1 | 1 | Avoid Promise.all for mixed optional probes; execute targeted reads independently with explicit exit 0. |
| Current `python` is the Codex Hermes virtualenv and has no pip | 1 | Locate a bundled/system Python runtime instead of mutating the agent virtualenv. |
| gallery-dl rejects a direct httpbin image URL as unsupported | 1 | Use an official supported-site example with `--range 1` to inspect dump-json output. |
| `pnpm install` aborted because modules purge confirmation requires a TTY | 1 | Re-run in non-interactive CI mode, as recommended by pnpm. |
| CI-mode workspace install exceeded the 120s command timeout | 1 | Re-run with a longer timeout; partial package store downloads are reusable. |
| CI mode enabled frozen-lockfile and rejected the newly added dashboard dependency | 1 | Re-run with `--no-frozen-lockfile` to intentionally update pnpm-lock.yaml. |
| Full workspace reinstall produced no progress and timed out after 300s | 1 | Stop repeating full reinstall; inspect restored package links and use scoped/package-local installs only where needed. |
| Workspace restore reached linking but failed with ENOENT under `.pnpm` after warning that an Electron package could not be removed | 1 | Audit for timed-out pnpm child processes causing concurrent mutations before retrying any install. |
| Filtered install linked packages but exited because pnpm blocked dependency build scripts | 1 | Verify required binaries; explicitly rebuild only Core/Dashboard-required `esbuild` rather than approving unrelated native scripts. |
| Plugin build inferred deduplicated tag IDs as `unknown[]` | 1 | Add the intended `string[]` annotation at the request boundary. |
| Mira CLI could not start because the interrupted workspace reinstall left mira-app-server without its `express` dependency links | 1 | Restore only the mira-app-server workspace package with repository pnpm 10 before verification. |
| Restored CLI resolved a peer-qualified sqlite3 package without its native binding | 1 | Run a package-scoped sqlite3 rebuild for mira-app-server. |
| Combined final check returned code 1 because secret scan had no matches and paths were relative to the plugin directory | 1 | Run checks independently from repository root and treat no-match as success. |
| Cleanup attempted to remove a dry-run tarball that npm had not actually created | 1 | No cleanup needed; verify absence and run pack dry-run from the plugin working directory. |
| Stopping the Dashboard Vite leaf did not release port 5173 within 15 seconds | 1 | Inspect the new listener/process tree before choosing a different process boundary; do not repeat leaf termination. |

## Remaining Verification Blocker
- The saved CLI profile is `admin` on `http://127.0.0.1:8081`, but the server reports its token is invalid or expired. Authenticated folder/tag loading and a real import cannot be executed until the current profile is logged in again or the user explicitly authorizes Chrome-session verification.
