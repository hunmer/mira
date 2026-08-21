# Screenshot Editor Follow-up

## Goal
Use an independent screenshot window and capture the full display selected by cursor/display detection, while preserving the screenshot editor and post-capture behavior.

## Phases
- [complete] Inspect current screenshot component and define a minimal canvas command model.
- [complete] Implement selection, annotation tools and toolbar UI.
- [complete] Composite annotations into exported image and preserve post-capture actions.
- [complete] Run focused type/build checks and restart the persistent process.
- [complete] Add a dedicated screenshot window and desktop source detection.
- [complete] Route screenshot completion/cancel back to the main window.
- [complete] Run focused type/build checks and restart the persistent process.
- [complete] Replace the screenshot Vue page with a standalone self-contained HTML implementation.

## Constraints
- Reuse Vue 3 and existing shadcn-vue styling.
- Avoid new dependencies.
- Keep changes scoped to screenshot functionality.

## Errors Encountered
- Full project type-check remains red on pre-existing errors in unrelated files and missing `@hunmer/procm-mcp-sdk`; no errors reference the new screenshot files.
- Persistent `mira-app-server-dev` restart could not stay running because its existing `@hunmer/procm-mcp-sdk` import fails under ts-node.
- Independent screenshot page initially mounted with `visible=true`, so a non-immediate watcher skipped source initialization; fixed with an immediate watcher.
