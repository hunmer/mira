import { screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'

/**
 * 「从 URL 导入」对话框非法输入校验真实页面测试（ImportDropdown + UrlImportDialog）。
 *
 * 选择器依据：
 * - 导入下拉 trigger title = views.sidebarToolbar.import（导入 / Import）
 * - 菜单项文案 = business.homeHeader.importFromUrl（从 URL 导入 / Import from URL）
 * - 对话框：reka Dialog（data-slot="dialog-content"），标题 business.urlImportDialog.title
 * - Textarea：business.urlImportDialog.placeholder（每行一个图片 URL）
 * - 开始按钮文案 = business.urlImportDialog.start（开始下载 / Start Download）
 *   disabled 条件 canStart = 非空文本 + 已选素材库；点击后 parseUrls 过滤非 http(s) 行，
 *   为空时 toast.error(business.urlImportDialog.emptyUrls)，不进入下载（batchId 保持 null）
 * - toast 为 vue-sonner，DOM 节点带 [data-sonner-toast]
 */

const IMPORT_TRIGGER_TITLE = /^导入$|^import$/i
const URL_IMPORT_TEXT = /从\s*url\s*导入|import\s+from\s+url/i
const START_BUTTON_TEXT = /开始下载|start\s+download/i

function isVisible(element: Element): boolean {
  const el = element as HTMLElement
  return el.getClientRects().length > 0 && el.offsetParent !== null
}

/** 桌面侧栏与移动抽屉可能同时挂载工具栏，仅点击可见按钮 */
function findImportTriggerButton(): HTMLButtonElement {
  const candidates = screen.getAllByTitle(IMPORT_TRIGGER_TITLE)
  const button = candidates.find(isVisible) ?? candidates[0]
  if (!button) throw new Error('import dropdown trigger button is not available')
  return button as HTMLButtonElement
}

function findUrlImportDialog(): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-slot="dialog-content"]'))
    .find(dialog => URL_IMPORT_TEXT.test(dialog.textContent ?? '')) ?? null
}

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function urlImportValidation(): Promise<{
  dialogOpened: boolean
  invalidRejected: boolean
  rejectionMode: 'toast' | 'button-disabled'
  closed: boolean
}> {
  console.info('[procm-ui-test] url-import-validation started')
  const user = userEvent.setup()

  try {
    await user.click(findImportTriggerButton())

    await waitFor(() => {
      if (!document.querySelector('[data-slot="dropdown-menu-content"]')) {
        throw new Error('import dropdown menu did not open')
      }
    }, { timeout: 10_000 })

    const menu = document.querySelector<HTMLElement>('[data-slot="dropdown-menu-content"]')!
    const urlImportItem = Array.from(menu.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]'))
      .find(item => URL_IMPORT_TEXT.test(item.textContent ?? ''))
    if (!urlImportItem) throw new Error('"import from URL" menu item not found in import dropdown')

    await user.click(urlImportItem)

    await waitFor(() => {
      if (!findUrlImportDialog()) throw new Error('url import dialog did not open')
    }, { timeout: 10_000 })

    const dialog = findUrlImportDialog()!
    const textarea = dialog.querySelector<HTMLTextAreaElement>('textarea')
    if (!textarea) throw new Error('url import dialog textarea not found')

    const findStartButton = () =>
      Array.from(dialog.querySelectorAll<HTMLButtonElement>('button'))
        .find(button => START_BUTTON_TEXT.test((button.textContent ?? '').trim()))

    // 初始文本为空：开始按钮必须 disabled
    const initialButton = findStartButton()
    if (!initialButton) throw new Error('start button not found in url import dialog')
    if (!initialButton.disabled) throw new Error('start button should be disabled when input is empty')

    // 输入非 URL 文本（parseUrls 只认 http(s) 行）
    await user.clear(textarea)
    await user.type(textarea, 'not-a-url')

    let rejectionMode: 'toast' | 'button-disabled'
    const startButton = findStartButton()
    if (!startButton) throw new Error('start button disappeared after typing')

    if (!startButton.disabled) {
      // 已选素材库：按钮可点击，但非法输入会被 parseUrls 拒绝并弹错误 toast
      await user.click(startButton)
      await waitFor(() => {
        const rejected = Array.from(document.querySelectorAll<HTMLElement>('[data-sonner-toast]'))
          .some(toast => /有效\s*url|valid\s+url|素材库|library/i.test(toast.textContent ?? ''))
        if (!rejected) throw new Error('expected an error toast rejecting the invalid URL input')
      }, { timeout: 10_000 })
      rejectionMode = 'toast'
    } else {
      // 未选素材库：非法输入下按钮保持 disabled，同样无法开始下载
      rejectionMode = 'button-disabled'
    }

    // 未进入下载进度状态：无进度条、输入框未被锁定
    const currentDialog = findUrlImportDialog()
    if (!currentDialog) throw new Error('url import dialog closed unexpectedly')
    if (currentDialog.querySelector('[role="progressbar"]')) {
      throw new Error('download progress appeared for invalid URL input')
    }
    const currentTextarea = currentDialog.querySelector<HTMLTextAreaElement>('textarea')
    if (!currentTextarea || currentTextarea.disabled) {
      throw new Error('textarea should stay editable when the invalid input is rejected')
    }

    await user.keyboard('{Escape}')
    await waitFor(() => {
      if (findUrlImportDialog()) throw new Error('url import dialog did not close after Escape')
    }, { timeout: 10_000 })

    console.info('[procm-ui-test] url-import-validation finished', { rejectionMode })
    return { dialogOpened: true, invalidRejected: true, rejectionMode, closed: true }
  } finally {
    // 失败路径清理：确保菜单与对话框关闭（对话框内容为本地状态，不会持久化）
    try {
      if (document.querySelector('[data-slot="dropdown-menu-content"]')) {
        await user.keyboard('{Escape}')
      }
      if (findUrlImportDialog()) {
        await user.keyboard('{Escape}')
        await waitFor(() => {
          if (findUrlImportDialog()) throw new Error('url import dialog still open')
        }, { timeout: 5_000 })
      }
    } catch (cleanupError) {
      console.warn('[procm-ui-test] url-import-validation cleanup failed', cleanupError)
    }
  }
}
