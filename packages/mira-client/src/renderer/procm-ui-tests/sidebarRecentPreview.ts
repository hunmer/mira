import { fireEvent, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'

/**
 * 侧边栏「最新添加 / 历史查看」模块 → 点击行项进入文件预览路由并返回。
 *
 * 关键 DOM（源码核实）：
 * - SidebarModuleList.vue：每个启用模块包在 Coll.sidebar-section 内，
 *   标题 h2.section-title 文本取自 sidebarModules.ts（最新添加 / 历史查看）。
 *   模块被用户禁用时整个 section 不渲染。
 * - SidebarHistoryModule.vue：行项为带 :title 的 li，点击 emit('open')。
 * - HomeView/index.vue openFilePreview：router.push({ path: '/file-preview', ... })，
 *   hash 路由（createWebHashHistory）→ window.location.hash 含 '/file-preview'。
 * - 返回途径（按文件类型不同）：Image/VideoPreview 监听 document keydown Escape
 *   （closePreview → push('/')）；DefaultPreview/AudioPreview 提供「返回」按钮；
 *   兜底 window.history.back()。
 */

function isVisible(element: Element): boolean {
  return element.getClientRects().length > 0
}

interface RecentModule {
  section: HTMLElement
  title: string
}

/** 找侧边栏「最新添加」「历史查看」模块（按此优先级，可能都存在）。 */
function findRecentModules(): RecentModule[] {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.sidebar-section'))
  const candidates: Array<RegExp> = [/^最新添加$/, /^recently added$/i, /^历史查看$/, /^最近查看$/, /^history$/i]
  const found: RecentModule[] = []
  for (const pattern of candidates) {
    const section = sections
      .filter((element) => isVisible(element))
      .find(
        (element) =>
          pattern.test((element.querySelector('.section-title')?.textContent ?? '').trim()) &&
          !found.some((item) => item.section === element),
      )
    if (section) {
      found.push({ section, title: (section.querySelector('.section-title')?.textContent ?? '').trim() })
    }
  }
  return found
}

/** 模块内的行项（带 title 的 li）。 */
function findRecentRows(section: HTMLElement): HTMLElement[] {
  return Array.from(section.querySelectorAll<HTMLElement>('li')).filter(
    (element) => isVisible(element) && Boolean(element.getAttribute('title')),
  )
}

function isOnPreviewRoute(): boolean {
  return window.location.hash.includes('/file-preview')
}

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function sidebarRecentPreview(): Promise<{
  clickedRow: true
  navigatedToPreview: true
  returnedBack: true
  initialHash: string
  moduleName: string
  returnMethod: 'escape' | 'back-button' | 'history-back'
}> {
  console.info('[procm-ui-test] sidebar-recent-preview started')
  const user = userEvent.setup()
  const initialHash = window.location.hash

  const module = await waitFor(() => {
    const modules = findRecentModules()
    if (modules.length === 0) {
      const hasSidebar = Array.from(document.querySelectorAll('.sidebar-section')).some((element) =>
        isVisible(element),
      )
      throw new Error(
        hasSidebar
          ? 'sidebar recent module (最新添加/历史查看) is not available; it may be disabled in the sidebar custom layout'
          : 'home sidebar is not visible; please run this test from the home view',
      )
    }
    // 优先取有行项的模块（最新添加优先于历史查看）
    const withRows = modules.find((item) => findRecentRows(item.section).length > 0)
    if (!withRows) {
      throw new Error(
        `sidebar recent module(s) ${modules.map((item) => `"${item.title}"`).join(', ')} have no rows (library must contain at least 1 file)`,
      )
    }
    return withRows
  }, { timeout: 15_000 })

  const rows = findRecentRows(module.section)

  // 点击第一行 → 进入 /file-preview
  await user.click(rows[0])
  await waitFor(() => {
    if (!isOnPreviewRoute()) throw new Error('window.location.hash did not navigate to /file-preview')
  }, { timeout: 15_000 })

  // 返回列表：Escape（Image/VideoPreview）→ 返回按钮（Default/AudioPreview）→ history.back 兜底
  let returnMethod: 'escape' | 'back-button' | 'history-back' = 'escape'
  fireEvent.keyDown(document, { key: 'Escape' })
  const escaped = await waitFor(() => {
    if (isOnPreviewRoute()) throw new Error('still on preview route after Escape')
  }, { timeout: 5_000 }).then(() => true, () => false)

  if (!escaped) {
    const backButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .filter((element) => isVisible(element))
      .find((element) => /^(返回|返回上一页|back|go back)$/i.test((element.getAttribute('title') ?? '').trim()))
    if (backButton) {
      returnMethod = 'back-button'
      await user.click(backButton)
    } else {
      returnMethod = 'history-back'
      window.history.back()
    }
    await waitFor(() => {
      if (isOnPreviewRoute()) throw new Error('still on preview route after back navigation')
    }, { timeout: 15_000 })
  }

  console.info('[procm-ui-test] sidebar-recent-preview finished', { moduleName: module.title, returnMethod })
  return {
    clickedRow: true,
    navigatedToPreview: true,
    returnedBack: true,
    initialHash,
    moduleName: module.title,
    returnMethod,
  }
}
