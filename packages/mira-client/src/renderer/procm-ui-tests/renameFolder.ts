import { fireEvent, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createFolder } from './createFolder'

// NOTE: this test really creates, renames and then deletes a folder (via the
// context menu + confirmation dialog, never ticking "delete with files"), so
// it cleans up after itself; any auto-opened tab is closed too. Selectors
// verified against source:
// - Sidebar folder tree nodes: [data-folder-tree-node-id] inside
//   .folder-tree-container (tag nodes reuse the attribute with "tag-" prefix).
// - Folder tree context menu items: [data-slot="context-menu-item"],
//   "编辑" = business.folderOperations.edit (useFolderOperations.ts).
// - FolderEditDialog is teleported to body: content [data-slot="dialog-content"],
//   title input #folderTitle; in edit mode it is prefilled via watch(visible)
//   and the submit button reads "更新/Update" instead of "创建/Create".
// - Delete confirmation: [data-slot="alert-dialog-content"] with the
//   #deleteWithFiles checkbox (must stay unchecked) and a destructive
//   "删除/Delete" action button.

function getFolderTreeContainer(): HTMLElement {
  const el = document.querySelector('.folder-tree-container')
  if (!el) throw new Error('folder tree container is not rendered in the sidebar')
  return el as HTMLElement
}

function findFolderTreeNode(title: string): HTMLElement | null {
  return Array.from(getFolderTreeContainer().querySelectorAll<HTMLElement>('[data-folder-tree-node-id]'))
    .find((el) => {
      const id = el.getAttribute('data-folder-tree-node-id') ?? ''
      // Tag tree nodes reuse the same attribute with a "tag-" id prefix.
      return !id.startsWith('tag-') && (el.textContent ?? '').includes(title)
    }) ?? null
}

function findContextMenuItem(labelRe: RegExp): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-slot="context-menu-item"]'))
    .find((el) => labelRe.test((el.textContent ?? '').trim()))
}

function getTabButtons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[data-active-tab]'))
}

function findTabButton(matches: (text: string) => boolean): HTMLButtonElement | undefined {
  return getTabButtons().find((btn) => matches(btn.textContent ?? ''))
}

async function closeTabAndWait(tabButton: HTMLButtonElement, user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const closeBtn = tabButton.querySelector('button')
  if (!closeBtn) throw new Error('close button not found on test-opened tab')
  await user.click(closeBtn)
  await waitFor(() => {
    if (document.body.contains(tabButton)) throw new Error('test-opened tab was not removed from the tabs bar')
  }, { timeout: 10_000 })
}

/** FolderEditDialog 内容根节点（Teleport 到 body 后仍可全局查到） */
function getEditDialog(): HTMLElement {
  const input = document.querySelector<HTMLInputElement>('#folderTitle')
  if (!input) throw new Error('folder edit dialog did not open (#folderTitle not found)')
  const dialog = input.closest<HTMLElement>('[data-slot="dialog-content"]')
  if (!dialog) throw new Error('folder edit dialog content is not visible')
  return dialog
}

function queryDialogButton(dialog: HTMLElement, pattern: RegExp): HTMLButtonElement | undefined {
  return Array.from(dialog.querySelectorAll<HTMLButtonElement>('button'))
    .find((el) => pattern.test((el.textContent ?? '').trim()))
}

function findDialogButton(dialog: HTMLElement, pattern: RegExp): HTMLButtonElement {
  const button = queryDialogButton(dialog, pattern)
  if (!button) throw new Error(`dialog button matching ${pattern.source} is not visible`)
  return button
}

/** 通过 window.miraSDK（web-globals.ts 注入）按标题查找并删除测试文件夹（不删文件） */
async function deleteFolderViaSdk(title: string): Promise<boolean> {
  try {
    const sdk = (window as any).miraSDK
    if (!sdk || typeof sdk.getLibraries !== 'function'
      || typeof sdk.getAllFolders !== 'function' || typeof sdk.deleteFolder !== 'function') {
      return false
    }
    const libraries = await sdk.getLibraries()
    for (const lib of libraries ?? []) {
      const folders = await sdk.getAllFolders(lib.id)
      const hit = (folders ?? []).find((f: any) => f && (f.title === title || f.name === title))
      if (hit) {
        await sdk.deleteFolder(lib.id, Number(hit.id), false)
        return true
      }
    }
    return false
  } catch (error) {
    console.warn('[procm-ui-test] rename-folder failed to delete test folder via SDK', title, error)
    return false
  }
}

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function renameFolder(): Promise<{
  renamedTo: string
  dialogPrefilled: boolean
  updateButtonUsed: boolean
  cleanedUp: boolean
}> {
  console.info('[procm-ui-test] rename-folder started')
  const user = userEvent.setup()
  const { title: oldTitle } = await createFolder()
  const newTitle = `procm-ui-ren-${Date.now()}`
  if (newTitle === oldTitle || newTitle.includes(oldTitle) || oldTitle.includes(newTitle)) {
    throw new Error(`generated titles collide: "${oldTitle}" vs "${newTitle}"`)
  }

  const node = await waitFor(() => {
    const el = findFolderTreeNode(oldTitle)
    if (!el) throw new Error(`folder tree node "${oldTitle}" is not visible yet`)
    return el as HTMLElement
  }, { timeout: 15_000 })

  // 1) 树节点右键 → 菜单「编辑」→ FolderEditDialog 打开
  fireEvent.contextMenu(node)
  const editItem = await waitFor(() => {
    const item = findContextMenuItem(/^(编辑|edit)$/i)
    if (!item) throw new Error('context menu "edit" item is not visible')
    return item as HTMLElement
  }, { timeout: 10_000 })
  await user.click(editItem)

  // 2) 对话框打开且回填旧标题（FolderEditDialog watch(visible) 回填逻辑）
  const dialogPrefilled = await waitFor(() => {
    const dlg = getEditDialog()
    if (!/编辑|edit/i.test(dlg.textContent ?? '')) throw new Error('edit dialog title text is missing')
    const input = dlg.querySelector<HTMLInputElement>('#folderTitle')
    if (!input) throw new Error('#folderTitle input is not visible in the edit dialog')
    if (input.value !== oldTitle) throw new Error(`edit dialog should prefill "${oldTitle}", got "${input.value}"`)
    return true
  }, { timeout: 10_000 })

  // 3) 清空并输入新标题
  const dialog = getEditDialog()
  const titleInput = dialog.querySelector<HTMLInputElement>('#folderTitle')!
  await user.clear(titleInput)
  await user.type(titleInput, newTitle)

  // 4) isEdit 分支：按钮必须是「更新」而不是「创建」
  const updateButton = findDialogButton(dialog, /^(更新|update)$/i)
  if (queryDialogButton(dialog, /^(创建|create)$/i)) {
    throw new Error('edit dialog must not show a "create" submit button')
  }
  await user.click(updateButton)
  const updateButtonUsed = true

  // 5) 保存成功：对话框关闭，树节点出现新名、旧名消失（updateFolder → refresh-folders）
  await waitFor(() => {
    if (document.querySelector('#folderTitle')) throw new Error('edit dialog did not close after update')
    if (!findFolderTreeNode(newTitle)) throw new Error(`renamed folder node "${newTitle}" is not visible yet`)
    if (findFolderTreeNode(oldTitle)) throw new Error(`old folder node "${oldTitle}" is still visible after rename`)
  }, { timeout: 15_000 })

  // 6) 清理：关闭 createFolder「自动打开」可能残留的 tab（旧名或新名）
  let leftover = findTabButton((text) => text.includes(oldTitle) || text.includes(newTitle))
  while (leftover) {
    await closeTabAndWait(leftover, user)
    leftover = findTabButton((text) => text.includes(oldTitle) || text.includes(newTitle))
  }

  // 7) 清理：右键新节点 →「删除」→ 确认框（绝不勾选「同时删除文件」）
  let cleanedUp = false
  const renamedNode = findFolderTreeNode(newTitle)
  if (renamedNode) {
    fireEvent.contextMenu(renamedNode)
    const deleteItem = await waitFor(() => {
      const item = findContextMenuItem(/^(删除|delete)$/i)
      if (!item) throw new Error('context menu "delete" item is not visible')
      return item as HTMLElement
    }, { timeout: 10_000 })
    await user.click(deleteItem)

    const confirmDialog = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('[data-slot="alert-dialog-content"]')
      if (!el) throw new Error('delete confirmation dialog is not visible')
      return el
    }, { timeout: 10_000 })
    const withFiles = confirmDialog.querySelector<HTMLInputElement>('#deleteWithFiles')
    if (!withFiles) throw new Error('"delete with files" checkbox is missing from the delete dialog')
    if (withFiles.checked) throw new Error('"delete with files" checkbox must stay unchecked')
    await user.click(findDialogButton(confirmDialog, /^(删除|delete)$/i))

    try {
      await waitFor(() => {
        if (findFolderTreeNode(newTitle)) throw new Error(`folder node "${newTitle}" is still visible after deletion`)
      }, { timeout: 15_000 })
      cleanedUp = true
    } catch (error) {
      console.warn('[procm-ui-test] rename-folder UI delete not confirmed, falling back to SDK', error)
    }
  }

  // 8) 兜底：UI 删除未确认时用 SDK 清掉（旧名/新名都查一遍）
  if (!cleanedUp) {
    const deletedViaSdk = (await deleteFolderViaSdk(newTitle)) || (await deleteFolderViaSdk(oldTitle))
    if (deletedViaSdk) {
      window.dispatchEvent(new Event('refresh-folders'))
      try {
        await waitFor(() => {
          if (findFolderTreeNode(newTitle) || findFolderTreeNode(oldTitle)) {
            throw new Error('test folder is still visible in the sidebar tree after SDK cleanup')
          }
        }, { timeout: 10_000 })
        cleanedUp = true
      } catch (error) {
        console.warn('[procm-ui-test] rename-folder sidebar tree refresh not confirmed', error)
      }
    }
  }

  console.info('[procm-ui-test] rename-folder finished', { oldTitle, newTitle, cleanedUp })
  return { renamedTo: newTitle, dialogPrefilled, updateButtonUsed, cleanedUp }
}
