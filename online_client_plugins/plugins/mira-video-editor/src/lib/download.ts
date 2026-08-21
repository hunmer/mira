/**
 * 导出产物落地：浏览器下载到本机 + 保存到素材库。
 */

import { getHost } from './host'
import { toFileUrl } from './path'

/** 经宿主读取本地文件后触发浏览器下载（绕过 file:// fetch 限制） */
export async function downloadToLocalFile(filePath: string, fileName?: string): Promise<void> {
  const host = getHost()
  if (!host) throw new Error('宿主环境不可用，无法下载文件')
  const bytes = await host.fs.readFile(filePath)
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'video/mp4' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName || filePath.split(/[\\/]/).pop() || 'export.mp4'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** 把本地导出文件保存到 Mira 素材库（经 addFromURL 下载入库） */
export async function saveToLibrary(filePath: string, fileName?: string): Promise<unknown> {
  const host = getHost()
  if (!host) throw new Error('宿主环境不可用，无法保存到素材库')
  const url = toFileUrl(filePath)
  return host.item.addFromURL(url, { name: fileName || filePath.split(/[\\/]/).pop() })
}
