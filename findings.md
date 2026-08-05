# Findings & Decisions

## Requirements
- Convert the attached React/motion folder component into HTML/CSS/JavaScript.
- Use it in the existing floating-ball window.
- Open and animate the folder while receiving files.
- Preserve drag, click, upload, and macOS hit-testing behavior.
- Eagle extension broadcasts before image download with a stable agreed ID.
- Download failure and successful import update the same notification by ID.
- Imports occurring within a short interval combine thumbnails into one notification.

## Research Findings
- The floating window loads Vue as a global script and is not part of the React/shadcn renderer.
- Existing state already exposes `isDragover` and `isFileReceived`.
- The original 64x64 BrowserWindow clips the reference component's fanned pages.
- Existing dirty diff changes import notification duration from 4s to 60s and serializes notification callback data with `Vue.toRaw()`.
- No existing stable-ID notification update behavior was found in the inspected diff.
- Eagle plugin entry is `plugins/plugins/mira_eagle_extension/index.ts`.
- Renderer already aggregates `file::created` events over 800ms, but currently retains one last thumbnail and calls `show()` to create a new notification.
- Main-process notification slots use internal numeric IDs; `notification:window-show` always creates a slot and exposes no caller-selected update key.
- Minimal protocol direction: add a caller-provided business `notificationId`; update an existing slot when the key matches, otherwise create it.
- Eagle plugin already calls backend `broadcastLibraryEvent(libraryId, event, payload)` and broadcasts `file::created` itself.
- The plugin can emit a prepare/failure lifecycle event without changing server infrastructure, and attach the same ID to its successful `file::created` payload.
- Protocol chosen: `eagle::import-notification` with `{ id, status: 'preparing' | 'failed', name, libraryId }`; successful `file::created` includes `notificationId`.
- A URL-reference fallback still means the image download failed for notification purposes, while `file::created` must continue to refresh the library.
- Renderer will alias IDs arriving in one short batch to the first display notification ID, so every source ID can update the same merged card.
- Multiple thumbnails require an `icons` payload field and a small thumbnail-stack/grid renderer in the notification window; the current payload supports only one `icon`.
- Main-process slot stores the latest payload so updates arriving before `did-finish-load` are not lost.
- `git diff --check` only reports pre-existing trailing whitespace in `LoginView.vue`; task files have no whitespace errors.
- Renderer, main-process, floating-window, and Eagle plugin builds all pass.
- Vue runtime template compilation passes for the multi-thumbnail notification template.

## Technical Decisions
| Decision | Rationale |
|---|---|
| Recreate pages and folder panels with div elements | Keeps the standalone window dependency-free |
| Retain Material Icons only for add/check status | Font is already bundled locally |

## Resources
- `/Users/Zhuanz/.codex/attachments/ef002896-9814-45e6-ad16-3f05e2a48ef0/pasted-text.txt`
- `packages/mira-client/src/floating-ball-window/`
- `handoff/notification-window.md`
