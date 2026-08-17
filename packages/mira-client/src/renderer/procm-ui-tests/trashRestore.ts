import { fireEvent, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'

/**
 * 安全铁律：回收站内的「恢复 / 彻底删除 / 清空回收站」均为真实不可逆/有损操作，
 * 本测试只断言相关按钮与确认框存在，绝不点击执行；确认框只走「取消」分支。
 *
 * 关键 DOM 依据：
 * - 回收站分类入口：[data-folder-tree-node-id="trash"]（SidebarModuleList.vue），
 *   激活态 .cat-item--active；trash 项包在 ContextMenuTrigger 内，右键出「清空回收站」菜单。
 * - 回收站 tab 内容：MediaTabListView.vue 根节点 .media-list-view，素材项 [data-selectable-id]。
 * - 选中素材后浮动工具栏（MediaTabListView.vue ~L194-246）：
 *   「恢复」按钮 title="恢复文件 (N)"（icon 文本 restore），「彻底删除」title="彻底删除 (N)"（icon delete_forever），
 *   「取消选择」title="取消选择"。
 * - 清空确认框：App.vue 全局 AlertDialog（useConfirm/useHomeEventHandlers.handleEmptyTrash），
 *   [data-slot="alert-dialog-content"]，接受按钮「清空」、拒绝按钮「取消」。
 */

function getTabButtons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[data-active-tab]'))
}

function getActiveTabLabel(): string {
  const active = getTabButtons().find((btn) => btn.getAttribute('data-active-tab') === 'true')
  return (active?.textContent ?? '').trim()
}

function getTrashCategoryItem(): HTMLElement {
  const el = document.querySelector('[data-folder-tree-node-id="trash"]')
  if (!el) throw new Error('sidebar trash category item [data-folder-tree-node-id="trash"] is not rendered')
  return el as HTMLElement
}

function getSelectableMediaItems(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.media-list-view [data-selectable-id]'))
}

function findToolbarButton(labelRe: RegExp): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.media-list-view button'))
    .find((btn) => labelRe.test(btn.getAttribute('title') ?? '') || labelRe.test(btn.textContent ?? ''))
}

function findAlertDialogButton(textRe: RegExp): HTMLButtonElement | undefined {
  const dialog = document.querySelector('[data-slot="alert-dialog-content"]')
  if (!dialog) return undefined
  return Array.from(dialog.querySelectorAll<HTMLButtonElement>('button'))
    .find((btn) => textRe.test((btn.textContent ?? '').trim()))
}

async function closeTabAndWait(tabButton: HTMLButtonElement, user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const closeBtn = tabButton.querySelector('button')
  if (!closeBtn) throw new Error('close button not found on test-opened tab')
  await user.click(closeBtn)
  await waitFor(() => {
    if (document.body.contains(tabButton)) throw new Error('test-opened tab was not removed from the tabs bar')
  }, { timeout: 10_000 })
}

/** 等待回收站列表条数稳定（加载数据是异步的：连续多次采样不变，或已有条目后短时间不变）。 */
async function waitForStableTrashCount(timeout = 10_000): Promise<number> {
  let last = -1
  let stableSamples = 0
  await waitFor(() => {
    const count = getSelectableMediaItems().length
    if (count !== last) {
      last = count
      stableSamples = 0
      throw new Error('trash item count is still changing while loading')
    }
    stableSamples += 1
    // 有内容：约 0.75s 不变即认为稳定；空列表：约 2s 不变才认定为真空
    const need = last > 0 ? 3 : 8
    if (stableSamples < need) throw new Error('waiting for the trash list to settle')
  }, { timeout, interval: 250 })
  return last
}

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function trashRestore(): Promise<{
  trashOpened: boolean
  trashFilesCount: number
  restoreButtonAvailable: boolean
  purgeButtonAvailable: boolean
  purgeConfirmCancelled: boolean
  selectionCleared: boolean
  trashListUnchanged: boolean
  closedTestTabs: string[]
}> {
  console.info('[procm-ui-test] trash-restore started')
  const user = userEvent.setup()

  // 记录测试前的 tab 状态，用于结束时的恢复
  const beforeTabLabels = getTabButtons().map((btn) => (btn.textContent ?? '').trim())
  const beforeActiveTabLabel = getActiveTabLabel()

  // 1) 点击「回收站」分类 → 激活态 + 回收站 tab 打开
  const trashItem = getTrashCategoryItem()
  await user.click(trashItem)
  await waitFor(() => {
    if (!trashItem.classList.contains('cat-item--active')) {
      throw new Error('trash category item did not get the .cat-item--active class')
    }
    if (!/回收站|trash/i.test(getActiveTabLabel())) {
      throw new Error('active tab in the tabs bar is not the trash tab')
    }
    if (!document.querySelector('.media-list-view')) {
      throw new Error('trash tab content (.media-list-view) did not render')
    }
  }, { timeout: 15_000 })

  // 2) 数回收站内可选素材数 N
  const trashFilesCount = await waitForStableTrashCount()

  // 3) N ≥ 1：选中第一个素材，断言浮动工具栏的「恢复 / 彻底删除」存在且可用（绝不点击）
  let restoreButtonAvailable = false
  let purgeButtonAvailable = false
  let selectionCleared = false
  if (trashFilesCount >= 1) {
    const firstItem = getSelectableMediaItems()[0]
    if (!firstItem) throw new Error('trash item disappeared before clicking')
    await user.click(firstItem)

    await waitFor(() => {
      const restoreBtn = findToolbarButton(/恢复|restore/i)
      if (!restoreBtn) throw new Error('trash floating toolbar restore button is not visible after selecting an item')
      if (restoreBtn.disabled) throw new Error('trash restore button is unexpectedly disabled')
      restoreButtonAvailable = true
    }, { timeout: 10_000 })

    await waitFor(() => {
      const purgeBtn = findToolbarButton(/彻底删除|delete.?forever|permanently|purge/i)
      if (!purgeBtn) throw new Error('trash floating toolbar purge button is not visible')
      if (purgeBtn.disabled) throw new Error('trash purge button is unexpectedly disabled')
      purgeButtonAvailable = true
    }, { timeout: 10_000 })

    // 还原：点「取消选择」，断言恢复/彻底删除按钮消失、无选中残留
    const clearBtn = findToolbarButton(/取消选择|clear.?selection/i)
    if (!clearBtn) throw new Error('"clear selection" toolbar button not found')
    await user.click(clearBtn)
    await waitFor(() => {
      if (findToolbarButton(/恢复|restore/i)) throw new Error('restore button still visible after clearing selection')
      if (findToolbarButton(/彻底删除|delete.?forever|permanently|purge/i)) throw new Error('purge button still visible after clearing selection')
      if (document.querySelector('.media-list-view .media-item.selected')) {
        throw new Error('a media item still has the .selected class after clearing selection')
      }
      selectionCleared = true
    }, { timeout: 10_000 })
  }

  // 4) 「清空回收站」确认框：只走取消分支，绝不点「清空」
  fireEvent.contextMenu(getTrashCategoryItem())
  await waitFor(() => {
    const item = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="context-menu-item"]'))
      .find((el) => /清空回收站|empty.?trash/i.test(el.textContent ?? ''))
    if (!item) throw new Error('trash context menu did not open with the "empty trash" item')
  }, { timeout: 10_000 })

  const emptyTrashItem = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="context-menu-item"]'))
    .find((el) => /清空回收站|empty.?trash/i.test(el.textContent ?? ''))
  if (!emptyTrashItem) throw new Error('"empty trash" context menu item not found')
  await user.click(emptyTrashItem)

  await waitFor(() => {
    const dialog = document.querySelector('[data-slot="alert-dialog-content"]')
    if (!dialog) throw new Error('empty-trash confirm dialog did not appear')
    const title = dialog.querySelector('[data-slot="alert-dialog-title"]')?.textContent ?? ''
    if (!/清空回收站|empty.?trash/i.test(title)) throw new Error('confirm dialog title does not match "empty trash"')
    const description = dialog.querySelector('[data-slot="alert-dialog-description"]')?.textContent ?? ''
    if (!/不可撤销|cannot be undone|irreversible/i.test(description)) {
      throw new Error('confirm dialog description does not mention the irreversible warning')
    }
  }, { timeout: 10_000 })

  const acceptBtn = findAlertDialogButton(/^清空$|^empty$/i)
  const cancelBtn = findAlertDialogButton(/^取消$|^cancel$/i)
  if (!acceptBtn) throw new Error('confirm dialog accept button ("empty") not found — refusing to proceed without a cancel path')
  if (!cancelBtn) throw new Error('confirm dialog cancel button not found')

  // 只点「取消」，断言对话框关闭且回收站列表未变
  await user.click(cancelBtn)
  let trashListUnchanged = false
  await waitFor(() => {
    if (document.querySelector('[data-slot="alert-dialog-content"]')) {
      throw new Error('confirm dialog did not close after clicking cancel')
    }
  }, { timeout: 10_000 })
  await waitFor(() => {
    if (getSelectableMediaItems().length !== trashFilesCount) {
      throw new Error('trash list changed after cancelling the empty-trash confirm dialog')
    }
    trashListUnchanged = true
  }, { timeout: 10_000 })

  // 5) 清理：仅关闭本测试打开的 tab，恢复原激活 tab
  const closedTestTabs: string[] = []
  for (let guard = 0; guard < 10; guard += 1) {
    const extra = getTabButtons()
      .find((btn) => !beforeTabLabels.includes((btn.textContent ?? '').trim()))
    if (!extra) break
    const label = (extra.textContent ?? '').trim()
    await closeTabAndWait(extra, user)
    closedTestTabs.push(label)
  }
  const originalTab = getTabButtons().find((btn) => (btn.textContent ?? '').trim() === beforeActiveTabLabel)
  if (originalTab && originalTab.getAttribute('data-active-tab') !== 'true') {
    await user.click(originalTab)
  }

  console.info('[procm-ui-test] trash-restore finished', {
    trashFilesCount, restoreButtonAvailable, purgeButtonAvailable, closedTestTabs,
  })
  return {
    trashOpened: true,
    trashFilesCount,
    restoreButtonAvailable,
    purgeButtonAvailable,
    purgeConfirmCancelled: true,
    selectionCleared,
    trashListUnchanged,
    closedTestTabs,
  }
}
