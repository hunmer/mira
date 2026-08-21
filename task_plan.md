# Screenshot Editor Follow-up

## Goal
Complete the screenshot editor with mosaic, pen, text, arrow, rectangle, ellipse, undo and redo while preserving save, clipboard and import behavior.

## Phases
- [complete] Inspect current screenshot component and define a minimal canvas command model.
- [complete] Implement selection, annotation tools and toolbar UI.
- [complete] Composite annotations into exported image and preserve post-capture actions.
- [complete] Run focused type/build checks and restart the persistent process.
- [pending] Run focused type/build checks and restart the persistent process.

## Constraints
- Reuse Vue 3 and existing shadcn-vue styling.
- Avoid new dependencies.
- Keep changes scoped to screenshot functionality.

## Errors Encountered
- Full project type-check remains red on pre-existing errors in unrelated files and missing `@hunmer/procm-mcp-sdk`; no errors reference the new screenshot files.
