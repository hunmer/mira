<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import type { Device } from 'mira-app-core/shared/sdk'
import { miraSDKService } from '@renderer/services/MiraSDKService'
import { useLibraryStore } from '@renderer/stores/library'
import { describeDevice, getSelfClientId } from '@renderer/composables/useDeviceShare'

/**
 * 当前素材库已连接设备列表选择器。
 * 通过 SDK devices().getByLibrary(/api/devices/library/:id) 获取，自动排除自身。
 */
const props = withDefaults(defineProps<{
  libraryId?: string
  excludeSelf?: boolean
}>(), {
  libraryId: undefined,
  excludeSelf: true,
})

const selected = defineModel<string | null>('selected', { default: null })

const emit = defineEmits<{ devices: [devices: Device[]] }>()

const libraryStore = useLibraryStore()
const devices = ref<Device[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const fetchDevices = async () => {
  const client = (miraSDKService as any).client
  if (!client) return
  const libraryId = props.libraryId || libraryStore.currentLibrary?.id || 'default'
  loading.value = true
  error.value = null
  try {
    const list: Device[] = await client.devices().getByLibrary(libraryId)
    const selfId = props.excludeSelf ? getSelfClientId() : undefined
    devices.value = list.filter(d =>
      d.status === 'connected' && (!selfId || d.clientId !== selfId)
    )
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

// 组件存活期间 10s 轮询，保证连接状态实时
const timer = setInterval(fetchDevices, 10000)
onBeforeUnmount(() => clearInterval(timer))
watch(() => props.libraryId, fetchDevices, { immediate: true })

const lastActivityText = (device: Device) => {
  const ts = new Date(device.lastActivity).getTime()
  if (Number.isNaN(ts)) return ''
  const elapsed = Math.max(0, Date.now() - ts)
  if (elapsed < 60000) return '刚刚活跃'
  return `${Math.floor(elapsed / 60000)} 分钟前活跃`
}

defineExpose({ refresh: fetchDevices })
</script>

<template>
  <div class="flex flex-col gap-2 min-h-[200px]">
    <div v-if="loading && devices.length === 0" class="flex items-center justify-center py-10 text-muted-foreground text-sm">
      {{ $t('business.deviceShare.loading') }}
    </div>

    <div v-else-if="error" class="flex flex-col items-center py-10 text-destructive text-sm text-center px-4">
      <span class="material-icons mb-2 text-2xl">wifi_off</span>
      {{ error }}
    </div>

    <div v-else-if="devices.length === 0" class="flex flex-col items-center py-10 text-center px-4">
      <span class="material-icons text-muted-foreground text-4xl mb-3">devices_other</span>
      <p class="text-muted-foreground text-sm mb-1">{{ $t('business.deviceShare.emptyTitle') }}</p>
      <p class="text-xs text-muted-foreground">{{ $t('business.deviceShare.emptyDesc') }}</p>
    </div>

    <button
      v-for="device in devices"
      :key="device.clientId"
      type="button"
      class="flex items-center gap-3 p-3 rounded-lg border text-left transition-colors"
      :class="selected === device.clientId
        ? 'border-primary bg-primary/10'
        : 'border-border hover:bg-muted'"
      @click="selected = device.clientId"
    >
      <span class="material-icons text-primary">devices</span>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium truncate">{{ describeDevice(device) }}</div>
        <div class="text-xs text-muted-foreground truncate font-mono" :title="device.clientId">
          {{ device.clientId }} · {{ lastActivityText(device) }}
        </div>
      </div>
      <span
        class="w-2 h-2 rounded-full flex-none"
        :class="device.status === 'connected' ? 'bg-green-500' : 'bg-gray-300'"
      ></span>
    </button>
  </div>
</template>
