import { screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'

function findLayoutDialog(): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-slot="dialog-content"], [role="dialog"]'))
    .find((element) => element.offsetParent !== null && /自定义侧边栏布局|sidebar layout/i.test(element.textContent ?? ''))
    ?? null
}

/**
 * 自定义侧边栏布局对话框：打开 → 断言「已启用/未启用」两个拖拽区渲染 → 点「完成」关闭。
 * 注意：模块启停依赖 VueDraggable HTML5 拖拽（且拖动即写回持久化 store），
 * user-event 无法可靠模拟且会改用户布局，故不覆盖拖拽本身，只验证对话框交互，零副作用。
 */
export async function sidebarLayoutDialog(): Promise<{
  opened: boolean
  enabledSectionVisible: boolean
  disabledSectionVisible: boolean
  closed: boolean
}> {
  console.info('[procm-ui-test] sidebar-layout-dialog started')
  const user = userEvent.setup()

  const trigger = await waitFor(() => {
    const button = screen.getAllByTitle(/自定义布局|customize layout/i)
      .find((element) => element.tagName === 'BUTTON' && element.offsetParent !== null)
    if (!button) throw new Error('customize layout button is not available')
    return button as HTMLButtonElement
  }, { timeout: 10_000 })
  await user.click(trigger)

  const dialog = await waitFor(() => {
    const target = findLayoutDialog()
    if (!target) throw new Error('sidebar layout dialog did not open')
    return target
  }, { timeout: 10_000 })

  const text = dialog.textContent ?? ''
  const enabledSectionVisible = /已启用|enabled/i.test(text)
  const disabledSectionVisible = /未启用|disabled/i.test(text)
  if (!enabledSectionVisible || !disabledSectionVisible) {
    throw new Error('sidebar layout dialog sections are not rendered')
  }

  const doneButton = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button'))
    .find((button) => /完成|done/i.test((button.textContent ?? '').trim()))
  if (!doneButton) throw new Error('sidebar layout dialog done button is not found')
  await user.click(doneButton)

  await waitFor(() => {
    if (findLayoutDialog()) throw new Error('sidebar layout dialog did not close')
  }, { timeout: 10_000 })

  console.info('[procm-ui-test] sidebar-layout-dialog finished')
  return { opened: true, enabledSectionVisible, disabledSectionVisible, closed: true }
}
