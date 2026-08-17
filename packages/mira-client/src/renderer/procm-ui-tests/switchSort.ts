import { waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'

function findSortTrigger(): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
    .filter((element) => element.offsetParent !== null)
    .find((element) => {
      const icon = element.querySelector('.material-icons')
      const text = (element.textContent ?? '').trim()
      return icon?.textContent?.trim() === 'sort' && /[↑↓]$/.test(text)
    })
  if (!button) throw new Error('sort trigger is not available')
  return button
}

function readSortText(): string {
  const raw = (findSortTrigger().textContent ?? '').trim()
  // 剥离 trigger 内 sort 图标连字文本，只留「字段 ↑/↓」显示文案
  return raw.replace(/^sort/, '').trim()
}

/** 媒体 tab 未打开时，点击侧边栏「全部」分类进入媒体视图。 */
async function ensureSortTrigger(): Promise<HTMLButtonElement> {
  try {
    return findSortTrigger()
  } catch {
    const allCategory = document.querySelector<HTMLElement>('[data-folder-tree-node-id="all"]')
    if (!allCategory) throw new Error('no media tab is open and the sidebar "all" category is not available')
    const user = userEvent.setup()
    await user.click(allCategory)
    return waitFor(findSortTrigger, { timeout: 15_000 })
  }
}

async function openSortPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(findSortTrigger())
  await waitFor(() => {
    if (!/排序设置|sort settings/i.test(document.body.textContent ?? '')) {
      throw new Error('sort panel did not open')
    }
  }, { timeout: 10_000 })
}

async function clickSortRadio(user: ReturnType<typeof userEvent.setup>, labelPattern: RegExp, description: string) {
  const radio = await waitFor(() => {
    const target = Array.from(document.querySelectorAll<HTMLElement>('[role="radio"]'))
      .filter((element) => element.offsetParent !== null)
      .find((element) => labelPattern.test(element.closest('label')?.textContent ?? ''))
    if (!target) throw new Error(`sort option "${description}" is not visible`)
    return target
  }, { timeout: 10_000 })
  await user.click(radio)
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 排序切换：名称+升序 → 重置默认 → 还原初始排序，全程以 trigger 文本断言。 */
export async function switchSort(): Promise<{ initialText: string; changedText: string; restored: boolean }> {
  console.info('[procm-ui-test] switch-sort started')
  const user = userEvent.setup()
  await ensureSortTrigger()
  const initialText = readSortText()

  await openSortPanel(user)
  await clickSortRadio(user, /名称|name/i, 'sort field "name"')
  await waitFor(() => {
    const text = readSortText()
    if (!/名称|name/i.test(text) || !text.endsWith('↓')) throw new Error(`sort trigger text did not switch to name desc: "${text}"`)
  }, { timeout: 15_000 })

  await openSortPanelIfNeeded(user)
  await clickSortRadio(user, /升序|ascending|asc/i, 'sort order ascending')
  let changedText = ''
  await waitFor(() => {
    changedText = readSortText()
    if (!/名称|name/i.test(changedText) || !changedText.endsWith('↑')) throw new Error(`sort trigger text did not switch to name asc: "${changedText}"`)
  }, { timeout: 15_000 })

  await openSortPanelIfNeeded(user)
  const resetButton = await waitFor(() => {
    const target = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .filter((button) => button.offsetParent !== null)
      .find((button) => /重置为默认|重置|reset/i.test((button.textContent ?? '').trim()))
    if (!target) throw new Error('sort reset button is not visible')
    return target
  }, { timeout: 10_000 })
  await user.click(resetButton)
  await waitFor(() => {
    if (!readSortText().endsWith('↓')) throw new Error('sort trigger text did not reset to default desc')
  }, { timeout: 15_000 })

  // 还原初始排序（初始可能非默认值，例如持久化过的 tab 排序）
  if (readSortText() !== initialText) {
    await openSortPanelIfNeeded(user)
    const initialField = initialText.replace(/\s*[↑↓]$/, '')
    await clickSortRadio(user, new RegExp(`^${escapeRegExp(initialField)}$`, 'i'), `initial sort field "${initialField}"`)
    if (initialText.endsWith('↑')) await clickSortRadio(user, /升序|ascending|asc/i, 'sort order ascending')
    else await clickSortRadio(user, /降序|descending|desc/i, 'sort order descending')
  }
  await waitFor(() => {
    if (readSortText() !== initialText) throw new Error(`sort trigger text did not restore: "${readSortText()}" != "${initialText}"`)
  }, { timeout: 15_000 })

  await user.keyboard('{Escape}')
  console.info('[procm-ui-test] switch-sort finished')
  return { initialText, changedText, restored: true }
}

/** radix Popover 在选项点击后保持打开；重复操作前确保排序面板处于打开状态。 */
async function openSortPanelIfNeeded(user: ReturnType<typeof userEvent.setup>) {
  if (/排序设置|sort settings/i.test(document.body.textContent ?? '')) return
  await openSortPanel(user)
}
