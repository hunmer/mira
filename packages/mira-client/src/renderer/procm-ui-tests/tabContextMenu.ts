import { fireEvent, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createFolder } from './createFolder'

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

async function findFolderTreeNode(title: string): Promise<HTMLElement> {
  let node: HTMLElement | null = null
  await waitFor(() => {
    node = Array.from(getFolderTreeContainer().querySelectorAll<HTMLElement>('[data-folder-tree-node-id]'))
      .find((el) => (el.textContent ?? '').includes(title)) ?? null
    if (!node) throw new Error(`folder tree node "${title}" is not visible yet`)
  }, { timeout: 15_000 })
  return node!
}

function findContextMenuItem(labelRe: RegExp): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-slot="context-menu-item"]'))
    .find((el) => labelRe.test(el.textContent ?? ''))
}

/** 通过 window.miraSDK（web-globals.ts 注入）按标题查找并删除测试文件夹 */
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
    console.warn('[procm-ui-test] tab-context-menu failed to delete test folder via SDK', title, error)
    return false
  }
}

/**
 * Operates on the already-mounted Mira page, not a detached test container.
 * 创建测试文件夹 → 打开其 tab → 右键 tab 验证「在侧边栏中定位」高亮树节点；
 * 对「关闭其他标签页」仅断言菜单项存在且可用（保守策略：不真正执行，避免关闭用户原有 tab）。
 */
export async function tabContextMenu(): Promise<{
  locatedInSidebar: boolean
  menuOpened: boolean
  closeOthersItemAvailable: boolean
  closedFolderTab: boolean
  folderDeleted: boolean
  folderTitle: string
}> {
  console.info('[procm-ui-test] tab-context-menu started')
  const user = userEvent.setup()
  const title = `procm-ui-ctx-${Date.now()}`

  const beforeActiveTabLabel = getActiveTabLabel()

  // 1) 创建测试文件夹
  await createFolder(title)

  // 2) 点击侧边栏树节点打开其 tab
  const treeNode = await findFolderTreeNode(title)
  const nodeId = treeNode.getAttribute('data-folder-tree-node-id')
  if (!nodeId) throw new Error('folder tree node has no data-folder-tree-node-id attribute')
  await user.click(treeNode)
  const tabRe = new RegExp(title)
  await waitFor(() => {
    const tab = findTabButton(tabRe)
    if (!tab) throw new Error(`tab for folder "${title}" was not opened in the tabs bar`)
    if (!tabRe.test(getActiveTabLabel())) throw new Error('folder tab should be active right after opening it')
  }, { timeout: 15_000 })

  // 3) 右键 tab → 菜单出现 → 点击「在侧边栏定位」→ 树节点获得 sidebar-locate-active
  let tabButton = findTabButton(tabRe)
  if (!tabButton) throw new Error(`tab button for folder "${title}" disappeared before context menu`)
  fireEvent.contextMenu(tabButton)
  await waitFor(() => {
    const content = document.querySelector('[data-slot="context-menu-content"]')
    if (!content || !/定位|locate/i.test(content.textContent ?? '')) {
      throw new Error('tab context menu did not open with the locate item')
    }
  }, { timeout: 10_000 })
  const menuOpened = true

  const locateItem = findContextMenuItem(/定位|locate/i)
  if (!locateItem) throw new Error('locate menu item not found in the opened context menu')
  await user.click(locateItem)

  await waitFor(() => {
    const node = document.querySelector(`[data-folder-tree-node-id="${nodeId}"]`)
    if (!node || !node.classList.contains('sidebar-locate-active')) {
      throw new Error('sidebar folder node did not get the .sidebar-locate-active class')
    }
  }, { timeout: 10_000 })
  const locatedInSidebar = true

  // 4) 再次右键：仅断言「关闭其他标签页」存在且可用，不真正执行（会关闭用户原有 tab）
  tabButton = findTabButton(tabRe) ?? tabButton
  fireEvent.contextMenu(tabButton)
  let closeOthersItemAvailable = false
  await waitFor(() => {
    const item = findContextMenuItem(/关闭其他|close others/i)
    if (!item) throw new Error('"close other tabs" menu item is missing in the tab context menu')
    if (item.getAttribute('data-disabled') !== null || item.getAttribute('aria-disabled') === 'true') {
      throw new Error('"close other tabs" menu item is unexpectedly disabled')
    }
    closeOthersItemAvailable = true
  }, { timeout: 10_000 })

  // 关闭菜单（Escape / 点击菜单外区域），不触发任何菜单命令
  const menuContent = document.querySelector('[data-slot="context-menu-content"]')
  if (menuContent) fireEvent.keyDown(menuContent, { key: 'Escape' })
  fireEvent.pointerDown(document.body)
  try {
    await waitFor(() => {
      if (document.querySelector('[data-slot="context-menu-content"]')) {
        throw new Error('context menu did not close')
      }
    }, { timeout: 5_000 })
  } catch (error) {
    console.warn('[procm-ui-test] tab-context-menu menu dismissal not confirmed', error)
  }

  // 5) 清理：关闭文件夹 tab
  const folderTab = findTabButton(tabRe)
  let closedFolderTab = false
  if (folderTab) {
    await closeTabAndWait(folderTab, user)
    closedFolderTab = true
  }

  // 6) 清理：删除测试文件夹并刷新侧边栏树
  const folderDeleted = await deleteFolderViaSdk(title)
  if (folderDeleted) {
    window.dispatchEvent(new Event('refresh-folders'))
    try {
      await waitFor(() => {
        const remains = Array.from(getFolderTreeContainer().querySelectorAll<HTMLElement>('[data-folder-tree-node-id]'))
          .some((el) => (el.textContent ?? '').includes(title))
        if (remains) throw new Error('deleted folder is still visible in the sidebar tree')
      }, { timeout: 10_000 })
    } catch (error) {
      console.warn('[procm-ui-test] tab-context-menu sidebar tree refresh not confirmed', error)
    }
  }

  // 7) 恢复原激活 tab
  const originalTab = getTabButtons()
    .find((btn) => (btn.textContent ?? '').trim() === beforeActiveTabLabel)
  if (originalTab && originalTab.getAttribute('data-active-tab') !== 'true') {
    await user.click(originalTab)
  }

  console.info('[procm-ui-test] tab-context-menu finished', {
    title, folderDeleted, closedFolderTab, closeOthersItemAvailable,
  })
  return { locatedInSidebar, menuOpened, closeOthersItemAvailable, closedFolderTab, folderDeleted, folderTitle: title }
}
