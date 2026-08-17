import { fireEvent, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createFolder } from './createFolder'

// NOTE: this test really creates and then deletes a folder (via the context
// menu + confirmation dialog), so it cleans up after itself. A tab opened by
// createFolder's "auto open tab" preference may remain (same trade-off as
// running createFolder alone). The "delete files too" checkbox is never
// ticked, so no media file is affected.

function findFolderNode(title: string): HTMLElement | null {
  return [...document.querySelectorAll<HTMLElement>('[data-folder-tree-node-id]')]
    .find((el) => {
      const id = el.getAttribute('data-folder-tree-node-id') ?? ''
      // Tag tree nodes reuse the same attribute with a "tag-" id prefix.
      return !id.startsWith('tag-') && (el.textContent ?? '').includes(title)
    }) ?? null
}

function requireFolderNode(title: string): HTMLElement {
  const node = findFolderNode(title)
  if (!node) throw new Error(`folder tree node "${title}" is not visible`)
  return node
}

function findDeleteMenuItem(): HTMLElement {
  const item = [...document.querySelectorAll<HTMLElement>('[data-slot="context-menu-item"]')]
    .find((el) => /^(删除|delete)$/i.test((el.textContent ?? '').trim()))
  if (!item) throw new Error('context menu "delete" item is not visible')
  return item
}

function requireAlertDialog(): HTMLElement {
  const dialog = document.querySelector<HTMLElement>('[data-slot="alert-dialog-content"]')
  if (!dialog) throw new Error('delete confirmation dialog is not visible')
  return dialog
}

function findDialogButton(dialog: HTMLElement, pattern: RegExp): HTMLButtonElement {
  const button = [...dialog.querySelectorAll<HTMLButtonElement>('button')]
    .find((el) => pattern.test((el.textContent ?? '').trim()))
  if (!button) throw new Error(`dialog button matching ${pattern.source} is not visible`)
  return button
}

async function openDeleteDialog(user: ReturnType<typeof userEvent.setup>, title: string): Promise<HTMLElement> {
  fireEvent.contextMenu(requireFolderNode(title))
  await waitFor(() => {
    findDeleteMenuItem()
  }, { timeout: 10_000 })
  await user.click(findDeleteMenuItem())
  await waitFor(() => {
    requireAlertDialog()
  }, { timeout: 10_000 })
  return requireAlertDialog()
}

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function deleteFolderDialog(): Promise<{ title: string; cancelKeptNode: boolean; deleted: boolean }> {
  console.info('[procm-ui-test] delete-folder-dialog started')
  const user = userEvent.setup()
  const { title } = await createFolder()

  // The freshly created folder must show up in the sidebar folder tree.
  await waitFor(() => {
    requireFolderNode(title)
  }, { timeout: 15_000 })

  // First attempt: cancelling the confirmation must keep the folder node.
  const dialog1 = await openDeleteDialog(user, title)
  if (!dialog1.querySelector('#deleteWithFiles')) {
    throw new Error('"delete with files" checkbox is missing from the delete dialog')
  }
  await user.click(findDialogButton(dialog1, /^(取消|cancel)$/i))
  await waitFor(() => {
    if (document.querySelector('[data-slot="alert-dialog-content"]')) {
      throw new Error('delete dialog is still open after cancelling')
    }
    requireFolderNode(title)
  }, { timeout: 10_000 })

  // Make sure the context menu from the previous round is fully closed.
  await waitFor(() => {
    if (document.querySelector('[data-slot="context-menu-content"]')) {
      throw new Error('context menu is still open')
    }
  }, { timeout: 10_000 })

  // Second attempt: confirm the delete (never tick the "delete files" checkbox).
  const dialog2 = await openDeleteDialog(user, title)
  if ((dialog2.querySelector('#deleteWithFiles') as HTMLInputElement | null)?.checked) {
    throw new Error('"delete with files" checkbox must stay unchecked')
  }
  await user.click(findDialogButton(dialog2, /^(删除|delete)$/i))

  await waitFor(() => {
    if (findFolderNode(title)) throw new Error(`folder tree node "${title}" is still visible after deletion`)
  }, { timeout: 15_000 })

  console.info('[procm-ui-test] delete-folder-dialog finished', title)
  return { title, cancelKeptNode: true, deleted: true }
}
