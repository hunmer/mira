# Task Plan: Custom File Format Plugin APIs

## Goal
Add client and server plugin APIs for custom file formats, covering thumbnail/detail rendering and path-based backend processing, then document and verify the extension flow with a 3D-capable example where appropriate.

## Current Phase
Phase 6 complete

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

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `mira-web` `vue-tsc` fails in existing `ServerEditDialog.vue:110` (`AcceptableValue` nullability) | 1 | Confirmed unrelated to changed files; server/client production build still passes |
| `node --check` used a duplicated plugin-relative path during final verification | 1 | Re-ran from the plugin directory with `node --check "index.js"`; passed |

## Notes
- Re-read this plan before API design and implementation.
- Update findings after at most two exploration actions.
