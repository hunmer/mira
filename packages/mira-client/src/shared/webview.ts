/** 所有 Mira webview 会话使用的固定 partition 前缀。 */
export const WEBVIEW_PARTITION_PREFIX = 'persist:mira-webview-'
export const DEFAULT_WEBVIEW_PARTITION = `${WEBVIEW_PARTITION_PREFIX}default`

/** 将 partition 归一化到 Mira 专用命名空间，避免误用主窗口默认 session。 */
export function normalizeWebviewPartition(partition?: string): string {
  const raw = (partition || '').trim().replace(/^persist:/i, '')
  if (!raw) return DEFAULT_WEBVIEW_PARTITION

  const suffix = raw.replace(/^mira-webview-/i, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${WEBVIEW_PARTITION_PREFIX}${suffix || 'default'}`
}
