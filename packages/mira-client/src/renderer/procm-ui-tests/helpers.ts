import { waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'

/**
 * P1 测试共享工具。
 * 媒体 tab 未打开时，点击侧边栏「全部」分类进入媒体视图，
 * 然后等待 contentSelector（各测试自己的内容标志，如 '[data-selectable-id]'）出现。
 */
export async function ensureMediaTab(contentSelector: string, timeout = 15_000): Promise<void> {
  if (document.querySelector(contentSelector)) return
  const allCategory = document.querySelector<HTMLElement>('[data-folder-tree-node-id="all"]')
  if (!allCategory) throw new Error('no media tab is open and the sidebar "all" category is not available')
  const user = userEvent.setup()
  await user.click(allCategory)
  await waitFor(() => {
    if (!document.querySelector(contentSelector)) throw new Error(`media tab content "${contentSelector}" did not appear`)
  }, { timeout })
}

/**
 * 开发环境无条件暴露的 SDK 全局（见 src/renderer/web-globals.ts 的 exposeMiraSDKToWindow）：
 * window.miraSDK 为完整服务、window.mira 为精简 facade。
 * 用于测试查询/清理数据（如 tabContextMenu.ts 的删文件夹流程）。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMiraSdk(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sdk = (window as any).miraSDK ?? (window as any).mira
  if (!sdk) throw new Error('window.miraSDK is not available in this window')
  return sdk
}
