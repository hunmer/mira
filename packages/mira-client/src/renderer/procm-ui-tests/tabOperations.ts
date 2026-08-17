import { screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'

function getTabButtons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[data-active-tab]'))
}

function getActiveTabLabel(): string {
  const active = getTabButtons().find((btn) => btn.getAttribute('data-active-tab') === 'true')
  return (active?.textContent ?? '').trim()
}

function findTabButton(labelRe: RegExp): HTMLButtonElement | undefined {
  return getTabButtons().find((btn) => labelRe.test(btn.textContent ?? ''))
}

function getSidebarCategory(nodeId: string): HTMLElement {
  const el = document.querySelector(`[data-folder-tree-node-id="${nodeId}"]`)
  if (!el) throw new Error(`sidebar category "${nodeId}" is not rendered`)
  return el as HTMLElement
}

async function closeTabAndWait(tabButton: HTMLButtonElement, user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const closeBtn = tabButton.querySelector('button')
  if (!closeBtn) throw new Error('close button not found on test-opened tab')
  await user.click(closeBtn)
  await waitFor(() => {
    if (document.body.contains(tabButton)) throw new Error('test-opened tab was not removed from the tabs bar')
  }, { timeout: 10_000 })
}

/**
 * Operates on the already-mounted Mira page, not a detached test container.
 * 通过侧边栏快捷分类依次打开「未分类」「未标签」两个 tab（不依赖任何文件夹数据），
 * 验证 tab 切换、关闭与返回按钮，最后只关闭本测试打开的 tab。
 */
export async function tabOperations(): Promise<{
  openedTabs: number
  switched: boolean
  closed: boolean
  restoredOriginalTabs: boolean
  backButtonClicked: boolean
  backButtonDisabled: boolean
}> {
  console.info('[procm-ui-test] tab-operations started')
  const user = userEvent.setup()

  const beforeTabLabels = getTabButtons().map((btn) => (btn.textContent ?? '').trim())
  const beforeActiveTabLabel = getActiveTabLabel()

  // 1) 经侧边栏打开「未分类」tab
  const uncategorizedItem = getSidebarCategory('uncategorized')
  await user.click(uncategorizedItem)
  await waitFor(() => {
    if (!findTabButton(/未分类|uncategorized/i)) {
      throw new Error('"uncategorized" tab was not opened in the tabs bar')
    }
  }, { timeout: 15_000 })

  // 2) 再打开「未标签」tab，断言两个 tab 同时存在
  const untaggedItem = getSidebarCategory('untagged')
  await user.click(untaggedItem)
  await waitFor(() => {
    if (!findTabButton(/未分类|uncategorized/i) || !findTabButton(/未标签|untagged/i)) {
      throw new Error('both "uncategorized" and "untagged" tabs should exist in the tabs bar')
    }
    if (!/未标签|untagged/i.test(getActiveTabLabel())) {
      throw new Error('"untagged" tab should be active right after opening it')
    }
  }, { timeout: 15_000 })

  // 3) 点击非激活的「未分类」tab，断言激活态转移
  const uncategorizedTab = findTabButton(/未分类|uncategorized/i)
  if (!uncategorizedTab) throw new Error('"uncategorized" tab button disappeared before switching')
  await user.click(uncategorizedTab)
  await waitFor(() => {
    if (!/未分类|uncategorized/i.test(getActiveTabLabel())) {
      throw new Error('active tab did not switch to "uncategorized" after clicking it')
    }
  }, { timeout: 10_000 })
  const switched = true

  // 4) 关闭「未分类」tab，断言从 DOM 消失
  await closeTabAndWait(uncategorizedTab, user)
  await waitFor(() => {
    if (findTabButton(/未分类|uncategorized/i)) {
      throw new Error('"uncategorized" tab is still present after closing it')
    }
  }, { timeout: 10_000 })
  const closed = true

  // 5) 点击返回按钮（title：激活上一次的tab / 没有可返回的 tab），断言不抛错
  const backButton = screen.getAllByTitle(/激活上一次|没有可返回|activate last|no tab to go back/i)[0] as HTMLButtonElement
  const backButtonDisabled = backButton.disabled
  let backButtonClicked = false
  if (!backButtonDisabled) {
    await user.click(backButton)
    backButtonClicked = true
  } else {
    console.warn('[procm-ui-test] tab-operations back button is disabled, skipping the click')
  }

  // 6) 清理：仅关闭本测试打开且仍存在的 tab（保留用户原有 tab）
  const closedTestTabs: string[] = []
  for (let guard = 0; guard < 10; guard += 1) {
    const extra = getTabButtons()
      .find((btn) => !beforeTabLabels.includes((btn.textContent ?? '').trim()))
    if (!extra) break
    const label = (extra.textContent ?? '').trim()
    await closeTabAndWait(extra, user)
    closedTestTabs.push(label)
  }

  // 恢复原激活 tab
  const originalTab = getTabButtons()
    .find((btn) => (btn.textContent ?? '').trim() === beforeActiveTabLabel)
  if (originalTab && originalTab.getAttribute('data-active-tab') !== 'true') {
    await user.click(originalTab)
  }

  const restoredOriginalTabs = getTabButtons().every((btn) =>
    beforeTabLabels.includes((btn.textContent ?? '').trim()))

  console.info('[procm-ui-test] tab-operations finished', { closedTestTabs, restoredOriginalTabs })
  return { openedTabs: 2, switched, closed, restoredOriginalTabs, backButtonClicked, backButtonDisabled }
}
