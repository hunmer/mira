import { waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createFolder } from './createFolder'

// NOTE: this test really creates and then deletes a folder (via window.miraSDK,
// never "delete with files"), and closes every tab it opens. Selectors verified
// against source:
// - Tab bar buttons carry [data-active-tab] (HomeTabsBar.vue, "true" = active).
// - Sidebar folder tree nodes carry [data-folder-tree-node-id]
//   (FolderTreeNode / FolderTreeComponent.vue root .folder-tree-container).
// - Folder tab view renders MediaTabListView whose footer breadcrumb
//   (Breadcrumb.vue) renders <nav> with clickable <button :title="label">
//   items; the current position is a <span aria-current="page">.
// - Clicking the "all files" crumb dispatches home-tab-replace which calls
//   replaceCurrentTab (useHomeTabManagement.ts): the current tab is replaced
//   in place (id becomes "all", label 全部文件/All Files) and the tab count
//   must stay unchanged.

function getTabButtons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[data-active-tab]'))
}

function getActiveTabLabel(): string {
  const active = getTabButtons().find((btn) => btn.getAttribute('data-active-tab') === 'true')
  return (active?.textContent ?? '').trim()
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

/** 文件夹树容器（FolderTreeComponent.vue 根节点 class） */
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

/** 面包屑「全部文件」按钮（Breadcrumb.vue：可点击项为带 title 的 button） */
const allFilesRe = /全部文件|all files/i

function findBreadcrumbNavForFolder(title: string): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>('nav'))
    .find((nav) => {
      const current = nav.querySelector('[aria-current="page"]')
      return !!current && (current.textContent ?? '').includes(title)
    }) ?? null
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
    console.warn('[procm-ui-test] open-folder-tab-breadcrumb failed to delete test folder via SDK', title, error)
    return false
  }
}

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function openFolderTabBreadcrumb(): Promise<{
  folderOpenedTab: boolean
  breadcrumbReplaced: boolean
  tabCountUnchanged: boolean
  folderTitle: string
}> {
  console.info('[procm-ui-test] open-folder-tab-breadcrumb started')
  const user = userEvent.setup()
  const title = `procm-ui-bc-${Date.now()}`
  const tabMatchesFolder = (text: string) => text.includes(title)

  const beforeActiveTabLabel = getActiveTabLabel()

  // 1) 创建测试文件夹
  await createFolder(title)
  const treeNode = await waitFor(() => {
    const node = findFolderTreeNode(title)
    if (!node) throw new Error(`folder tree node "${title}" is not visible yet`)
    return node as HTMLElement
  }, { timeout: 15_000 })

  // 2) createFolder 的「创建后自动打开」偏好（默认开）可能已为该文件夹开好 tab；
  //    createTabFromFolder 按 tabId 去重，为保证「点击树节点 → tab 数 +1」确定性，先关掉它。
  let autoOpenedTab = findTabButton(tabMatchesFolder)
  if (!autoOpenedTab) {
    try {
      await waitFor(() => {
        if (!findTabButton(tabMatchesFolder)) throw new Error('waiting for possibly auto-opened folder tab')
      }, { timeout: 4_000 })
    } catch {
      // autoOpenTab preference off (or slow): nothing to close.
    }
    autoOpenedTab = findTabButton(tabMatchesFolder)
  }
  if (autoOpenedTab) await closeTabAndWait(autoOpenedTab, user)

  // 3) 点击侧边栏树节点打开文件夹 tab（关闭 tab 可能触发重渲染，重新查询节点）
  const beforeClickCount = getTabButtons().length
  const nodeToClick = findFolderTreeNode(title) ?? treeNode
  await user.click(nodeToClick)
  await waitFor(() => {
    const tab = findTabButton(tabMatchesFolder)
    if (!tab) throw new Error(`tab for folder "${title}" was not opened in the tabs bar`)
    if (!tabMatchesFolder(getActiveTabLabel())) throw new Error('folder tab should be active right after opening it')
  }, { timeout: 15_000 })
  if (getTabButtons().length !== beforeClickCount + 1) {
    throw new Error(`expected tab count ${beforeClickCount + 1} after opening folder tab, got ${getTabButtons().length}`)
  }
  const folderOpenedTab = true

  // 4) 文件夹 tab 内的面包屑：全部文件(可点击) > 当前文件夹(aria-current)
  const crumbButton = await waitFor(() => {
    const nav = findBreadcrumbNavForFolder(title)
    if (!nav) throw new Error(`breadcrumb showing folder "${title}" as current item is not visible yet`)
    const button = Array.from(nav.querySelectorAll<HTMLButtonElement>('button'))
      .find((el) => allFilesRe.test(el.getAttribute('title') ?? '') || allFilesRe.test(el.textContent ?? ''))
    if (!button) throw new Error('breadcrumb "all files" item is not a clickable button')
    return button
  }, { timeout: 15_000 })

  // 5) 点击「全部文件」→ replaceCurrentTab 原地替换当前 tab（数量不变）
  const countBeforeReplace = getTabButtons().length
  await user.click(crumbButton)
  await waitFor(() => {
    if (!allFilesRe.test(getActiveTabLabel())) {
      throw new Error(`active tab label should become "全部文件/All files" after breadcrumb click, got "${getActiveTabLabel()}"`)
    }
    if (findTabButton(tabMatchesFolder)) throw new Error('folder tab still exists; expected in-place replacement')
    if (getTabButtons().length !== countBeforeReplace) {
      throw new Error(`tab count changed after breadcrumb replacement: ${countBeforeReplace} -> ${getTabButtons().length}`)
    }
  }, { timeout: 15_000 })
  const breadcrumbReplaced = true
  const tabCountUnchanged = true

  // 6) 清理：关闭被替换成「全部文件」的 tab（槽位仍是本测试打开的）
  let closedTab = false
  const activeTab = getTabButtons().find((btn) => btn.getAttribute('data-active-tab') === 'true')
  if (activeTab && allFilesRe.test(activeTab.textContent ?? '') && getTabButtons().length > 1) {
    await closeTabAndWait(activeTab, user)
    closedTab = true
  }
  // 兜底：任何残留的同名 tab 也一并关闭
  let leftover = findTabButton(tabMatchesFolder)
  while (leftover) {
    await closeTabAndWait(leftover, user)
    leftover = findTabButton(tabMatchesFolder)
  }

  // 7) 清理：删除测试文件夹并刷新侧边栏树
  const folderDeleted = await deleteFolderViaSdk(title)
  if (folderDeleted) {
    window.dispatchEvent(new Event('refresh-folders'))
    try {
      await waitFor(() => {
        if (findFolderTreeNode(title)) throw new Error('deleted folder is still visible in the sidebar tree')
      }, { timeout: 10_000 })
    } catch (error) {
      console.warn('[procm-ui-test] open-folder-tab-breadcrumb sidebar tree refresh not confirmed', error)
    }
  }

  // 8) 恢复原激活 tab
  if (beforeActiveTabLabel) {
    const originalTab = getTabButtons().find((btn) => (btn.textContent ?? '').trim() === beforeActiveTabLabel)
    if (originalTab && originalTab.getAttribute('data-active-tab') !== 'true') {
      await user.click(originalTab)
    }
  }

  console.info('[procm-ui-test] open-folder-tab-breadcrumb finished', {
    title, folderDeleted, closedTab, folderOpenedTab, breadcrumbReplaced, tabCountUnchanged,
  })
  return { folderOpenedTab, breadcrumbReplaced, tabCountUnchanged, folderTitle: title }
}
