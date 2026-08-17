import { screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'

/**
 * 「文件夹管理」对话框（GroupedCardBrowserDialog + AnimatedFolderCard）真实页面测试：
 * 打开 → 断言标题与卡片列表（空库时断言空态）→ 搜索过滤 → 清空 → Escape 关闭。
 *
 * 选择器依据：
 * - 侧边栏工具栏按钮 title = views.sidebarToolbar.manageFolders（文件夹管理 / Manage folders）
 * - 对话框 DialogContent（reka Dialog, data-slot="dialog-content"）携带 .grouped-card-dialog class
 * - 卡片为 AnimatedFolderCard 根节点 .folder-card-wrap
 * - 空态文案 business.groupedCardBrowserDialog.empty / notFound
 */

const MANAGE_FOLDERS_TITLE = /文件夹管理|manage\s*folders/i

function isVisible(element: Element): boolean {
  const el = element as HTMLElement
  return el.getClientRects().length > 0 && el.offsetParent !== null
}

/** 桌面侧栏与移动抽屉可能同时挂载工具栏，仅点击可见按钮 */
function findManageFoldersButton(): HTMLButtonElement {
  const candidates = screen.getAllByTitle(MANAGE_FOLDERS_TITLE)
  const button = candidates.find(isVisible) ?? candidates[0]
  if (!button) throw new Error('manage folders toolbar button is not available')
  return button as HTMLButtonElement
}

function getFolderManageDialog(): HTMLElement {
  const dialog = document.querySelector<HTMLElement>('[data-slot="dialog-content"].grouped-card-dialog')
  if (!dialog) throw new Error('folder manage dialog is not open')
  return dialog
}

function countFolderCards(dialog: HTMLElement): number {
  return dialog.querySelectorAll('.folder-card-wrap').length
}

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function manageDialogs(): Promise<{
  opened: boolean
  initialCount: number
  filteredCount: number
  closed: boolean
}> {
  console.info('[procm-ui-test] manage-dialogs started')
  const user = userEvent.setup()

  await user.click(findManageFoldersButton())

  await waitFor(() => {
    const dialog = getFolderManageDialog()
    const text = dialog.textContent ?? ''
    if (!/文件夹管理|folder\s*management/i.test(text)) {
      throw new Error('folder manage dialog opened but its title is missing')
    }
  }, { timeout: 10_000 })

  const dialog = getFolderManageDialog()
  const initialCount = countFolderCards(dialog)
  if (initialCount === 0) {
    const text = dialog.textContent ?? ''
    if (!/暂无.*可展示|no\s+folders?\s+to\s+display/i.test(text)) {
      throw new Error('empty library should render the folder empty state')
    }
  }

  const searchInput = dialog.querySelector<HTMLInputElement>('input[type="text"]')
  if (!searchInput) throw new Error('folder manage dialog search input is not found')

  const nonsenseQuery = `procm-no-match-${Date.now()}`
  await user.clear(searchInput)
  await user.type(searchInput, nonsenseQuery)

  await waitFor(() => {
    const current = getFolderManageDialog()
    const count = countFolderCards(current)
    if (count !== 0) throw new Error(`nonsense query should match no folder cards, but ${count} remain`)
    const text = current.textContent ?? ''
    if (!/未找到匹配|no\s+matching\s+folders?/i.test(text)) {
      throw new Error('not-found empty state is missing after filtering')
    }
  }, { timeout: 10_000 })
  const filteredCount = countFolderCards(getFolderManageDialog())

  const clearButton = Array.from(getFolderManageDialog().querySelectorAll<HTMLButtonElement>('button'))
    .find(button => /清除|clear/i.test(button.title ?? ''))
  if (clearButton) {
    await user.click(clearButton)
  } else {
    await user.clear(searchInput)
  }

  await waitFor(() => {
    const count = countFolderCards(getFolderManageDialog())
    if (count !== initialCount) {
      throw new Error(`clearing search should restore ${initialCount} cards, got ${count}`)
    }
  }, { timeout: 10_000 })

  await user.keyboard('{Escape}')
  await waitFor(() => {
    if (document.querySelector('.grouped-card-dialog')) {
      throw new Error('folder manage dialog did not close after Escape')
    }
  }, { timeout: 10_000 })

  console.info('[procm-ui-test] manage-dialogs finished', { initialCount, filteredCount })
  return { opened: true, initialCount, filteredCount, closed: true }
}
