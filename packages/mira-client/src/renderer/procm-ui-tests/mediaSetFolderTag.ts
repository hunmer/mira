import { fireEvent, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { createFolder } from './createFolder'
import { ensureMediaTab, getMiraSdk } from './helpers'

/**
 * 素材右键「设置文件夹」测试（真实 Renderer DOM，非 jsdom render）。
 *
 * 源码依据：
 * - 右键命中：MediaContextMenu.vue 根部 @contextmenu.capture="resolveAndOpen"，
 *   从事件目标 closest('[data-selectable-id]') 解析出 FileInfo（三种视图条目根节点均带该属性），
 *   同时 reka-ui ContextMenuTrigger 收到 contextmenu 打开菜单 → fireEvent.contextMenu(item) 一次即可。
 * - 菜单项文案：useContextMenu.ts contextMenuItems 的
 *   $t('business.contextMenu.setFolder') = zh「设置文件夹」/ en「Set folder」（多选时带 ({count})）。
 * - 点击菜单项后 setTimeout(100ms) openFolderPopover → Popover（[data-slot="popover-content"]）
 *   内嵌 FolderTreeComponent（.folder-tree-container，节点 [data-folder-tree-node-id]，点击行 emit select）。
 * - handleFolderSelect（useContextMenu.ts）→ client.folders().setFileFolder({ libraryId, fileId, folder })。
 *   单文件路径 runBatchOperation 不弹 toast（≥2 个文件才有进度 toast），
 *   故成功断言用 miraSDK.getFile 轮询 folderId 变化，而非 [data-sonner-toast]。
 * - Popover 的树 show-base-categories=false，无「移出文件夹」入口；原值为「无文件夹」时
 *   只能经 SDK setFileFolder({ folder: null }) 还原（mira-app-core FolderModule 支持 folder: number | null）。
 * 副作用：会把第一个素材的 folderId 改为测试文件夹，随后还原为原值；测试文件夹经 miraSDK 删除。
 * 若还原失败则保留测试文件夹（不删，避免文件被顺带移到未分类）并在结果中如实报告。
 */

function isVisible(el: HTMLElement): boolean {
  return el.getClientRects().length > 0
}

function getSelectableItems(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-selectable-id]'))
    .filter(isVisible)
}

/** 可见右键菜单里的菜单项（页面上可能有多个 ContextMenu 实例，按可见性过滤）。 */
function findVisibleContextMenuItem(labelRe: RegExp): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-slot="context-menu-content"]'))
    .filter(isVisible)
    .flatMap(content => Array.from(content.querySelectorAll<HTMLElement>('[data-slot="context-menu-item"]')))
    .find(item => labelRe.test(item.textContent ?? ''))
}

/** 「设置文件夹」Popover：可见 [data-slot="popover-content"] 且内嵌文件夹树。 */
function findFolderPopoverContent(): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-slot="popover-content"]'))
    .filter(isVisible)
    .find(content => content.querySelector('.folder-tree-container')) ?? null
}

/** Popover 文件夹树中按标题找节点（scoped 到 Popover，避免命中侧边栏同名节点）。 */
function findFolderNodeInPopover(popover: HTMLElement, title: string): HTMLElement | null {
  return Array.from(popover.querySelectorAll<HTMLElement>('[data-folder-tree-node-id]'))
    .find(node => (node.textContent ?? '').includes(title)) ?? null
}

interface FileLocation {
  libraryId: string
  folderId: string | null
}

/** 经 miraSDK 定位文件所属 library 与当前 folderId（fileId 仅库内唯一，跨库需遍历）。 */
async function resolveFileLocation(sdk: any, fileId: string): Promise<FileLocation> {
  const libraries = await sdk.getLibraries()
  const candidates: FileLocation[] = []
  for (const lib of libraries ?? []) {
    if (!lib?.id) continue
    try {
      const file = await sdk.getFile(lib.id, fileId)
      if (file?.id !== undefined && String(file.id) === String(fileId)) {
        candidates.push({ libraryId: lib.id, folderId: file.folderId ?? null })
      }
    } catch {
      // 该库没有此 id 的文件，继续下一个库
    }
  }
  if (candidates.length === 0) return { libraryId: '', folderId: null }
  if (candidates.length > 1) {
    console.warn(`[procm-ui-test] media-set-folder-tag file id "${fileId}" exists in ${candidates.length} libraries, using the first one`)
  }
  return candidates[0]
}

async function readFileFolderId(sdk: any, libraryId: string, fileId: string): Promise<string | null> {
  const file = await sdk.getFile(libraryId, fileId)
  return file?.folderId ?? null
}

/** SDK 直写 folderId（folder 为 null 表示移出文件夹）。优先底层 client，缺省退公共方法。 */
async function setFileFolderViaSdk(sdk: any, libraryId: string, fileId: string, folderId: number | null): Promise<void> {
  const client = sdk?.client
  if (client?.folders && typeof client.folders().setFileFolder === 'function') {
    await client.folders().setFileFolder({ libraryId, fileId: parseInt(fileId, 10), folder: folderId })
    return
  }
  if (folderId != null && typeof sdk.moveFileToFolder === 'function') {
    await sdk.moveFileToFolder(libraryId, parseInt(fileId, 10), folderId)
    return
  }
  throw new Error('miraSDK exposes no API to set a file folder (client.folders().setFileFolder / moveFileToFolder)')
}

/** SDK 是否能把文件移出文件夹（UI 的 Popover 无此入口）。 */
function canClearFolderViaSdk(sdk: any): boolean {
  const client = sdk?.client
  return !!(client?.folders && typeof client.folders().setFileFolder === 'function')
}

/** 右键素材 → 菜单出现 → 点「设置文件夹」→ Popover 文件夹树出现，返回 Popover 元素。 */
async function openSetFolderPopover(
  user: ReturnType<typeof userEvent.setup>,
  item: HTMLElement
): Promise<HTMLElement> {
  fireEvent.contextMenu(item)
  await waitFor(() => {
    if (!findVisibleContextMenuItem(/设置文件夹|set folder/i)) {
      throw new Error('"set folder" context menu item did not appear (is the current view the trash view?)')
    }
  }, { timeout: 10_000 })
  const menuItem = findVisibleContextMenuItem(/设置文件夹|set folder/i)
  if (!menuItem) throw new Error('"set folder" context menu item not found after menu opened')
  await user.click(menuItem)
  // 菜单项命令里 setTimeout(100ms) 才打开 Popover
  return waitFor(() => {
    const popover = findFolderPopoverContent()
    if (!popover?.querySelector('.folder-tree-container')) {
      throw new Error('set-folder popover with the folder tree did not appear')
    }
    return popover
  }, { timeout: 10_000 })
}

async function dismissFolderPopover(): Promise<void> {
  fireEvent.keyDown(document.body, { key: 'Escape' })
  fireEvent.pointerDown(document.body)
  try {
    await waitFor(() => {
      if (findFolderPopoverContent()) throw new Error('set-folder popover did not close')
    }, { timeout: 5_000 })
  } catch (error) {
    console.warn('[procm-ui-test] media-set-folder-tag popover dismissal not confirmed', error)
  }
}

/** miraSDK 清理：优先用已知 (libraryId, folderId) 删除，否则跨库按标题查找后删除。 */
async function deleteTestFolder(sdk: any, title: string, known?: { libraryId: string; id: number }): Promise<boolean> {
  if (known) {
    await sdk.deleteFolder(known.libraryId, known.id, false)
    return true
  }
  const libraries = await sdk.getLibraries()
  for (const lib of libraries ?? []) {
    if (!lib?.id) continue
    const folders = await sdk.getAllFolders(lib.id)
    const hit = (folders ?? []).find((f: any) => f && (f.title === title || f.name === title))
    if (hit) {
      await sdk.deleteFolder(lib.id, Number(hit.id), false)
      return true
    }
  }
  return false
}

/**
 * Operates on the already-mounted Mira page, not a detached test container.
 * 右键第一个素材 →「设置文件夹」→ Popover 中点测试文件夹 → SDK 校验 folderId 生效 → 还原原文件夹 → 删测试文件夹。
 */
export async function mediaSetFolderTag(): Promise<{
  menuOpened: boolean
  popoverShown: boolean
  folderSet?: boolean
  restored?: boolean
  restoreVia?: 'ui' | 'sdk' | ''
  degraded?: string
}> {
  console.info('[procm-ui-test] media-set-folder-tag started')
  const user = userEvent.setup()

  const sdk = getMiraSdk()
  try {
    await sdk.getLibraries()
  } catch (error) {
    throw new Error(`media library server is not connected, miraSDK.getLibraries() failed: ${error instanceof Error ? error.message : String(error)}`)
  }

  await ensureMediaTab('[data-selectable-id]')
  await waitFor(() => {
    if (getSelectableItems().length < 1) throw new Error('no selectable media items rendered in the media view')
  }, { timeout: 15_000 })
  const firstItem = getSelectableItems()[0]
  const fileId = firstItem.getAttribute('data-selectable-id')
  if (!fileId) throw new Error('first media item is missing the data-selectable-id attribute')
  if (!/^\d+$/.test(fileId)) {
    throw new Error(`media item id "${fileId}" is not numeric; folder APIs require a numeric fileId`)
  }

  // 记录原值（还原依据）
  const location = await resolveFileLocation(sdk, fileId)
  if (!location.libraryId) {
    throw new Error(`failed to resolve the library of media file "${fileId}" via miraSDK`)
  }
  const originalFolderId = location.folderId

  const title = `procm-ui-setfolder-${Date.now()}`
  await createFolder(title)

  let testFolderId: number | null = null
  let testFolderLibraryId = ''
  try {
    const libraries = await sdk.getLibraries()
    for (const lib of libraries ?? []) {
      if (!lib?.id) continue
      const folders = await sdk.getAllFolders(lib.id)
      const hit = (folders ?? []).find((f: any) => f && (f.title === title || f.name === title))
      if (hit) {
        testFolderId = Number(hit.id)
        testFolderLibraryId = lib.id
        break
      }
    }
  } catch (error) {
    console.warn('[procm-ui-test] media-set-folder-tag failed to resolve test folder id via SDK', error)
  }
  if (testFolderId == null) {
    // 未找到 id 时也要尝试按标题清理，避免遗留测试文件夹
    await deleteTestFolder(sdk, title).catch(() => false)
    throw new Error(`created test folder "${title}" was not found via miraSDK.getAllFolders (was it created in another library?)`)
  }

  // 已改动文件归属但还原失败时保留测试文件夹（删除会把文件顺带移到未分类）
  let keepTestFolderForManualFix = false

  try {
    // 1) 右键 → 菜单出现；2) 点「设置文件夹」→ Popover 树出现且含测试文件夹节点
    //    （createFolder 弹窗等过程可能引起重渲染，右键前重新定位该素材节点）
    const itemForMenu = document.querySelector<HTMLElement>(`[data-selectable-id="${fileId}"]`)
    if (!itemForMenu || !isVisible(itemForMenu)) {
      throw new Error(`first media item "${fileId}" is no longer visible before opening the context menu`)
    }
    const popover = await openSetFolderPopover(user, itemForMenu)
    const menuOpened = true
    const popoverShown = true

    await waitFor(() => {
      if (!findFolderNodeInPopover(findFolderPopoverContent() ?? popover, title)) {
        throw new Error(`test folder "${title}" node is not rendered in the set-folder popover tree`)
      }
    }, { timeout: 10_000 })

    // 还原途径判定：原值为「无文件夹」且 SDK 无法置空时，只断言到 Popover 渲染，不真正改数据
    if (originalFolderId == null && !canClearFolderViaSdk(sdk)) {
      await dismissFolderPopover()
      const degraded = 'original folder is "no folder" and miraSDK cannot set folder to null, so the folder node was not clicked'
      console.warn('[procm-ui-test] media-set-folder-tag degraded:', degraded)
      return { menuOpened, popoverShown, folderSet: false, restored: false, restoreVia: '', degraded }
    }

    // 3) 点测试文件夹节点 → Popover 关闭 → SDK 轮询校验 folderId 已生效
    const folderNode = findFolderNodeInPopover(findFolderPopoverContent() ?? popover, title)
    if (!folderNode) throw new Error(`test folder node "${title}" disappeared from the popover before clicking`)
    await user.click(folderNode)
    await waitFor(() => {
      if (findFolderPopoverContent()) throw new Error('set-folder popover did not close after selecting a folder')
    }, { timeout: 10_000 })
    try {
      await waitFor(async () => {
        const current = await readFileFolderId(sdk, location.libraryId, fileId)
        if (current !== String(testFolderId)) {
          throw new Error(`file folderId did not change to the test folder (expected "${testFolderId}", got "${current}")`)
        }
      }, { timeout: 15_000 })
    } catch (error) {
      // 校验超时但文件可能实际已入文件夹：确认后保留文件夹再抛，避免清理时把文件移到未分类
      const current = await readFileFolderId(sdk, location.libraryId, fileId).catch(() => null)
      if (current === String(testFolderId)) keepTestFolderForManualFix = true
      throw error
    }
    const folderSet = true

    // 4) 还原原文件夹：优先走同一右键 UI 流程，失败退回 SDK 直写
    let restored = false
    let restoreVia: 'ui' | 'sdk' | '' = ''
    if (originalFolderId != null) {
      try {
        const folders = await sdk.getAllFolders(location.libraryId)
        const original = (folders ?? []).find((f: any) => f && String(f.id) === String(originalFolderId))
        const originalTitle = original?.title || original?.name
        const itemNow = document.querySelector<HTMLElement>(`[data-selectable-id="${fileId}"]`)
        if (!originalTitle || !itemNow || !isVisible(itemNow)) {
          throw new Error('original folder title or the media item element is not available for the UI restore flow')
        }
        const restorePopover = await openSetFolderPopover(user, itemNow)
        const restoreNode = await waitFor(() => {
          const node = findFolderNodeInPopover(findFolderPopoverContent() ?? restorePopover, originalTitle)
          if (!node) throw new Error(`original folder "${originalTitle}" node is not rendered in the popover`)
          return node
        }, { timeout: 10_000 })
        await user.click(restoreNode)
        await waitFor(async () => {
          const current = await readFileFolderId(sdk, location.libraryId, fileId)
          if (current !== String(originalFolderId)) {
            throw new Error(`file folderId did not restore to "${originalFolderId}" (got "${current}")`)
          }
        }, { timeout: 15_000 })
        restored = true
        restoreVia = 'ui'
      } catch (error) {
        console.warn('[procm-ui-test] media-set-folder-tag UI restore failed, falling back to SDK', error)
      }
    }
    if (!restored) {
      const originalFolderNumber = originalFolderId != null ? Number(originalFolderId) : null
      try {
        await setFileFolderViaSdk(sdk, location.libraryId, fileId, originalFolderNumber)
        await waitFor(async () => {
          const current = await readFileFolderId(sdk, location.libraryId, fileId)
          if (current !== originalFolderId) {
            throw new Error(`file folderId did not restore to "${originalFolderId}" (got "${current}")`)
          }
        }, { timeout: 15_000 })
        restored = true
        restoreVia = 'sdk'
      } catch (error) {
        keepTestFolderForManualFix = true
        console.error('[procm-ui-test] media-set-folder-tag failed to restore the original folder', error)
      }
    }

    const result = {
      menuOpened,
      popoverShown,
      folderSet,
      restored,
      restoreVia,
      ...(restored ? {} : {
        degraded: keepTestFolderForManualFix
          ? `restore failed: media file "${fileId}" remains inside test folder "${title}" (kept for manual fix)`
          : 'file folder was not restored to its original value',
      }),
    }
    console.info('[procm-ui-test] media-set-folder-tag finished', result)
    return result
  } finally {
    // 5) 清理：删除测试文件夹并刷新侧边栏树（还原失败时保留文件夹，见上）
    if (keepTestFolderForManualFix) {
      console.warn(`[procm-ui-test] media-set-folder-tag keeps test folder "${title}" because the file restore failed`)
    } else {
      try {
        const deleted = await deleteTestFolder(sdk, title, testFolderId != null ? { libraryId: testFolderLibraryId, id: testFolderId } : undefined)
        if (deleted) {
          window.dispatchEvent(new Event('refresh-folders'))
          await waitFor(() => {
            const remains = Array.from(document.querySelectorAll<HTMLElement>('[data-folder-tree-node-id]'))
              .some(node => (node.textContent ?? '').includes(title))
            if (remains) throw new Error(`test folder "${title}" is still visible in the sidebar tree`)
          }, { timeout: 10_000 })
        } else {
          console.warn(`[procm-ui-test] media-set-folder-tag cleanup failed to find test folder "${title}"`)
        }
      } catch (error) {
        console.warn('[procm-ui-test] media-set-folder-tag cleanup incomplete', error)
      }
    }
  }
}
