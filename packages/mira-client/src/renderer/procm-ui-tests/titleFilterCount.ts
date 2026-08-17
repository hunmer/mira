import { waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { ensureMediaTab } from './helpers'

/**
 * 标题筛选计数（FilterBar title 过滤器 → MediaTabListView「素材」计数徽标）。
 *
 * 关键 DOM（源码核实）：
 * - FilterBar.vue：每个 filter rule 一个 Dropdown；title 规则 trigger 按钮内
 *   material-icons 连字文本为 'title'（useFilters.ts 中 icon: 'title'）。
 *   下拉面板（reka Popover，teleport 到 body）内 h3 为「标题筛选 / Title Filter」，
 *   Input 为面板中唯一 input；底部「清除 / Clear」按钮清空并关闭面板。
 * - MediaTabListView.vue：素材区 header 的 h3 为「素材 / Media」，
 *   徽标 span（class 含 inline-flex）显示 filteredMediaItems.length。
 * - 空态：三种视图（grid/list/waterfall）items 为空时渲染「暂无文件 / No files」。
 */

function isVisible(element: Element): boolean {
  return element.getClientRects().length > 0
}

/** 当前打开的 reka Popover 面板（teleport 到 body，带 data-slot="popover-content"）。 */
function findVisiblePopover(): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>('[data-slot="popover-content"]')).find((element) =>
      isVisible(element),
    ) ?? null
  )
}

/** 可见 FilterBar 内 material 图标连字文本等于 name 的按钮。 */
function findFilterTriggerByIcon(iconName: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('.filter-bar button'))
    .filter((element) => isVisible(element))
    .find((element) => (element.querySelector('.material-icons')?.textContent ?? '').trim() === iconName)
  if (!button) throw new Error(`filter bar trigger with material icon "${iconName}" is not available`)
  return button
}

/** 「素材 / Media」header 的计数徽标值（MediaTabListView.vue 约 104-107 行）。 */
function readMediaCountBadge(): number | null {
  const heading = Array.from(document.querySelectorAll<HTMLElement>('header h3'))
    .filter((element) => isVisible(element))
    .find((element) => /^(素材|media)$/i.test((element.textContent ?? '').trim()))
  const badge = heading?.parentElement?.querySelector('span.inline-flex')
  if (!badge) return null
  const parsed = Number.parseInt((badge.textContent ?? '').trim(), 10)
  return Number.isFinite(parsed) ? parsed : null
}

/** 页面上可见的媒体条目数（三种视图条目根节点都带 data-selectable-id）。 */
function countVisibleMediaItems(): number {
  return Array.from(document.querySelectorAll('[data-selectable-id]')).filter((element) => isVisible(element))
    .length
}

/** 是否出现空态文案「暂无文件 / No files」（三视图共用 emptyTitle）。 */
function hasMediaEmptyState(): boolean {
  return Array.from(document.querySelectorAll('body *'))
    .filter((element) => isVisible(element) && element.children.length === 0)
    .some((element) => /^(暂无文件|no files)$/i.test((element.textContent ?? '').trim()))
}

/** 打开标题筛选下拉并等待面板出现，返回面板元素。 */
async function openTitleFilterPanel(
  user: ReturnType<typeof userEvent.setup>,
): Promise<HTMLElement> {
  await user.click(findFilterTriggerByIcon('title'))
  return waitFor(
    () => {
      const panel = findVisiblePopover()
      if (!panel || !/标题筛选|title filter/i.test(panel.textContent ?? '')) {
        throw new Error('title filter dropdown did not open')
      }
      return panel
    },
    { timeout: 10_000 },
  )
}

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function titleFilterCount(): Promise<{
  initialCount: number
  filteredCount: 0
  restoredCount: number
  filterCleared: boolean
}> {
  console.info('[procm-ui-test] title-filter-count started')
  const user = userEvent.setup()
  await ensureMediaTab('[data-selectable-id]')

  const initialCount = await waitFor(() => {
    const count = readMediaCountBadge()
    if (count === null) throw new Error('media count badge (素材 header) is not readable')
    return count
  }, { timeout: 15_000 })
  if (initialCount < 1) {
    throw new Error(`media count badge shows ${initialCount}; need at least 1 media item to run this test`)
  }

  // 打开标题筛选并输入不可能匹配的串
  const panel = await openTitleFilterPanel(user)
  const titleInput = panel.querySelector<HTMLInputElement>('input')
  if (!titleInput) throw new Error('title filter input is not available in the dropdown panel')
  const noMatchKeyword = `zzz-procm-no-match-${Date.now()}`
  await user.clear(titleInput)
  await user.type(titleInput, noMatchKeyword)

  // 断言：可见媒体条目归零，且计数徽标为 0 或出现空态文案
  await waitFor(() => {
    const visibleItems = countVisibleMediaItems()
    const badge = readMediaCountBadge()
    const emptyState = hasMediaEmptyState()
    if (visibleItems !== 0) throw new Error(`expected 0 visible media items after title filter, got ${visibleItems}`)
    if (badge !== 0 && !emptyState) {
      throw new Error(`media badge is ${badge} and no empty state is shown after filtering to zero`)
    }
  }, { timeout: 15_000 })

  // 清除筛选（面板仍开着，点面板内「清除」按钮），等待计数恢复
  const clearButton = Array.from(panel.querySelectorAll<HTMLButtonElement>('button'))
    .filter((element) => isVisible(element))
    .find((element) => /^(清除|clear)$/i.test((element.textContent ?? '').trim()))
  if (!clearButton) throw new Error('title filter clear button is not available in the dropdown panel')
  await user.click(clearButton)

  const restoredCount = await waitFor(() => {
    const count = readMediaCountBadge()
    if (count !== initialCount) {
      throw new Error(`media count badge did not restore to ${initialCount} after clearing the filter (got ${count})`)
    }
    return count
  }, { timeout: 15_000 })
  await waitFor(() => {
    if (countVisibleMediaItems() < 1) throw new Error('no visible media items after clearing the title filter')
  }, { timeout: 15_000 })

  console.info('[procm-ui-test] title-filter-count finished', { initialCount, restoredCount })
  return { initialCount, filteredCount: 0, restoredCount, filterCleared: true }
}
