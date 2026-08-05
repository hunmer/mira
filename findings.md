# Findings — reka-ui → ui-thing migration research

## 1. Project stack (what mira-client actually is)
- **Framework**: Vite + Vue 3 + **Electron** (NOT Nuxt). Scripts: `vite build`, electron-builder. Config: `vite.config.ts`, `vite.main.config.ts`, `vite.preload.config.ts`.
- **Tailwind**: Tailwind CSS v4 (`tailwindcss@4.0.17`) via `@tailwindcss/vite`.
- **Styling libs present**: `class-variance-authority@^0.7.1` (cva), `clsx@^2.1.1`, `tailwind-merge@3.0.2`. → current pattern is **shadcn-vue** (`cn()` + `cva()`).
- **NOT present**: `tailwind-variants` (tv), `ui-thing`, `vee-validate`, Nuxt.
- **Primitive lib**: `reka-ui@^2.9.7` (the headless engine under both shadcn-vue and UI Thing).
- CSS: `src/renderer/assets/main.css`, `src/renderer/styles/theme.css`.
- Path alias: `@/* → ./src/*`, plus `@renderer`, `@main`, `@volt`.

## 2. Current UI library = shadcn-vue style, NOT ui-thing
- Location: `src/components/ui/**` — **243 files**, **36 families**.
- Each family = `index.ts` (exports + `cva` variants) + N `.vue` wrappers around reka-ui primitives, using `cn()` from `@/lib/utils`.
- Confirmed by CLAUDE.md: *"基于 shadcn/ui (radix-vue/reka-ui) 的 UI 基础组件库"*.
- Sample `Button.vue`: imports `Primitive` from `reka-ui`, uses `cn(buttonVariants(...), props.class)`.
- Sample `DialogContent.vue`: `useForwardPropsEmits` + `cn('fixed left-1/2 ...', props.class)` — has a custom `<span class="material-icons">close</span>` close button (Material Icons), NOT a lucide SVG. This is a local customization.

## 3. Usage surface (what consumes the UI)
- **68 files** import from `@/components/ui/**`.
- Top consumers: button (29 refs), volt (18), dialog (13), checkbox (12), input (11), tooltip (10), select (6), progress (6), switch (5), alert-dialog (5).
- Note: `@volt/*` alias → `src/components/ui/volt/*` (Volt is a separate higher-level lib sitting inside the ui folder).
- 32 of the 36 families are referenced; 4 appear unused (accordion? collapsible? — confirm in migration).

## 4. What "ui-thing" actually is (per the bundled skill at packages/mira-client/.agents/skills/uithing)
- UI Thing = **"Nuxt-first, shadcn-inspired, copy-paste component system"** on Vue 3 + **Nuxt 4** + Reka UI + Tailwind v4 + **`tailwind-variants` (tv)** + Nuxt Content.
- Components live in `app/components/Ui/**` (Ui-prefixed families: `UiDialog*`, `UiButton*`, etc.).
- Styling rule: prefer **`tv()`** over `cn()`; keep `data-slot`; `normalizeClass(props.class) || undefined`; semantic tokens (`bg-background`, `text-foreground`, `border-border`, `bg-popover`).
- Distribution = CLI (`ui-thing init/add/prose/block/theme/...`) + **MCP tools** (`list-components`, `get-component`, `get-install-plan`, …). Skill explicitly says CLI source-of-truth is at `/Users/baker/Desktop/ui-thing-cli` (a macOS path — author's machine, NOT present here).

## 5. CRITICAL GAP — what is NOT available in this workspace
- ❌ **No UI Thing source repo** on disk (searched D:/ and the repo; only the *skill doc* exists at `.agents/skills/uithing`).
- ❌ **UI Thing CLI not installed** (`node_modules/ui-thing` missing; `ui-thing.config.*` missing).
- ❌ **UI Thing MCP not connected** (no `mcp__ui-thing__*` / `mcp__uithing__*` tools in this session — only the skill doc describes them).
- ❌ **Project is NOT Nuxt** — UI Thing components assume Nuxt auto-imports + Nuxt Content + `app/` dir; would need adaptation to Vite.
- ❌ **`tailwind-variants` not installed** — UI Thing's preferred styling engine; current setup uses `cva` instead.
- ⚠️ Public web search (2026-08) finds NO canonical "ui-thing" public repo/NPM package — closest is Nuxt UI. UI Thing appears to be a private/commercial offering; only its skill docs + CLI are referenced.

## 6. Risk assessment
- A full re-platform from shadcn-vue → UI Thing here is **not a drop-in swap**:
  - Requires UI Thing source/CLI (unavailable).
  - Requires porting Nuxt-only conventions to Vite.
  - Requires swapping `cva`+`cn` → `tv` across 243 files.
  - 68 consuming files keep the SAME public API either way (Button/Dialog/etc.), so the **safer, reversible** interpretation is an in-place *re-skin*: replace hand-tuned Tailwind classes with UI Thing's default class strings/tokens while keeping the reka-ui primitives and the `cn`/`cva` plumbing.
- Reka UI itself is **already** the primitive layer; it does not need "migration". The real work is **styling + naming conventions**.

## 7. Decision needed from user (see task_plan.md Open Questions)
- (a) Source of ui-thing defaults: provide repo/CLI access, or apply skill-doc token/class conventions in place?
- (b) Keep `cn`+`cva` plumbing, or full switch to `tv` (+ add tailwind-variants dep)?
- (c) Keep `@/components/ui/**` path & family names, or rename to Ui* + `app/components/Ui/**`?
- (d) Keep local customizations (Material Icons close button, custom Volt lib)?
- (e) Migration scope: all 36 families, or a phased subset (start with top consumers)?
