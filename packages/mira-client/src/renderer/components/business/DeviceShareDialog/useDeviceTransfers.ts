import { ref } from 'vue'
import type { DeviceShareAck, DeviceShareMessage } from '@renderer/composables/useDeviceShare'

/**
 * 设备间传输列表：记录每次「发送到设备」的分享及其接收进度。
 * 状态存模块级（应用生命周期内保留），传输对话框关闭重开不丢；
 * 进度由接收端（pair.html / 另一台 mira-client）经 mira-share-ack 回传更新。
 */
export interface DeviceTransferItem {
  /** 关联 DeviceShareMessage.id（ack 匹配用） */
  id: string
  /** 目标设备描述（发送时的 describeDevice 结果） */
  targetLabel: string
  files: DeviceShareMessage['files']
  /** sent=已送达待接收 receiving=对方下载中 done=完成 failed=失败 declined=对方拒绝 */
  state: 'sent' | 'receiving' | 'done' | 'failed' | 'declined'
  /** 对端下载进度 0-1 */
  percent: number
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
export function addDeviceTransfer(message: DeviceShareMessage, targetLabel: string): void {
  deviceTransfers.value.unshift({
    id: message.id || `share_${Date.now()}`,
    targetLabel,
    files: message.files,
    state: 'sent',
    percent: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  if (deviceTransfers.value.length > 50) deviceTransfers.value.length = 50
}

/** 应用接收端回传的进度/状态（WebSocketService 收到 mira-share-ack 后调用） */
export function applyShareAck(ack: DeviceShareAck): void {
  const item = deviceTransfers.value.find(t => t.id === ack.shareId)
  if (!item) return
  if (!['receiving', 'done', 'failed', 'declined'].includes(ack.state)) return
  item.state = ack.state
  item.percent = ack.state === 'done' ? 1 : (ack.percent ?? item.percent)
  item.updatedAt = Date.now()
}

/** 清除已完成/失败的记录（进行中的保留） */
export function clearFinishedTransfers(): void {
  deviceTransfers.value = deviceTransfers.value.filter(t => t.state === 'sent' || t.state === 'receiving')
}
