# Task Plan — Migrate reka-ui (shadcn-vue style) → ui-thing defaults

> Goal: Replace the hand-tuned shadcn-vue styling on `src/components/ui/**` with **UI Thing's default styles**, switch the styling engine to `tailwind-variants` (`tv`), and **delete the unused component families**. Keep paths, family names (`Button`, `Dialog`…), the `cn`-free boundary, and reka-ui primitives. Consumers (68 files) keep working with **zero import changes**.

## Confirmed decisions (from user)
1. **Source of ui-thing defaults**: `ui-thing` is a real public package — `pnpm dlx ui-thing@latest ...` (v0.3.1, MIT). CLI is Nuxt-only, so we run it in a throwaway Nuxt sandbox to *harvest the source files it writes* (`.vue`/`index.ts`/tokens), then port them into this Vite project. Themes come from the shadcn/ui theme page → applied directly to our Tailwind v4 CSS. See [findings.md](./findings.md).
2. **Styling engine**: switch **cva + cn → `tv` + `normalizeClass`** (add `tailwind-variants` dep).
3. **Scope & naming**: keep `@/components/ui/**` paths + family names + `@volt` alias; **delete the 8 families with zero consumers**.
4. Local customizations (Material Icons close button, etc.) are preserved unless the family is deleted.

## Family inventory (consumers = external files referencing the family)
**DELETE (0 consumers)**: `accordion`, `collapsible`, `command`, `drawer`, `navigation-menu`, `pagination`, `scroll-area`, `volt`.
**KEEP & MIGRATE (28)**: button(24), dialog(13), checkbox(12), input(11), tooltip(10), select(6), progress(6), alert-dialog(5), switch(5), popover(4), toggle(3), table(3), label(3), context-menu(3), card(3), badge(3), toggle-group(2), tabs(2), radio-group(2), textarea, stepper, sonner, slider, sheet, separator, resizable, hover-card, empty, dropdown-menu, calendar, avatar, alert.

## Phases

### Phase 0 — Pre-flight & sandbox harvest  `[pending]`
- Add dep `tailwind-variants` to `packages/mira-client/package.json`.
- Create throwaway Nuxt sandbox: `pnpm dlx nuxi init .sandbox-uithing` → `pnpm dlx ui-thing@latest init` → `pnpm dlx ui-thing@latest add button dialog checkbox input tooltip select progress alert-dialog switch popover toggle table label context-menu card badge toggle-group tabs radio-group textarea stepper sonner slider sheet separator resizable hover-card empty dropdown-menu calendar avatar alert -a`.
- Copy harvested `app/components/Ui/**` + `app/utils/*` + theme CSS into `.sandbox-uithing/harvested/` for reference.
- Update `findings.md` with the harvested file list + any helper utilities UI Thing ships (e.g. `tv` wrappers, `normalizeClass` usage).
- **Exit gate**: harvested sources exist for every KEEP family; sandbox build passes.

### Phase 1 — Theme / tokens  `[pending]`
- Run `pnpm dlx ui-thing@latest theme` (or copy from shadcn/ui theme page) to get the canonical token CSS. Diff against current `src/renderer/assets/main.css` + `src/renderer/styles/theme.css`.
- Merge semantic tokens (`--background`, `--foreground`, `--border`, `--popover`, `--muted-foreground`, `--ring`, radius, etc.) into our CSS. Preserve any mira-specific tokens (dark mode vars, app chrome). Back up the originals first.
- Confirm tokens resolve in the running app (a `<Button>` renders with ui-thing colors).
- **Exit gate**: visual sanity check on one screen; no missing CSS var warnings.

### Phase 2 — Styling engine swap (`cva`+`cn` → `tv`)  `[pending]`
- Replace `src/lib/utils.ts` `cn()` usage at the *boundary*: add a `tv`-based pattern. Keep `cn` temporarily for non-migrated files; remove at the end.
- Migrate each KEEP family's `index.ts`: `cva(...) → tv({...})`; keep exported `*Variants` types and names so consumers compile unchanged.
- **Exit gate**: `pnpm type-check` green; `pnpm build` green.

### Phase 3 — Component re-skin, batch by complexity  `[pending]`
Migrate `.vue` wrappers to ui-thing default classes (harvested in Phase 0), family-by-family. Keep: reka-ui primitives, `useForwardPropsEmits`/`reactiveOmit`, `data-slot`, public props (`class?: HTMLAttributes["class"]`), local customizations (Material Icons close button etc.).
- **3a — Leaf/simple (do first as template)**: button, badge, input, textarea, label, separator, alert, progress, slider, switch, checkbox, avatar, empty. (Validate the pattern end-to-end here.)
- **3b — Menus & overlays**: tooltip, popover, dropdown-menu, context-menu, hover-card, select, sheet, dialog, alert-dialog.
- **3c — Data/structure**: table, card, tabs, toggle, toggle-group, radio-group, resizable, calendar, stepper, sonner.
- After each batch: type-check + build + quick visual smoke on the screens that use it (record in progress.md).
- **Exit gate**: all 28 families migrated; build green; no `cva`/`cn` left in `src/components/ui/**`.

### Phase 4 — Delete unused families  `[pending]`
- Remove the 8 unused dirs: `accordion`, `collapsible`, `command`, `drawer`, `navigation-menu`, `pagination`, `scroll-area`, `volt`. (volt is inside `components/ui/` — confirm no `@volt/*` consumer first; current scan = 0.)
- Remove now-orphan deps if any (e.g. `vaul-vue` if only `drawer` used it — verify with `dependency-cruiser`/grep before removing).
- **Exit gate**: `pnpm build` + `pnpm type-check` green; grep shows no dangling imports.

### Phase 5 — Cleanup & verify  `[pending]`
- Remove `class-variance-authority` from deps if nothing else uses it; remove `cn` helper if no consumer remains.
- Update `src/components/ui/CLAUDE.md` to reflect ui-thing + tv (replace the "shadcn-ui" description, family table, dep list).
- Full `pnpm build:prod` + `pnpm lint` + `pnpm type-check`.
- Manual smoke test of key screens (whatever uses button/dialog/input/select/tooltip heaviest).
- **Exit gate**: all green; findings/progress finalized; summary to user.

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| _(none yet — research/planning only)_ | | |

## Open Questions / Risks
- **ui-thing CLI is Nuxt-only**: it edits `nuxt.config` + relies on auto-imports. Mitigation = harvest source files in a sandbox, port manually. If `add` refuses non-Nuxt, run inside the sandbox (Phase 0).
- **shadcn vs ui-thing class differences** may shift visual details (radius, ring, animation). User asked for "ui-thing default styles" — accept defaults; note deviations in progress.md.
- **tailwindcss-animate / tw-animate equivalence**: ui-thing uses Reka's data-state animations + Tailwind v4 — verify `animate-in/out` utilities still resolve (may need `tw-animate-css` or equivalent). Check in Phase 1.
- If harvesting fails (no network / CLI broken), fall back to: apply the skill's *conventions* (tv, semantic tokens, data-slot) in place without 1:1 ui-thing source — flag to user first.
