import { ref } from 'vue'
import type { DeviceShareAck, DeviceShareMessage } from '@renderer/composables/useDeviceShare'

/**
 * 设备间传输列表：记录每次「发送到设备」的分享及其接收进度。
 * 状态存模块级（应用生命周期内保留），传输对话框关闭重开不丢；
 * 进度由接收端（pair.html / 另一台 mira-client）经 mira-share-ack 回传更新。
 */
export interface DeviceTransferItem {
  /** 关联 DeviceShareMessage.id（ack 匹配用；重发后更新为新 id） */
  id: string
  /** 目标设备 clientId（重新发送用） */
  targetClientId: string
  /** 目标设备描述（发送时的 describeDevice 结果） */
  targetLabel: string
  files: DeviceShareMessage['files']
  /** sent=已送达待接收 receiving=对方下载中 done=完成 failed=失败 declined=对方拒绝 canceled=发送端主动取消 */
  state: 'sent' | 'receiving' | 'done' | 'failed' | 'declined' | 'canceled'
  /** 对端下载进度 0-1 */
  percent: number
  /** 对端 URL/票据部分（素材文件）接收进度 0-1：发送列表按文件大小映射单文件状态 */
  urlPercent?: number
  createdAt: number
  updatedAt: number
}

// 模块级全局状态：发送/传输合并对话框（DeviceShareDialog 内 Tabs）关闭重开可恢复
export const deviceTransfers = ref<DeviceTransferItem[]>([])
/** 合并对话框当前页签：send=发送到设备 transfers=设备传输 */
export const shareDialogTab = ref<'send' | 'transfers'>('send')

/** 进行中的传输数（页签/入口 badge 用） */
export function activeTransferCount(): number {
  return deviceTransfers.value.filter(t => t.state === 'sent' || t.state === 'receiving').length
}

/** 发送成功后登记一条传输记录（最新的排在最前） */
export function addDeviceTransfer(message: DeviceShareMessage, targetClientId: string, targetLabel: string): void {
  deviceTransfers.value.unshift({
    id: message.id || `share_${Date.now()}`,
    targetClientId,
    targetLabel: targetLabel || targetClientId,
    files: message.files,
    state: 'sent',
    percent: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  if (deviceTransfers.value.length > 50) deviceTransfers.value.length = 50
}

/** 重新发送成功后重置记录（新 shareId / 待接收态） */
export function resetTransferForResend(item: DeviceTransferItem, message: DeviceShareMessage): void {
  item.id = message.id || item.id
  item.files = message.files
  item.state = 'sent'
  item.percent = 0
  item.updatedAt = Date.now()
}

/** 应用接收端回传的进度/状态（WebSocketService 收到 mira-share-ack 后调用） */
export function applyShareAck(ack: DeviceShareAck): void {
  const item = deviceTransfers.value.find(t => t.id === ack.shareId)
  if (!item) return
  // 已被发送端本地取消：忽略迟到的对端回执（取消后对端 binary 会话失败会回 failed ack）
  if (item.state === 'canceled') return
  if (!['receiving', 'done', 'failed', 'declined'].includes(ack.state)) return
  item.state = ack.state
  item.percent = ack.state === 'done' ? 1 : (ack.percent ?? item.percent)
  if (ack.urlPercent !== undefined) item.urlPercent = ack.urlPercent
  if (ack.state === 'done') item.urlPercent = 1
  item.updatedAt = Date.now()
}

/** 清除已完成/失败的记录（进行中的保留） */
export function clearFinishedTransfers(): void {
  deviceTransfers.value = deviceTransfers.value.filter(t => t.state === 'sent' || t.state === 'receiving')
}
