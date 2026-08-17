import { waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'

/**
 * 首页 Dashboard 布局 chip 创建/删除真实页面测试（HomeTabView + LayoutDialog + AlertDialog）。
 *
 * 选择器依据：
 * - tab 条按钮（HomeTabsBar）带 data-active-tab 属性，home tab label = composables.useTabs.homeLabel（首页 / Home）
 * - 布局 chip：.dashboard-layout-chip（HomeTabView），名称在 chip 内 .truncate
 * - 新建布局按钮 title = tabs.homeTabView.createLayout（新建布局 / New layout）
 * - LayoutDialog 输入框 #layout-name，提交按钮文案 tabs.layoutDialog.create（创建 / Create）
 * - 删除按钮 title = tabs.homeTabView.deleteLayout（删除布局 / Delete layout）
 * - 确认对话框 [data-slot="alert-dialog-content"]，确认按钮文案 common.delete（删除 / Delete）
 */

const HOME_TAB_LABEL = /首页|home|仪表盘/i
const CREATE_LAYOUT_TITLE = /新建布局|new\s*layout/i
const DELETE_LAYOUT_TITLE = /删除布局|delete\s*layout/i
const LAYOUT_DIALOG_TIMEOUT = 15_000

function findHomeTabButton(): HTMLButtonElement | null {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-active-tab]'))
  return buttons.find(button => HOME_TAB_LABEL.test((button.textContent ?? '').trim())) ?? null
}

function getDashboardRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.home-dashboard')
}

function getLayoutChips(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.dashboard-layout-chip'))
}

function getLayoutChipNames(): string[] {
  return getLayoutChips().map(chip => (chip.querySelector('.truncate')?.textContent ?? '').trim())
}

function findChipByName(name: string): HTMLElement | null {
  return getLayoutChips().find(chip => (chip.textContent ?? '').includes(name)) ?? null
}

function findDashboardButton(matcher: (button: HTMLButtonElement) => boolean): HTMLButtonElement | null {
  const root = getDashboardRoot()
  if (!root) return null
  return Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(matcher) ?? null
}

/** 删除指定名称的布局（点 chip 删除按钮 + 确认 AlertDialog）。主流程与失败清理共用。 */
async function deleteLayoutByName(user: UserEvent, name: string, timeout: number): Promise<void> {
  const chip = findChipByName(name)
  if (!chip) return

  const deleteButton = Array.from(chip.querySelectorAll<HTMLButtonElement>('button'))
    .find(button => DELETE_LAYOUT_TITLE.test(button.title ?? ''))
  if (!deleteButton) throw new Error(`delete button not found on layout chip "${name}"`)
  await user.click(deleteButton)

  await waitFor(() => {
    if (!document.querySelector('[data-slot="alert-dialog-content"]')) {
      throw new Error('delete-layout confirm dialog did not open')
    }
  }, { timeout })

  const alert = document.querySelector<HTMLElement>('[data-slot="alert-dialog-content"]')!
  const confirmButton = Array.from(alert.querySelectorAll<HTMLButtonElement>('button'))
    .find(button => /^删除$|^delete$/i.test((button.textContent ?? '').trim()))
  if (!confirmButton) throw new Error('confirm delete button not found in alert dialog')
  await user.click(confirmButton)

  await waitFor(() => {
    if (findChipByName(name)) throw new Error(`layout chip "${name}" still visible after delete`)
  }, { timeout })
}

/** Operates on the already-mounted Mira page, not a detached test container. */
export async function dashboardLayout(): Promise<{
  createdChip: boolean
  deletedChip: boolean
  restored: boolean
  menuOpened: boolean
}> {
  console.info('[procm-ui-test] dashboard-layout started')
  const user = userEvent.setup()
  const layoutName = `procm-ui-layout-${Date.now()}`

  // 前置：切到首页 tab（home tab 不可关闭，正常一定在 tab 条上；侧边栏无首页入口）
  const homeTab = findHomeTabButton()
  if (!homeTab) {
    throw new Error('home tab not found in the tab bar; please switch to the home (dashboard) tab manually and retry')
  }
  if (homeTab.dataset.activeTab !== 'true') {
    await user.click(homeTab)
  }
  await waitFor(() => {
    if (!getDashboardRoot()) throw new Error('dashboard did not appear on the home tab')
  }, { timeout: LAYOUT_DIALOG_TIMEOUT })

  const initialNames = getLayoutChipNames()

  try {
    // 顺带断言「添加卡片」菜单可开合（不真正添加卡片）
    const addCardButton = findDashboardButton(button => /添加卡片|add\s*card/i.test(button.textContent ?? ''))
    let menuOpened = false
    if (addCardButton) {
      await user.click(addCardButton)
      await waitFor(() => {
        if (!document.querySelector('.dashboard-add-menu')) throw new Error('add-card menu did not open')
      }, { timeout: 10_000 })
      await user.keyboard('{Escape}')
      await waitFor(() => {
        if (document.querySelector('.dashboard-add-menu')) throw new Error('add-card menu did not close on Escape')
      }, { timeout: 10_000 })
      menuOpened = true
    }

    // 新建布局
    const createLayoutButton = findDashboardButton(button => CREATE_LAYOUT_TITLE.test(button.title ?? ''))
    if (!createLayoutButton) throw new Error('create-layout button not found in the dashboard toolbar')

    await user.click(createLayoutButton)
    await waitFor(() => {
      if (!document.querySelector<HTMLInputElement>('#layout-name')) {
        throw new Error('layout dialog did not open')
      }
    }, { timeout: LAYOUT_DIALOG_TIMEOUT })

    const nameInput = document.querySelector<HTMLInputElement>('#layout-name')!
    await user.clear(nameInput)
    await user.type(nameInput, layoutName)

    const submitButton = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-slot="dialog-content"] button'))
      .find(button => /^创建$|^create$/i.test((button.textContent ?? '').trim()))
    if (!submitButton) throw new Error('create button not found in layout dialog')
    await user.click(submitButton)

    await waitFor(() => {
      if (!getLayoutChipNames().includes(layoutName)) {
        throw new Error(`new layout chip "${layoutName}" did not appear`)
      }
    }, { timeout: LAYOUT_DIALOG_TIMEOUT })
    const createdChip = true

    // 删除测试布局，恢复初始布局列表
    await deleteLayoutByName(user, layoutName, LAYOUT_DIALOG_TIMEOUT)
    const deletedChip = true

    await waitFor(() => {
      const names = getLayoutChipNames()
      if (names.join('|') !== initialNames.join('|')) {
        throw new Error(`layout chips not restored, expected [${initialNames.join(', ')}], got [${names.join(', ')}]`)
      }
    }, { timeout: LAYOUT_DIALOG_TIMEOUT })

    console.info('[procm-ui-test] dashboard-layout finished', { layoutName, initialCount: initialNames.length })
    return { createdChip, deletedChip, restored: true, menuOpened }
  } finally {
    // 失败路径清理：测试布局残留时删除（尽力而为，不掩盖原始错误）
    try {
      if (findChipByName(layoutName)) {
        await deleteLayoutByName(user, layoutName, 10_000)
      }
      const openDialog = document.querySelector('[data-slot="dialog-content"]')
      if (openDialog) await user.keyboard('{Escape}')
    } catch (cleanupError) {
      console.warn('[procm-ui-test] dashboard-layout cleanup failed', cleanupError)
    }
  }
}
