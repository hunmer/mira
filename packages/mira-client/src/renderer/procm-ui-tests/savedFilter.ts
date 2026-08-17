import { fireEvent, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { ensureMediaTab } from './helpers'

/**
 * 已保存过滤器（FilterBar bookmark 下拉 + SavedFilterDialog）。
 *
 * 关键 DOM（源码核实）：
 * - FilterBar.vue：bookmark trigger 按钮内 material-icons 连字文本为 'bookmark'；
 *   下拉面板（reka Popover，teleport 到 body）内「新增过滤器 / New Filter」按钮
 *   打开 SavedFilterDialog；已保存条目为 div.group（title=应用此过滤器），
 *   hover 显示的删除按钮 title=「删除过滤器」（hidden group-hover:flex，CSS 隐藏，
 *   需 fireEvent 派发事件绕过可见性）。删除无确认框，直接 removeSavedFilter。
 * - SavedFilterDialog.vue：输入框 #saved-filter-name；保存按钮 disabled 由 name 非空决定。
 * - getLibraryPrefs 返回 reactive state，删除/新增后重新打开下拉即可验证列表。
 * - 还原：标题筛选通过下拉内「清除 / Clear」按钮还原。
 */

function isVisible(element: Element): boolean {
  return element.getClientRects().length > 0
}

function findVisiblePopover(): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>('[data-slot="popover-content"]')).find((element) =>
      isVisible(element),
    ) ?? null
  )
}

function findFilterTriggerByIcon(iconName: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('.filter-bar button'))
    .filter((element) => isVisible(element))
    .find((element) => (element.querySelector('.material-icons')?.textContent ?? '').trim() === iconName)
  if (!button) throw new Error(`filter bar trigger with material icon "${iconName}" is not available`)
  return button
}

function readMediaCountBadge(): number | null {
  const heading = Array.from(document.querySelectorAll<HTMLElement>('header h3'))
    .filter((element) => isVisible(element))
    .find((element) => /^(素材|media)$/i.test((element.textContent ?? '').trim()))
  const badge = heading?.parentElement?.querySelector('span.inline-flex')
  if (!badge) return null
  const parsed = Number.parseInt((badge.textContent ?? '').trim(), 10)
  return Number.isFinite(parsed) ? parsed : null
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 打开 bookmark 下拉（点击 bookmark 图标，避开 trigger 内条件清除 ×），返回面板。 */
async function openBookmarkPanel(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
  const trigger = findFilterTriggerByIcon('bookmark')
  // trigger 在有生效条件时内含「清除过滤器」×（@click.stop），点 bookmark 图标本体更稳
  const icon = trigger.querySelector('.material-icons') ?? trigger
  await user.click(icon as HTMLElement)
  return waitFor(
    () => {
      const panel = findVisiblePopover()
      if (!panel || !/已保存的过滤器|saved filters/i.test(panel.textContent ?? '')) {
        throw new Error('saved filters bookmark dropdown did not open')
      }
      return panel
    },
    { timeout: 10_000 },
  )
}

/** 关闭当前打开的下拉（Escape 失效时点击「素材」标题区域兜底）。 */
async function closeOpenPopover(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  if (!findVisiblePopover()) return
  await user.keyboard('{Escape}')
  await waitFor(() => {
    if (findVisiblePopover()) throw new Error('popover did not close after Escape')
  }, { timeout: 3_000 }).catch(async () => {
    const heading = Array.from(document.querySelectorAll<HTMLElement>('header h3'))
      .filter((element) => isVisible(element))
      .find((element) => /^(素材|media)$/i.test((element.textContent ?? '').trim()))
    if (heading) await user.click(heading)
    await waitFor(() => {
      if (findVisiblePopover()) throw new Error('popover did not close after clicking outside')
    }, { timeout: 5_000 })
  })
}

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function savedFilter(): Promise<{
  savedVisible: true
  deleted: true
  filterCleared: boolean
  filterName: string
}> {
  console.info('[procm-ui-test] saved-filter started')
  const user = userEvent.setup()
  await ensureMediaTab('[data-selectable-id]')

  const initialCount = await waitFor(() => {
    const count = readMediaCountBadge()
    if (count === null) throw new Error('media count badge (素材 header) is not readable')
    return count
  }, { timeout: 15_000 })

  // 1) 先设置一个不可能匹配的标题筛选，作为过滤器快照条件
  const titleTrigger = findFilterTriggerByIcon('title')
  await user.click(titleTrigger)
  const titlePanel = await waitFor(
    () => {
      const panel = findVisiblePopover()
      if (!panel || !/标题筛选|title filter/i.test(panel.textContent ?? '')) {
        throw new Error('title filter dropdown did not open')
      }
      return panel
    },
    { timeout: 10_000 },
  )
  const titleInput = titlePanel.querySelector<HTMLInputElement>('input')
  if (!titleInput) throw new Error('title filter input is not available in the dropdown panel')
  const titleKeyword = `procm-title-${Date.now()}`
  await user.clear(titleInput)
  await user.type(titleInput, titleKeyword)
  await waitFor(() => {
    const count = readMediaCountBadge()
    if (count !== null && count > 0) {
      throw new Error(`title filter "${titleKeyword}" seems to match items (badge ${count}); expected no match`)
    }
  }, { timeout: 15_000 }).catch(() => {
    // 徽标短暂滞后不阻塞主流程，保存过滤器只依赖 filter rule 处于激活态
  })
  // 点「确定」关闭标题下拉
  const confirmButton = Array.from(titlePanel.querySelectorAll<HTMLButtonElement>('button'))
    .filter((element) => isVisible(element))
    .find((element) => /^(确定|confirm|ok)$/i.test((element.textContent ?? '').trim()))
  if (confirmButton) await user.click(confirmButton)
  else await closeOpenPopover(user)

  // 2) 打开 bookmark 下拉 → 新增过滤器
  await openBookmarkPanel(user)
  const addButton = await waitFor(
    () => {
      const panel = findVisiblePopover()
      const target = Array.from(panel?.querySelectorAll<HTMLButtonElement>('button') ?? [])
        .filter((element) => isVisible(element))
        .find((element) => /新增过滤器|添加过滤器|new filter|add filter/i.test((element.textContent ?? '').trim()))
      if (!target) throw new Error('saved-filter "add filter" button is not visible')
      return target
    },
    { timeout: 10_000 },
  )
  await user.click(addButton)

  // 3) 等待 SavedFilterDialog 出现并填写名称
  const nameInput = await waitFor(
    () => {
      const input = document.querySelector<HTMLInputElement>('#saved-filter-name')
      if (!input || !isVisible(input)) throw new Error('saved filter dialog did not open (#saved-filter-name missing)')
      return input
    },
    { timeout: 10_000 },
  )
  const filterName = `procm-ui-filter-${Date.now()}`
  await user.clear(nameInput)
  await user.type(nameInput, filterName)
  const dialog = nameInput.closest('[data-slot="dialog-content"], [role="dialog"]') as HTMLElement | null
  if (!dialog) throw new Error('saved filter dialog container is not found')
  const saveButton = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button'))
    .filter((element) => isVisible(element))
    .find((element) => /^(保存|save)$/i.test((element.textContent ?? '').trim()))
  if (!saveButton) throw new Error('saved filter dialog save button is not available')
  if (saveButton.disabled) throw new Error('saved filter dialog save button is disabled although name is filled')
  await user.click(saveButton)
  await waitFor(() => {
    const input = document.querySelector('#saved-filter-name')
    if (input && isVisible(input)) throw new Error('saved filter dialog did not close after saving')
  }, { timeout: 10_000 })

  // 4) 重新打开 bookmark 下拉，断言新过滤器出现在列表（getLibraryPrefs 为快照 computed，须重开验证）
  await openBookmarkPanel(user)
  await waitFor(() => {
    const panel = findVisiblePopover()
    if (!panel || !new RegExp(escapeRegExp(filterName)).test(panel.textContent ?? '')) {
      throw new Error(`saved filter "${filterName}" is not visible in the bookmark dropdown list`)
    }
  }, { timeout: 10_000 })

  // 5) 删除该过滤器（hover 才显示的删除按钮，用 fireEvent 派发；删除无确认框）
  const deleteButton = await waitFor(
    () => {
      const panel = findVisiblePopover()
      if (!panel) throw new Error('bookmark dropdown closed unexpectedly')
      const row = Array.from(panel.querySelectorAll<HTMLElement>('div.group'))
        .find((element) => (element.textContent ?? '').includes(filterName))
      if (!row) throw new Error(`saved filter row for "${filterName}" is not found`)
      const target = Array.from(row.querySelectorAll<HTMLButtonElement>('button'))
        .find((element) => /删除过滤器|delete filter/i.test((element.getAttribute('title') ?? '').trim()))
      if (!target) throw new Error('saved filter delete button is not found (title=删除过滤器)')
      return { row, target }
    },
    { timeout: 10_000 },
  )
  fireEvent.mouseEnter(deleteButton.row)
  fireEvent.click(deleteButton.target)
  await waitFor(() => {
    const panel = findVisiblePopover()
    if (panel && (panel.textContent ?? '').includes(filterName)) {
      throw new Error(`saved filter "${filterName}" is still listed after deletion`)
    }
  }, { timeout: 10_000 })

  // 6) 关闭后重新打开下拉，断言条目已消失
  await closeOpenPopover(user)
  await openBookmarkPanel(user)
  await waitFor(() => {
    const panel = findVisiblePopover()
    if (panel && (panel.textContent ?? '').includes(filterName)) {
      throw new Error(`saved filter "${filterName}" reappeared after dropdown reopen`)
    }
  }, { timeout: 10_000 })
  await closeOpenPopover(user)

  // 7) 还原标题筛选
  await user.click(findFilterTriggerByIcon('title'))
  const clearPanel = await waitFor(
    () => {
      const panel = findVisiblePopover()
      if (!panel || !/标题筛选|title filter/i.test(panel.textContent ?? '')) {
        throw new Error('title filter dropdown did not reopen for clearing')
      }
      return panel
    },
    { timeout: 10_000 },
  )
  const clearButton = Array.from(clearPanel.querySelectorAll<HTMLButtonElement>('button'))
    .filter((element) => isVisible(element))
    .find((element) => /^(清除|clear)$/i.test((element.textContent ?? '').trim()))
  if (!clearButton) throw new Error('title filter clear button is not available in the dropdown panel')
  await user.click(clearButton)
  let filterCleared = false
  await waitFor(() => {
    const count = readMediaCountBadge()
    if (count === initialCount) filterCleared = true
    else throw new Error(`media count badge did not restore to ${initialCount} after clearing (got ${count})`)
  }, { timeout: 15_000 })

  console.info('[procm-ui-test] saved-filter finished', { filterName })
  return { savedVisible: true, deleted: true, filterCleared, filterName }
}
