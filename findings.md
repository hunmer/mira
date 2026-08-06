# Findings

- `HANDOFF.md`: the feature belongs primarily to the Vue plugin window using `@woven-canvas/vue`.
- Canvas project switching remounts `WovenCanvas` by `currentProjectId`; persistence uses IndexedDB.
- Working tree was clean at task start.
- No repository `AGENTS.md` was found; user-provided instructions are the active project rules.
- CodeGraph MCP is unavailable in this session, so repository discovery falls back to `rg`.
- Installed Woven Canvas version is `@woven-canvas/vue@1.4.0`.
- Public APIs include `FloatingMenu`, `FloatingMenuBar`, `MenuButton`, `useEditorContext`, `useQuery`, and `useImageCreation`.
- Core commands officially support `DuplicateSelected` and `RemoveSelected`; block data includes `flip: [flipX, flipY]`.
- The default floating menu already positions itself above any selection and exposes slots including `button:operations` with selected entity IDs.
- `FrameTool` exists internally but is not exported; custom create-frame/alignment/flip controls need a small bridge using public editor/component APIs.
- `createBlock` handles persistence, rank, and placement; Frame containment uses `AssignFrameChildren`.
- Woven block wrappers expose `data-entity-id` and `data-selected`, which safely distinguish canvas and object context menus.
- The custom floating-menu slot is already positioned by Woven Canvas, so the selection toolbar only supplies its inner controls.
- Mira's existing `ImagePreview.vue` uses a header, left thumbnail rail, central viewer with a bottom status bar, and a right information panel; its controller and media-library metadata cannot be reused in the whiteboard plugin.
- Whiteboard image preview must resolve image URLs from Woven Canvas `Image`/`Asset` components through the injected AssetManager, and derive available dimensions/transform data from `Block`.
- `CanvasMediaBridge` is defined inline in `App.vue`; imported media is fetched into a `File` and passed to `useImageCreation`, so the canvas persists asset identifiers rather than the original media-library object.
- `App.vue` already has a project-management modal pattern (`wb-dialog-mask` / `wb-dialog`) that the image preview can match without adding a dialog dependency.
