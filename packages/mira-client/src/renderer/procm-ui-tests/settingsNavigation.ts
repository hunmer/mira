import { screen, waitFor, within } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'

/**
 * HomeHeader 头像下拉触发按钮：reka DropdownMenuTrigger 会在按钮上渲染 aria-haspopup="menu"。
 * 优先匹配含 avatar 图片的；无头像时回退到不带 title 的菜单触发按钮
 * （侧栏 ImportDropdown 的触发按钮带 title，可被排除）。
 */
function findUserMenuTrigger(): HTMLButtonElement {
  const withAvatar = document.querySelector<HTMLButtonElement>(
    'button[aria-haspopup="menu"]:has(img[alt="avatar"])',
  )
  if (withAvatar) return withAvatar

  const trigger = Array.from(document.querySelectorAll<HTMLButtonElement>('button[aria-haspopup="menu"]'))
    .filter((el) => !el.hasAttribute('title'))[0]
  if (!trigger) throw new Error('user avatar dropdown trigger is not available')
  return trigger
}

/** 头像菜单里的「应用设置」菜单项（en 为 "Settings"，含 material icon 文本 "settings"） */
const SETTINGS_MENU_ITEM = /应用设置|settings\s+settings/i

/** 依次访问的设置分区：按钮名（icon 文本 + label）→ 面板内可断言的标题文本 */
const SECTIONS_TO_VISIT: Array<{ id: string; button: RegExp; panel: RegExp }> = [
  { id: 'notifications', button: /通知|notifications/i, panel: /启用通知|enable notifications/i },
  { id: 'network', button: /网络|network/i, panel: /HTTP 代理|HTTP proxy/i },
  { id: 'data', button: /数据|data/i, panel: /导出设置|export settings/i },
]

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function settingsNavigation(): Promise<{
  opened: boolean
  visitedSections: string[]
  closed: boolean
}> {
  console.info('[procm-ui-test] settings-navigation started')
  const user = userEvent.setup()

  // 1. 打开头像下拉菜单，点击「应用设置」
  await user.click(findUserMenuTrigger())
  const menu = await waitFor(() => {
    const el = screen.getByRole('menu') as HTMLElement
    return el
  }, { timeout: 10_000 })
  await user.click(within(menu).getByRole('menuitem', { name: SETTINGS_MENU_ITEM }))

  // 2. 设置对话框打开：role=dialog 且含标题「设置」
  const dialog = await waitFor(() => {
    const el = screen.getByRole('dialog') as HTMLElement
    const text = el.textContent ?? ''
    if (!/设置|settings/i.test(text)) throw new Error('settings dialog title text is missing')
    return el
  }, { timeout: 10_000 })

  const visitedSections: string[] = []

  // 默认分区 general：断言通用面板（语言选项）已渲染
  await waitFor(() => {
    const text = dialog.textContent ?? ''
    if (!/语言|language/i.test(text)) throw new Error('general panel content is not visible')
  }, { timeout: 10_000 })
  visitedSections.push('general')

  // 3. 依次点击分区图标按钮，断言对应面板出现；面板中不做任何修改
  for (const section of SECTIONS_TO_VISIT) {
    await user.click(within(dialog).getByRole('button', { name: section.button }))
    await waitFor(() => {
      const text = dialog.textContent ?? ''
      if (!section.panel.test(text)) {
        throw new Error(`settings section "${section.id}" panel content is not visible`)
      }
    }, { timeout: 10_000 })
    visitedSections.push(section.id)
  }

  // 4. 关闭对话框并断言从 DOM 消失
  const closeButton = dialog.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')
  if (closeButton) {
    await user.click(closeButton)
  } else {
    await user.keyboard('{Escape}')
  }
  await waitFor(() => {
    if (screen.queryByRole('dialog')) throw new Error('settings dialog is still visible after closing')
  }, { timeout: 10_000 })

  console.info('[procm-ui-test] settings-navigation finished', { visitedSections })
  return { opened: true, visitedSections, closed: true }
}
