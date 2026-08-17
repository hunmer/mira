import { screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { useSettingsStore } from '@renderer/stores/settings'

/** HomeHeader 主题切换按钮的 title：暗色时为「切换到浅色主题」，浅色时为「切换到深色主题」 */
const THEME_TOGGLE_TITLE = /切换到(浅色|深色)主题|switch to (light|dark) theme/i

/** title 是否在描述「浅色」目标（即当前处于暗色模式） */
const isLightThemeTitle = (title: string) => /浅色|light/i.test(title)

function findThemeToggleButton(): HTMLButtonElement {
  const button = screen.getAllByTitle(THEME_TOGGLE_TITLE)[0]
  if (!button) throw new Error('theme toggle button is not available')
  return button as HTMLButtonElement
}

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function switchTheme(): Promise<{
  initialTitle: string
  toggledTitle: string
  restored: boolean
}> {
  console.info('[procm-ui-test] switch-theme started')
  const user = userEvent.setup()
  const settingsStore = useSettingsStore()
  // 记录持久化的原始 theme（可能是 auto）：连点两次后 theme 会落成 light/dark，结束时需还原
  const initialTheme = settingsStore.settings.theme

  const initialTitle = findThemeToggleButton().getAttribute('title') ?? ''
  const initialDark = document.documentElement.classList.contains('dark')

  // 第一次点击：title 翻转，<html> 的 dark class 随之切换（applyTheme）
  await user.click(findThemeToggleButton())
  let toggledTitle = ''
  await waitFor(() => {
    toggledTitle = findThemeToggleButton().getAttribute('title') ?? ''
    if (toggledTitle === initialTitle) throw new Error('theme toggle button title did not flip after first click')
    const darkNow = document.documentElement.classList.contains('dark')
    if (darkNow === initialDark) throw new Error('documentElement dark class did not toggle after first click')
    if (isLightThemeTitle(toggledTitle) !== darkNow) throw new Error('toggled button title does not match applied theme')
  }, { timeout: 10_000 })

  // 第二次点击：title 与 dark class 完全回到初始状态
  await user.click(findThemeToggleButton())
  await waitFor(() => {
    const restoredTitle = findThemeToggleButton().getAttribute('title') ?? ''
    if (restoredTitle !== initialTitle) throw new Error('theme toggle button title was not restored')
    const darkNow = document.documentElement.classList.contains('dark')
    if (darkNow !== initialDark) throw new Error('documentElement dark class was not restored')
  }, { timeout: 10_000 })

  // 原始值为 auto 时，两次切换会把 theme 持久化为 light/dark，这里回写还原
  let restored = true
  if (settingsStore.settings.theme !== initialTheme) {
    settingsStore.settings.theme = initialTheme
    settingsStore.applyTheme()
    await settingsStore.saveSettings()
  }

  console.info('[procm-ui-test] switch-theme finished', { initialTitle, toggledTitle, restored })
  return { initialTitle, toggledTitle, restored }
}
