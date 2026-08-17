import { screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'

/** 侧栏顶部的 Mira logo 按钮，title 为「关于 Mira」 */
const ABOUT_TRIGGER_TITLE = /关于\s*mira|about\s+mira/i

function findAboutTriggerButton(): HTMLButtonElement {
  const button = screen.getAllByTitle(ABOUT_TRIGGER_TITLE)[0]
  if (!button) throw new Error('sidebar about (Mira logo) button is not available')
  return button as HTMLButtonElement
}

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function aboutDialog(): Promise<{
  opened: boolean
  versionVisible: boolean
  closed: boolean
}> {
  console.info('[procm-ui-test] about-dialog started')
  const user = userEvent.setup()
  await user.click(findAboutTriggerButton())

  // 对话框打开：role=dialog，含「关于 Mira」标题与产品名文本
  const dialog = await waitFor(() => {
    const el = screen.getByRole('dialog') as HTMLElement
    const text = el.textContent ?? ''
    if (!ABOUT_TRIGGER_TITLE.test(text)) throw new Error('about dialog title text is missing')
    if (!/Mira Media Library/.test(text)) throw new Error('about dialog app name text is missing')
    return el
  }, { timeout: 10_000 })

  // 版本号异步加载（Electron IPC / vite 注入），等待 v1.2.x 形态的文本出现
  let versionVisible = false
  await waitFor(() => {
    const text = dialog.textContent ?? ''
    if (!/v\d+\.\d+/.test(text)) throw new Error('about dialog version number is not visible yet')
    versionVisible = true
  }, { timeout: 10_000 })

  // 用对话框右上角关闭按钮关闭；绝不点击「检查更新」等会发网络请求的按钮
  const closeButton = dialog.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')
  if (closeButton) {
    await user.click(closeButton)
  } else {
    await user.keyboard('{Escape}')
  }

  await waitFor(() => {
    if (screen.queryByRole('dialog')) throw new Error('about dialog is still visible after closing')
  }, { timeout: 10_000 })

  console.info('[procm-ui-test] about-dialog finished', { versionVisible })
  return { opened: true, versionVisible, closed: true }
}
