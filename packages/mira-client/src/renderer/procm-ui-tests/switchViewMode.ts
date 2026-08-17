import { screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'

const VIEW_LABELS: Record<'grid' | 'list' | 'waterfall', RegExp> = {
  grid: /网格视图|grid view/i,
  list: /列表视图|list view/i,
  waterfall: /瀑布流视图|瀑布视图|waterfall/i,
}

function findViewModeTrigger(): HTMLButtonElement {
  const button = screen.getAllByTitle(/网格视图|列表视图|瀑布流视图|grid view|list view|waterfall/i)
    .find((element) => element.tagName === 'BUTTON' && element.offsetParent !== null)
  if (!button) throw new Error('view mode trigger is not available')
  return button as HTMLButtonElement
}

/** 媒体 tab 未打开时，点击侧边栏「全部」分类进入媒体视图。 */
async function ensureViewModeTrigger(): Promise<HTMLButtonElement> {
  try {
    return findViewModeTrigger()
  } catch {
    const allCategory = document.querySelector<HTMLElement>('[data-folder-tree-node-id="all"]')
    if (!allCategory) throw new Error('no media tab is open and the sidebar "all" category is not available')
    const user = userEvent.setup()
    await user.click(allCategory)
    return waitFor(findViewModeTrigger, { timeout: 15_000 })
  }
}

function detectMode(title: string): 'grid' | 'list' | 'waterfall' {
  if (VIEW_LABELS.list.test(title)) return 'list'
  if (VIEW_LABELS.waterfall.test(title)) return 'waterfall'
  return 'grid'
}

async function selectViewMode(user: ReturnType<typeof userEvent.setup>, mode: 'grid' | 'list' | 'waterfall') {
  await user.click(findViewModeTrigger())
  const option = await waitFor(() => {
    const target = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .filter((button) => button.offsetParent !== null)
      .find((button) => VIEW_LABELS[mode].test(button.textContent ?? ''))
    if (!target) throw new Error(`view mode option "${mode}" is not visible`)
    return target
  }, { timeout: 10_000 })
  await user.click(option)
}

/** 视图模式切换：切到另一模式再切回，断言 trigger 标题与列表视图容器同步变化并还原。 */
export async function switchViewMode(): Promise<{ initialMode: string; switchedTo: string; restored: boolean }> {
  console.info('[procm-ui-test] switch-view-mode started')
  const user = userEvent.setup()
  await ensureViewModeTrigger()

  const initialMode = detectMode(findViewModeTrigger().title)
  const targetMode = initialMode === 'list' ? 'grid' : 'list'
  const listInitiallyPresent = !!document.querySelector('.media-list')

  await selectViewMode(user, targetMode)
  await waitFor(() => {
    if (detectMode(findViewModeTrigger().title) !== targetMode) throw new Error('view mode trigger title did not switch')
    if (!!document.querySelector('.media-list') !== (targetMode === 'list')) {
      throw new Error('media list container does not match the target view mode')
    }
  }, { timeout: 15_000 })

  await selectViewMode(user, initialMode)
  await waitFor(() => {
    if (detectMode(findViewModeTrigger().title) !== initialMode) throw new Error('view mode trigger title did not restore')
    if (!!document.querySelector('.media-list') !== listInitiallyPresent) {
      throw new Error('media list container did not restore to the initial view mode')
    }
  }, { timeout: 15_000 })

  console.info('[procm-ui-test] switch-view-mode finished')
  return { initialMode, switchedTo: targetMode, restored: true }
}
