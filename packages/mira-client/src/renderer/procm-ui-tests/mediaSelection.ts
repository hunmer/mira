import { waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { ensureMediaTab } from './helpers'

/**
 * 媒体选择交互测试（真实 Renderer DOM，非 jsdom render）。
 *
 * 源码依据：
 * - 选择逻辑：MediaGridComponent/composables/useSelection.ts handleItemSelection
 *   普通点击 = 单选并清掉其它；ctrl/meta 点击 = toggle 多选（grid/list/waterfall 三种视图一致，
 *   事件都带原始 MouseEvent 传入，故无需切视图）。
 * - 浮动操作栏：MediaTabListView.vue「浮动操作栏」区块，选中数 > 0 时才渲染
 *   「取消选择」按钮（title=$t('tabs.mediaTabListView.clearSelection')）。
 * - 选中计数文案：MediaTabListView.vue 底部状态栏
 *   $t('tabs.mediaTabListView.selectedCount', { count }) = zh「已选择 {count} 个素材」/ en「{count} item(s) selected」。
 * - FilterBar 全选：FilterBar.vue 根节点 .filter-bar 内的 Checkbox（[data-slot="checkbox"]，
 *   reka-ui button role="checkbox"），点击 emit select-all → MediaTabListView.handleSelectAll。
 * - toggle 模式的 media-select 经 throttle(50ms) 发出，断言一律用 waitFor。
 * - user-event v14 的 click() 不接收 modifiers 参数（那是 v13 API）：
 *   dispatchEvent 会把键盘按下的修饰键展开进每个 UI 事件（system.getUIEventModifiers），
 *   因此用 user.keyboard('[ControlLeft>]') 按住 Ctrl 再 click，click 事件自带 ctrlKey。
 *   （grid 视图 pointerdown 被 useDragDrop preventDefault，但 user-event 的 mouse.up 仍会派发 click。）
 * 全程零数据副作用，仅 UI 选中态（结束前还原为无选中）。
 */

/** 可见性判断：getClientRects 为空即未渲染/隐藏（display:none），比 offsetParent 更通用。 */
function isVisible(el: HTMLElement): boolean {
  return el.getClientRects().length > 0
}

/** 当前视图中可见的可选素材卡（grid/list/waterfall 条目根节点均带 data-selectable-id）。 */
function getSelectableItems(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-selectable-id]'))
    .filter(isVisible)
}

/** 去重后的素材 id 数：分组模式下同一素材可能在多个分组渲染多个 DOM 节点。 */
function countDistinctItemIds(): number {
  return new Set(getSelectableItems().map(el => el.getAttribute('data-selectable-id'))).size
}

const CLEAR_SELECTION_TITLE_RE = /取消选择|clear selection/i

/** 底部状态栏选中计数文案：zh「已选择 1 个素材」/ en「1 item(s) selected」。 */
function selectedCountRe(count: number): RegExp {
  return new RegExp(`已选择\\s*${count}\\s*个素材|\\b${count}\\s*item\\(s\\)\\s*selected`, 'i')
}

function readSelectedCountText(): string {
  const re = /已选择\s*\d+\s*个素材|\b\d+\s*item\(s\)\s*selected/i
  const hit = Array.from(document.querySelectorAll('footer span, footer div'))
    .map(el => (el.textContent ?? '').trim())
    .find(text => text.length > 0 && re.test(text))
  return hit ?? ''
}

/** 浮动操作栏上的「取消选择」按钮（仅 selectedItems.length > 0 时存在）。 */
function findClearSelectionButton(): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
    .filter(isVisible)
    .find(button => CLEAR_SELECTION_TITLE_RE.test(button.getAttribute('title') ?? ''))
}

/** FilterBar 全选 Checkbox（列表视图表头还有同款，限定 .filter-bar 作用域避免歧义）。 */
function findFilterBarSelectAllCheckbox(): HTMLElement | null {
  const filterBar = document.querySelector('.filter-bar')
  return filterBar?.querySelector<HTMLElement>('[data-slot="checkbox"]') ?? null
}

/** 尽力清空选择（不抛错），用于清理与异常兜底。 */
async function bestEffortClearSelection(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const clearButton = findClearSelectionButton()
  if (clearButton) {
    await user.click(clearButton)
    try {
      await waitFor(() => {
        if (findClearSelectionButton()) throw new Error('selection was not cleared')
      }, { timeout: 5_000 })
    } catch {
      // 兜底失败只能如实保留，主断言已在前面的 waitFor 中覆盖
    }
  }
}

/**
 * Operates on the already-mounted Mira page, not a detached test container.
 * 单选 → ctrl 多选 → 取消选择（浮动栏消失/无选中态）→（加分项）FilterBar 全选/取消，最后还原无选中。
 */
export async function mediaSelection(): Promise<{
  filesAvailable: number
  selectedOne: boolean
  ctrlMultiSelected: boolean
  deselected: boolean
  selectAllVerified?: boolean
}> {
  console.info('[procm-ui-test] media-selection started')
  const user = userEvent.setup()

  try {
    await ensureMediaTab('[data-selectable-id]')

    // 等首批素材渲染稳定并统计可用素材
    await waitFor(() => {
      if (getSelectableItems().length < 1) throw new Error('no selectable media items rendered in the media view')
    }, { timeout: 15_000 })
    const filesAvailable = countDistinctItemIds()
    if (filesAvailable < 2) {
      throw new Error(`library must contain at least 2 media files to run this test (found ${filesAvailable})`)
    }

    const items = getSelectableItems()
    const firstItem = items[0]
    const secondItem = items[1]
    const firstId = firstItem.getAttribute('data-selectable-id')
    const secondId = secondItem.getAttribute('data-selectable-id')
    if (!firstId || !secondId) throw new Error('media items are missing the data-selectable-id attribute')

    // 1) 普通点击第一个素材 → 浮动栏出现（含「取消选择」按钮）+ 底部计数「已选择 1 个素材」
    await user.click(firstItem)
    await waitFor(() => {
      if (!findClearSelectionButton()) {
        throw new Error('floating toolbar did not show the "clear selection" action after clicking the first media item')
      }
      if (!selectedCountRe(1).test(readSelectedCountText())) {
        throw new Error(`footer did not show "1 item selected" text (got "${readSelectedCountText()}")`)
      }
    }, { timeout: 10_000 })
    const selectedOne = true

    // 2) ctrl 点击第二个素材 → 计数变 2（toggle 模式 media-select 有 50ms 节流，靠 waitFor 覆盖）
    //    user-event v14 无 click modifiers 参数：先按住 ControlLeft 再 click，事件自动带 ctrlKey
    await user.keyboard('[ControlLeft>]')
    try {
      await user.click(secondItem)
    } finally {
      await user.keyboard('[/ControlLeft]')
    }
    await waitFor(() => {
      if (!selectedCountRe(2).test(readSelectedCountText())) {
        throw new Error(`footer did not show "2 items selected" after ctrl-click (got "${readSelectedCountText()}")`)
      }
    }, { timeout: 10_000 })
    const ctrlMultiSelected = true

    // 3) 点浮动栏「取消选择」→ 按钮消失、无选中计数（选中态归零）
    const clearButton = findClearSelectionButton()
    if (!clearButton) throw new Error('"clear selection" button disappeared before clicking it')
    await user.click(clearButton)
    await waitFor(() => {
      if (findClearSelectionButton()) throw new Error('"clear selection" button still visible after clearing selection')
      if (readSelectedCountText()) throw new Error(`selected count text still visible after clearing (got "${readSelectedCountText()}")`)
    }, { timeout: 10_000 })
    const deselected = true

    // 4)（加分项，失败不判失败）FilterBar 全选 → 全选态 → 再点取消
    let selectAllVerified = false
    try {
      const checkbox = await waitFor(() => {
        const el = findFilterBarSelectAllCheckbox()
        if (!el || !isVisible(el)) throw new Error('filter-bar select-all checkbox is not visible')
        return el
      }, { timeout: 10_000 })
      await user.click(checkbox)
      const expectedCount = countDistinctItemIds()
      await waitFor(() => {
        if (checkbox.getAttribute('data-state') !== 'checked' && checkbox.getAttribute('aria-checked') !== 'true') {
          throw new Error('filter-bar select-all checkbox did not become checked')
        }
        if (!selectedCountRe(expectedCount).test(readSelectedCountText())) {
          throw new Error(`footer did not show all ${expectedCount} items selected (got "${readSelectedCountText()}")`)
        }
      }, { timeout: 10_000 })
      await user.click(checkbox)
      await waitFor(() => {
        if (readSelectedCountText()) throw new Error('selection was not cleared after unchecking select-all')
      }, { timeout: 10_000 })
      selectAllVerified = true
    } catch (error) {
      console.warn('[procm-ui-test] media-selection optional select-all step skipped', error)
      await bestEffortClearSelection(user)
    }

    console.info('[procm-ui-test] media-selection finished', { filesAvailable, selectedOne, ctrlMultiSelected, deselected, selectAllVerified })
    return { filesAvailable, selectedOne, ctrlMultiSelected, deselected, selectAllVerified }
  } catch (error) {
    // 异常兜底：尽量还原无选中态再抛出
    await bestEffortClearSelection(user)
    throw error
  }
}
