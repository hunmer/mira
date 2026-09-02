<script setup lang="ts">
/**
 * 设备列表选择器:列出指定素材库下已连接的设备,单选一个clientId。
 * 参考自 mira-client DeviceShareDialog/DeviceListPicker,数据由宿主注入
 * (services.listDevices,如 SDK devices().getByLibrary),组件不访问数据源;
 * 组件存活期间按 pollInterval 轮询刷新,保证连接状态实时。
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import { MonitorSmartphone, WifiOff } from '@lucide/vue'
import { useI18n } from './i18n'
import type { DeviceListItem, DeviceListPickerServices } from './types'

const { t } = useI18n()

const props = withDefaults(defineProps<{
  /** 数据服务:宿主实现(如 client.devices().getByLibrary) */
  services: DeviceListPickerServices
  libraryId?: string
  /** 自身 clientId(从列表中排除,如 WebSocketClient.getClientId()) */
  selfClientId?: string
  /** 是否排除自身;为 false 时忽略 selfClientId */
  excludeSelf?: boolean
  /** 轮询间隔(毫秒),<=0 关闭轮询 */
  pollInterval?: number
}>(), {
  libraryId: 'default',
  selfClientId: '',
  excludeSelf: true,
  pollInterval: 10000,
})

const selected = defineModel<string | null>('selected', { default: null })

const emit = defineEmits<{ devices: [devices: DeviceListItem[]] }>()

const devices = ref<DeviceListItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function fetchDevices () {
  loading.value = true
  error.value = null
  try {
    const list = await props.services.listDevices(props.libraryId)
    const selfId = props.excludeSelf ? props.selfClientId : ''
    devices.value = list.filter(d =>
      d.status === 'connected' && (!selfId || d.clientId !== selfId))
    emit('devices', devices.value)
    if (selected.value && !devices.value.some(d => d.clientId === selected.value)) {
      selected.value = null
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    devices.value = []
  } finally {
    loading.value = false
  }
}

let timer: ReturnType<typeof setInterval> | undefined
function setupTimer () {
  clearInterval(timer)
  if (props.pollInterval > 0) timer = setInterval(fetchDevices, props.pollInterval)
}

onBeforeUnmount(() => clearInterval(timer))
watch(() => [props.libraryId, props.services] as const, fetchDevices, { immediate: true })
watch(() => props.pollInterval, setupTimer, { immediate: true })

/** userAgent → 平台描述 + IP(与 mira-client describeDevice 一致) */
function describeDevice (device: Pick<DeviceListItem, 'userAgent' | 'ipAddress'>) {
  const ua = device.userAgent || ''
  let platform = t('device.browser')
  if (/Electron/i.test(ua)) platform = t('device.desktop')
  else if (/Android/i.test(ua)) platform = 'Android'
  else if (/iPhone|iPad/i.test(ua)) platform = 'iOS'
  else if (/Windows/i.test(ua)) platform = 'Windows'
  else if (/Mac OS/i.test(ua)) platform = 'macOS'
  const ip = (device.ipAddress || '').replace(/^::ffff:/, '')
  return ip && ip !== 'Unknown' ? `${platform} · ${ip}` : platform
}

function lastActivityText (device: DeviceListItem) {
  const ts = new Date(device.lastActivity || '').getTime()
  if (Number.isNaN(ts)) return ''
  const elapsed = Math.max(0, Date.now() - ts)
  if (elapsed < 60000) return t('device.activeNow')
  return t('device.activeMinutesAgo', { n: Math.floor(elapsed / 60000) })
}

defineExpose({ refresh: fetchDevices })
</script>

<template>
  <div class="flex min-h-[200px] flex-col gap-2">
    <div v-if="loading && devices.length === 0" class="text-muted-foreground flex items-center justify-center py-10 text-sm">
      {{ t('common.loading') }}
    </div>

    <div v-else-if="error" class="text-destructive flex flex-col items-center px-4 py-10 text-center text-sm">
      <WifiOff class="mb-2 size-6" />
      {{ error }}
    </div>

    <div v-else-if="devices.length === 0" class="flex flex-col items-center px-4 py-10 text-center">
      <MonitorSmartphone class="text-muted-foreground mb-3 size-8" />
      <p class="text-muted-foreground mb-1 text-sm">{{ t('device.emptyTitle') }}</p>
      <p class="text-muted-foreground text-xs">{{ t('device.emptyHint') }}</p>
    </div>

    <button
      v-for="device in devices"
      :key="device.clientId"
      type="button"
      class="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors"
      :class="selected === device.clientId
        ? 'border-primary bg-primary/10'
        : 'hover:bg-muted border-border'"
      @click="selected = device.clientId"
    >
      <MonitorSmartphone class="text-primary size-5 shrink-0" />
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-medium">{{ describeDevice(device) }}</div>
        <div class="text-muted-foreground truncate font-mono text-xs" :title="device.clientId">
          {{ device.clientId }} · {{ lastActivityText(device) }}
        </div>
      </div>
      <span
        class="size-2 shrink-0 rounded-full"
        :class="device.status === 'connected' ? 'bg-green-500' : 'bg-gray-300'"
      ></span>
    </button>
  </div>
</template>
