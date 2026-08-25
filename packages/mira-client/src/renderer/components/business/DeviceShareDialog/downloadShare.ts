import { appService } from '@renderer/services'
import type { DeviceShareFile, DeviceShareMessage } from '@renderer/composables/useDeviceShare'
import { buildFileDownloadUrl } from '@renderer/composables/useDeviceShare'
import { useAuthStore } from '@renderer/stores/auth'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { receiveBinaryShare } from './binaryTransfer'

export interface DownloadProgress {
  (percent: number, receivedBytes: number, totalBytes: number): void
}

function getBase(): string | null {
  const base = miraSDKService.getConnectionConfig()?.serverUrl
  return base ? base.replace(/\/+$/, '') : null
}

function fetchBlob(url: string, init: RequestInit, onProgress?: DownloadProgress): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(init.method || 'GET', url)
    if (init.headers) {
      for (const [k, v] of Object.entries(init.headers as Record<string, string>)) xhr.setRequestHeader(k, v)
    }
    xhr.responseType = 'blob'
    xhr.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total, e.loaded, e.total)
    }
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300
      ? resolve(xhr.response)
      : reject(new Error(`HTTP ${xhr.status}`))
    xhr.onerror = () => reject(new Error('network error'))
    xhr.send((init.body as XMLHttpRequestBodyInit | null | undefined) ?? null)
  })
}

/** web 端：blob + <a download>，保存到浏览器下载目录 */
function saveBlobViaLink(blob: Blob, filename: string): void {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 30000)
}

/**
 * 接收端下载分享文件。
 * 优先使用一次性分享票据（免 token，多文件为 ZIP）；票据缺失时回退：
 * - 多文件：POST /api/fs/download 由服务端 ZIP 打包
 * - 单文件：直接走消息中的 HTTP 直链
 *
 * 两套保存逻辑：
 * - Electron：优先用 saveDir（用户在 dialog 中选择的目录）逐文件落盘
 * - Web：浏览器默认下载目录（blob + a[download]）
 */
export async function downloadShareFiles(
  message: DeviceShareMessage,
  opts: { saveDir?: string; onProgress?: DownloadProgress } = {}
): Promise<string[]> {
  const files = message.files || []
  if (files.length === 0) return []

  const isElectron = appService.isElectron && !!opts.saveDir
  const saved: string[] = []

  // 一次性票据：单请求拿全部内容（单文件原文件 / 多文件 ZIP），无需本机 token
  if (message.ticketUrl) {
    const blob = await fetchBlob(message.ticketUrl, {}, opts.onProgress)
    const singleName = files.length === 1 ? sanitizeFilename(files[0].name) : null
    const filename = singleName || `mira-share-${Date.now()}.zip`
    if (isElectron) {
      const target = joinPath(opts.saveDir!, filename)
      await (window as any).electronAPI?.fs?.writeFile(target, new Uint8Array(await blob.arrayBuffer()))
      saved.push(target)
    } else {
      saveBlobViaLink(blob, filename)
      saved.push(filename)
    }
    return saved
  }

  const withValidUrls = await Promise.all(files.map(async (f) => ({
    ...f,
    // 直链带的是发送端 token，可能过期；用本机 token 重建
    url: buildFileDownloadUrl(message.libraryId, f.id) || f.url,
  })))

  if (withValidUrls.length > 1) {
    // 多文件 ZIP：复用服务端打包接口（ids 优先，服务端权威解析；paths 兜底）
    const base = getBase()
    const paths = withValidUrls.map(f => f.path).filter(Boolean) as string[]
    const ids = withValidUrls.map(f => f.id).filter(Boolean) as string[]
    const token = useAuthStore().token
    const blob = await fetchBlob(`${base}/api/fs/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ libraryId: message.libraryId, ids, paths }),
    }, opts.onProgress)

    if (isElectron) {
      const zipName = `mira-share-${Date.now()}.zip`
      await (window as any).electronAPI?.fs?.writeFile(joinPath(opts.saveDir!, zipName), new Uint8Array(await blob.arrayBuffer()))
      saved.push(joinPath(opts.saveDir!, zipName))
    } else {
      saveBlobViaLink(blob, `mira-share-${Date.now()}.zip`)
      saved.push(`mira-share-${Date.now()}.zip`)
    }
    return saved
  }

  // 单文件
  for (const file of withValidUrls as (DeviceShareFile & { url: string })[]) {
    const blob = await fetchBlob(file.url, {}, opts.onProgress)
    if (isElectron) {
      const target = joinPath(opts.saveDir!, sanitizeFilename(file.name))
      await (window as any).electronAPI?.fs?.writeFile(target, new Uint8Array(await blob.arrayBuffer()))
      saved.push(target)
    } else {
      saveBlobViaLink(blob, sanitizeFilename(file.name))
      saved.push(sanitizeFilename(file.name))
    }
  }
  return saved
}

/**
 * 接收入口：混合分享（库内文件 URL/票据 + 本地文件二进制流）并行接收，进度按总字节数合并。
 * 纯 URL 分享等价于直接调 downloadShareFiles。
 */
export async function receiveShareFiles(
  message: DeviceShareMessage,
  opts: { saveDir?: string; onProgress?: DownloadProgress } = {},
): Promise<string[]> {
  const all = message.files || []
  const binaryFiles = all.filter(f => f.binary)
  if (binaryFiles.length === 0) return downloadShareFiles(message, opts)

  const urlFiles = all.filter(f => !f.binary)
  const totalBytes = all.reduce((s, f) => s + (f.size || 0), 0) || 1
  const urlBytes = urlFiles.reduce((s, f) => s + (f.size || 0), 0)
  const binaryBytes = binaryFiles.reduce((s, f) => s + (f.size || 0), 0)
  let urlPercent = urlBytes === 0 ? 1 : 0
  let binaryPercent = 0
  const merged = () => opts.onProgress?.((urlBytes * urlPercent + binaryBytes * binaryPercent) / totalBytes, 0, totalBytes)

  const tasks: Promise<string[]>[] = []
  if (urlFiles.length > 0) {
    tasks.push(downloadShareFiles({ ...message, files: urlFiles }, { saveDir: opts.saveDir, onProgress: p => { urlPercent = p; merged() } }))
  }
  tasks.push(receiveBinaryShare({ ...message, files: binaryFiles }, {
    saveDir: opts.saveDir,
    onProgress: p => { binaryPercent = p; merged() },
  }))
  const results = await Promise.all(tasks)
  return results.flat()
}

function joinPath(dir: string, name: string): string {
  return `${dir.replace(/[\\/]+$/, '')}/${name}`
}

function sanitizeFilename(name: string): string {
  return (name || 'mira-file').replace(/[\\/:*?"<>|]/g, '_')
}
