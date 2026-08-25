import { toast } from 'vue-sonner'
import i18n from '@renderer/i18n'
import { appService } from '@renderer/services'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { webSocketService } from '@renderer/services/WebSocketService'
import { useLibraryStore } from '@renderer/stores/library'
import type { DeviceShareMessage } from '@renderer/composables/useDeviceShare'
import { deviceTransfers } from './useDeviceTransfers'

/**
 * 设备间二进制端到端文件传输（不经 server 磁盘/URL 中转）。
 *
 * 通道与协议：
 * - 控制消息走既有 devices().sendMessage → admin_message：
 *   发送端发 mira-share(binary=true, files 只带 name/size)，接收端确认后回
 *   mira-share-accept{shareId}，进度/终态沿用 mira-share-ack。
 * - 数据帧走 WS 二进制帧（server 只按帧头转发不落盘）：
 *   client→server: [0x4D][u16 targetLen][target][u16 shareIdLen][shareId][u8 flags][u32 seq][payload]
 *   server→接收端: 剥掉 target 段原样转发。flags bit0=eos（流结束）。
 *   多文件按 files 顺序串行拼成一个字节流，接收端按 size 切分落盘。
 */

const CHUNK_SIZE = 256 * 1024
/** 发送端积压上限：超过后暂停推流等缓冲排空（浏览器 WS 无 drain 事件，轮询 bufferedAmount） */
const BACKLOG_LIMIT = 8 * 1024 * 1024
/** 发出 mira-share 后等待接收端确认(accept)的超时 */
const ACCEPT_TIMEOUT_MS = 60_000
/** 接收端两次数据帧之间的最大停顿（超时判失败） */
const RECV_STALL_MS = 30_000
/** 会话兜底清理（ack 丢失时不至于永久泄漏内存） */
const SESSION_GC_MS = 10 * 60_000

const FLAG_EOS = 0x01

interface BinarySendSession {
  shareId: string
  targetClientId: string
  files: File[]
  accepted: boolean
  canceled: boolean
  acceptTimer?: ReturnType<typeof setTimeout>
  gcTimer?: ReturnType<typeof setTimeout>
}

interface BinaryRecvSession {
  shareId: string
  files: Array<{ name: string; size: number }>
  total: number
  received: number
  chunks: Uint8Array[]
  lastActivity: number
  saveDir?: string
  resolve: (saved: string[]) => void
  reject: (err: Error) => void
  onProgress?: (percent: number) => void
  stallTimer?: ReturnType<typeof setInterval>
  gcTimer?: ReturnType<typeof setTimeout>
}

const sendSessions = new Map<string, BinarySendSession>()
const recvSessions = new Map<string, BinaryRecvSession>()

/* ---------------- 帧编解码 ---------------- */

function encodeUtf8(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

/** 构建带目标路由头的完整二进制帧（发送端 → server） */
export function buildBinaryFrame(target: string, shareId: string, seq: number, flags: number, payload: Uint8Array): Uint8Array {
  const targetBytes = encodeUtf8(target)
  const idBytes = encodeUtf8(shareId)
  const headLen = 1 + 2 + targetBytes.length + 2 + idBytes.length + 1 + 4 + 4
  const frame = new Uint8Array(headLen + payload.length)
  let o = 0
  frame[o++] = 0x4d
  frame[o++] = (targetBytes.length >> 8) & 0xff
  frame[o++] = targetBytes.length & 0xff
  frame.set(targetBytes, o); o += targetBytes.length
  frame[o++] = (idBytes.length >> 8) & 0xff
  frame[o++] = idBytes.length & 0xff
  frame.set(idBytes, o); o += idBytes.length
  frame[o++] = flags
  frame[o++] = (seq >>> 24) & 0xff
  frame[o++] = (seq >>> 16) & 0xff
  frame[o++] = (seq >>> 8) & 0xff
  frame[o++] = seq & 0xff
  const pLen = payload.length
  frame[o++] = (pLen >>> 24) & 0xff
  frame[o++] = (pLen >>> 16) & 0xff
  frame[o++] = (pLen >>> 8) & 0xff
  frame[o++] = pLen & 0xff
  frame.set(payload, o)
  return frame
}

/** 解析转发后的帧（无路由头）：{ shareId, flags, seq, payload }，非法返回 null */
export function parseBinaryFrame(data: Uint8Array): { shareId: string; flags: number; seq: number; payload: Uint8Array } | null {
  try {
    if (data.length < 9) return null
    const idLen = (data[0] << 8) | data[1]
    if (idLen === 0 || data.length < 2 + idLen + 9) return null
    const shareId = new TextDecoder().decode(data.subarray(2, 2 + idLen))
    let o = 2 + idLen
    const flags = data[o++]
    const seq = ((data[o] << 24) | (data[o + 1] << 16) | (data[o + 2] << 8) | data[o + 3]) >>> 0; o += 4
    const pLen = ((data[o] << 24) | (data[o + 1] << 16) | (data[o + 2] << 8) | data[o + 3]) >>> 0; o += 4
    const payload = data.subarray(o, o + pLen)
    return { shareId, flags, seq, payload }
  } catch {
    return null
  }
}

/* ---------------- 控制消息 ---------------- */

/** 接收端确认接收二进制分享：发送端收到后开始推流 */
export function sendBinaryAccept(toClientId: string, shareId: string): void {
  const client = (miraSDKService as any).client
  if (!client) return
  const libraryId = useLibraryStore().currentLibrary?.id || 'default'
  void client.devices().sendMessage(toClientId, libraryId, {
    type: 'mira-share-accept',
    shareId,
  }).catch(() => {})
}

/** WebSocketService 收到 mira-share-accept 后回调：启动对应发送会话推流 */
export function onBinaryShareAccept(message: { shareId?: string }): void {
  ensureBinaryShareInstalled()
  if (!message?.shareId) return
  const session = sendSessions.get(message.shareId)
  if (!session || session.accepted || session.canceled) return
  clearTimeout(session.acceptTimer)
  session.accepted = true
  void pumpSendSession(session)
}

/** 终止发送会话（对端 declined/failed ack 或本地清理），进行中的推流在下一块检测到 canceled 停止 */
export function cancelBinarySend(shareId: string): void {
  ensureBinaryShareInstalled()
  const session = sendSessions.get(shareId)
  if (!session) return
  session.canceled = true
  clearTimeout(session.acceptTimer)
  clearTimeout(session.gcTimer)
  sendSessions.delete(shareId)
}

/* ---------------- 发送端 ---------------- */

/** 终态回执缺失时本地标记传输记录失败（对端 ack 正常时不会走到这里） */
function markTransferFailed(shareId: string): void {
  const item = deviceTransfers.value.find(t => t.id === shareId)
  if (item && (item.state === 'sent' || item.state === 'receiving')) {
    item.state = 'failed'
    item.updatedAt = Date.now()
  }
}

/**
 * 登记二进制发送会话（mira-share 消息已发出）：等接收端 accept 后把 files 串行推流。
 */
export function startBinarySend(shareId: string, targetClientId: string, files: File[]): void {
  ensureBinaryShareInstalled()
  if (!shareId || !targetClientId || files.length === 0) return
  const session: BinarySendSession = { shareId, targetClientId, files, accepted: false, canceled: false }
  sendSessions.set(shareId, session)
  session.acceptTimer = setTimeout(() => {
    if (sendSessions.get(shareId) !== session || session.accepted) return
    sendSessions.delete(shareId)
    markTransferFailed(shareId)
    toast.error(i18n.global.t('business.deviceShare.binaryAcceptTimeout'))
  }, ACCEPT_TIMEOUT_MS)
  session.gcTimer = setTimeout(() => cancelBinarySend(shareId), SESSION_GC_MS)
}

async function pumpSendSession(session: BinarySendSession): Promise<void> {
  const t = i18n.global.t
  try {
    let seq = 0
    for (const file of session.files) {
      for (let pos = 0; pos < file.size; pos += CHUNK_SIZE) {
        if (session.canceled || sendSessions.get(session.shareId) !== session) return
        const buf = new Uint8Array(await file.slice(pos, pos + CHUNK_SIZE).arrayBuffer())
        if (!webSocketService.sendBinary(buildBinaryFrame(session.targetClientId, session.shareId, seq++, 0, buf))) {
          throw new Error(t('business.deviceShare.binaryDisconnected'))
        }
        await drainBacklog(() => session.canceled)
      }
    }
    if (session.canceled || sendSessions.get(session.shareId) !== session) return
    // 流结束帧：接收端以此与总字节数双保险判断完成
    webSocketService.sendBinary(buildBinaryFrame(session.targetClientId, session.shareId, seq, FLAG_EOS, new Uint8Array(0)))
  } catch (e) {
    console.error('[device-share] binary send failed', e)
    markTransferFailed(session.shareId)
    toast.error(t('business.deviceShare.sendFailed'), {
      description: e instanceof Error ? e.message : String(e),
    })
    cancelBinarySend(session.shareId)
  }
}

/** 发送流控：待发送缓冲超限时等待排空（每 30ms 轮询），isCanceled 为真时提前退出 */
async function drainBacklog(isCanceled: () => boolean): Promise<void> {
  while (webSocketService.getBufferedAmount() > BACKLOG_LIMIT) {
    if (isCanceled()) throw new Error('canceled')
    await new Promise(r => setTimeout(r, 30))
  }
}

/* ---------------- 接收端 ---------------- */

/**
 * 接收端接收二进制分享：回 accept 后被动收流，收满按 files[].size 切分落盘。
 * 与 downloadShareFiles 相同的保存策略（Electron saveDir / Web 浏览器下载目录）。
 */
export function receiveBinaryShare(
  message: DeviceShareMessage,
  opts: { saveDir?: string; onProgress?: (percent: number) => void } = {},
): Promise<string[]> {
  ensureBinaryShareInstalled()
  const files = (message.files || []).map(f => ({ name: f.name, size: f.size || 0 }))
  const total = files.reduce((s, f) => s + f.size, 0)
  return new Promise((resolve, reject) => {
    const session: BinaryRecvSession = {
      shareId: message.id || '',
      files,
      total,
      received: 0,
      chunks: [],
      lastActivity: Date.now(),
      saveDir: opts.saveDir,
      resolve,
      reject,
      onProgress: opts.onProgress,
    }
    if (!session.shareId || total === 0) {
      reject(new Error('empty binary share'))
      return
    }
    recvSessions.set(session.shareId, session)
    session.stallTimer = setInterval(() => {
      if (Date.now() - session.lastActivity > RECV_STALL_MS) {
        finishRecv(session, new Error(i18n.global.t('business.deviceShare.binaryStalled')))
      }
    }, 3000)
    session.gcTimer = setTimeout(() => finishRecv(session, new Error('timeout')), SESSION_GC_MS)
    // 通知发送端可以开始推流
    sendBinaryAccept(message.from, session.shareId)
  })
}

/** WebSocketService 二进制帧回调：按 shareId 分发给接收会话 */
function handleIncomingFrame(data: ArrayBuffer): void {
  const frame = parseBinaryFrame(new Uint8Array(data))
  if (!frame) return
  const session = recvSessions.get(frame.shareId)
  if (!session) return
  session.lastActivity = Date.now()
  if (frame.flags & FLAG_EOS) {
    finishRecv(session, null)
    return
  }
  if (frame.payload.length > 0) {
    session.chunks.push(frame.payload)
    session.received += frame.payload.length
    if (session.total > 0) session.onProgress?.(Math.min(1, session.received / session.total))
  }
}

function finishRecv(session: BinaryRecvSession, err: Error | null): void {
  if (!recvSessions.has(session.shareId)) return
  recvSessions.delete(session.shareId)
  clearInterval(session.stallTimer)
  clearTimeout(session.gcTimer)
  if (err) {
    session.reject(err)
    return
  }
  saveExtractedFiles(session).then(session.resolve, (e: unknown) =>
    session.reject(e instanceof Error ? e : new Error(String(e))))
}

/** 把收到的字节流按 files[].size 顺序切分并保存（Electron saveDir / Web 浏览器下载） */
async function saveExtractedFiles(session: BinaryRecvSession): Promise<string[]> {
  const isElectron = appService.isElectron && !!session.saveDir
  const saved: string[] = []
  let offset = 0
  for (const file of session.files) {
    const size = file.size || 0
    const bytes = sliceChunks(session.chunks, offset, size)
    offset += size
    const name = sanitizeFilename(file.name || 'mira-file')
    if (isElectron) {
      const target = `${session.saveDir!.replace(/[\\/]+$/, '')}/${name}`
      const res = await (window as any).electronAPI?.fs?.writeFile(target, bytes)
      if (res && res.success === false) throw new Error(res.message || 'write file failed')
      saved.push(target)
    } else {
      saveBlobViaLink(new Blob([bytes]), name)
      saved.push(name)
    }
  }
  return saved
}

/** 从 chunks 流中提取 [start, start+length) 的字节（跨 chunk 拼装单个文件，避免整体 concat） */
function sliceChunks(chunks: Uint8Array[], start: number, length: number): Uint8Array {
  const out = new Uint8Array(length)
  let written = 0
  let cursor = 0
  for (const chunk of chunks) {
    const chunkEnd = cursor + chunk.length
    if (chunkEnd <= start) {
      cursor = chunkEnd
      continue
    }
    const from = Math.max(start, cursor)
    const to = Math.min(start + length, chunkEnd)
    if (to > from) {
      out.set(chunk.subarray(from - cursor, to - cursor), written)
      written += to - from
      if (written >= length) break
    }
    cursor = chunkEnd
  }
  return out
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

function sanitizeFilename(name: string): string {
  return (name || 'mira-file').replace(/[\\/:*?"<>|]/g, '_')
}

/**
 * 懒注册 WS 二进制帧处理器：不能在模块顶层直接注册——WebSocketService 反向 import
 * 本模块（admin_message 分发），顶层执行时 webSocketService 单例尚未创建（循环初始化）。
 */
let binaryShareInstalled = false
function ensureBinaryShareInstalled(): void {
  if (binaryShareInstalled) return
  binaryShareInstalled = true
  webSocketService.setBinaryHandler(handleIncomingFrame)
}
