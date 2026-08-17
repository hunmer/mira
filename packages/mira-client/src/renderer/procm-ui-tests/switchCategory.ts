import { waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'

/**
 * Tab 条按钮均带 [data-active-tab]（HomeTabsBar.vue），激活值为 "true"。
 * 侧边栏快捷分类项带 [data-folder-tree-node-id="<id>"]（id: all/uncategorized/untagged/trash），
 * 激活态类为 .cat-item--active（SidebarModuleList.vue）。
 */
function getTabButtons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[data-active-tab]'))
}

function getActiveTabLabel(): string {
  const active = getTabButtons().find((btn) => btn.getAttribute('data-active-tab') === 'true')
  return (active?.textContent ?? '').trim()
}

function getSidebarCategory(nodeId: string): HTMLElement {
  const el = document.querySelector(`[data-folder-tree-node-id="${nodeId}"]`)
  if (!el) throw new Error(`sidebar category "${nodeId}" is not rendered`)
  return el as HTMLElement
}

/** 点击 tab 按钮内嵌的关闭按钮（仅当 activeTabs.length > 1 时渲染），并等待该 tab 从 DOM 消失。 */
async function closeTabAndWait(tabButton: HTMLButtonElement, user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const closeBtn = tabButton.querySelector('button')
  if (!closeBtn) throw new Error('close button not found on test-opened tab')
  await user.click(closeBtn)
  await waitFor(() => {
    if (document.body.contains(tabButton)) throw new Error('test-opened tab was not removed from the tabs bar')
  }, { timeout: 10_000 })
}

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function switchCategory(): Promise<{
  switchedToTrash: boolean
  restored: boolean
  beforeActiveCategory: string | null
  closedTestTabs: string[]
}> {
  console.info('[procm-ui-test] switch-category started')
  const user = userEvent.setup()

  // 记录点击前的分类列表 / 激活分类 / 已存在 tab，用于清理与恢复
  const beforeItems = Array.from(document.querySelectorAll<HTMLElement>('.cat-item'))
  if (beforeItems.length === 0) throw new Error('no .cat-item elements found in the sidebar')
  const beforeActiveCategory = beforeItems
    .find((el) => el.classList.contains('cat-item--active'))
    ?.textContent?.trim() ?? null
  const beforeTabLabels = getTabButtons().map((btn) => (btn.textContent ?? '').trim())
  const beforeActiveTabLabel = getActiveTabLabel()

  // 1) 点击「回收站」分类，断言激活态与对应激活 tab
  const trashItem = getSidebarCategory('trash')
  await user.click(trashItem)
  await waitFor(() => {
    if (!trashItem.classList.contains('cat-item--active')) {
      throw new Error('trash category item did not get the .cat-item--active class')
    }
  }, { timeout: 10_000 })
  await waitFor(() => {
    if (!/回收站|trash/i.test(getActiveTabLabel())) {
      throw new Error('active tab in the tabs bar is not the trash tab')
    }
  }, { timeout: 10_000 })

  // 2) 点击「全部」恢复，断言激活态回到「全部」
  const allItem = getSidebarCategory('all')
  await user.click(allItem)
  await waitFor(() => {
    if (!allItem.classList.contains('cat-item--active')) {
      throw new Error('"all" category item did not get the .cat-item--active class back')
    }
    if (trashItem.classList.contains('cat-item--active')) {
      throw new Error('trash category item is still active after switching back to "all"')
    }
  }, { timeout: 10_000 })
  await waitFor(() => {
    if (!/全部|all/i.test(getActiveTabLabel())) {
      throw new Error('active tab in the tabs bar is not the "all" tab')
    }
  }, { timeout: 10_000 })

  // 3) 清理：仅关闭本测试打开的 tab（开始时已存在的 tab 全部保留）
  const closedTestTabs: string[] = []
  for (let guard = 0; guard < 10; guard += 1) {
    const extra = getTabButtons()
      .find((btn) => !beforeTabLabels.includes((btn.textContent ?? '').trim()))
    if (!extra) break
    const label = (extra.textContent ?? '').trim()
    await closeTabAndWait(extra, user)
    closedTestTabs.push(label)
  }

  // 恢复原激活 tab（如「首页」home tab）
  const originalTab = getTabButtons()
    .find((btn) => (btn.textContent ?? '').trim() === beforeActiveTabLabel)
  if (originalTab && originalTab.getAttribute('data-active-tab') !== 'true') {
    await user.click(originalTab)
  }

  const restored = getTabButtons().every((btn) =>
    beforeTabLabels.includes((btn.textContent ?? '').trim()))

  console.info('[procm-ui-test] switch-category finished', { closedTestTabs, restored })
  return { switchedToTrash: true, restored, beforeActiveCategory, closedTestTabs }
}
