// 图标资源统一在 public/icons/ 下（vscode-file-icons 风格 SVG），
// 映射逻辑复用 @/components/ui/file-icon 的 iconPaths。
// 新代码建议直接用 FileIcon 组件或 getFileIconPath。

import { getFileIconPath } from '@/components/ui/file-icon/iconPaths'

/** @deprecated 请改用 @/components/ui/file-icon 的 FileIcon 组件或 getFileIconPath */
export function getExtIconUrl(filename: string): string {
  return getFileIconPath(filename)
}
