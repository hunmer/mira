<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DeviceInfo } from '@/types/mira'
import { deviceApi } from '@/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'vue-sonner'
import { RiLoader4Line, RiComputerLine, RiMacbookLine } from '@remixicon/vue'

const { t } = useI18n()
const devices = ref<DeviceInfo[]>([])
const loading = ref(false)

async function loadDevices() {
  loading.value = true
  try {
    const res = await deviceApi.list()
    const raw = res.data?.data ?? res.data
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      devices.value = Object.entries(raw).flatMap(([libraryId, list]) =>
        (list as any[]).map((d) => ({
          id: d.clientId,
          name: d.clientId,
          type: d.userAgent?.includes('Electron') ? 'Electron' : 'Web',
          status: d.status,
          lastSeen: d.lastActivity,
          libraryId,
          ...d,
        })),
      )
    } else {
      devices.value = Array.isArray(raw) ? raw : []
    }
  } catch {
    toast.error(t('common.failed'))
  } finally {
    loading.value = false
  }
}

async function disconnectDevice(id: string) {
  try {
    await deviceApi.disconnect(id)
    toast.success(t('common.success'))
    await loadDevices()
  } catch {
    toast.error(t('common.failed'))
  }
}

onMounted(loadDevices)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">{{ t('device.title') }}</h1>
      <Button variant="outline" @click="loadDevices">
        <RiLoader4Line class="mr-2 size-4" :class="{ 'animate-spin': loading }" />
        {{ t('common.refresh') }}
      </Button>
    </div>

    <div v-if="loading" class="py-12 text-center text-muted-foreground">
      <RiLoader4Line class="mx-auto mb-2 size-6 animate-spin" />
      {{ t('common.loading') }}
    </div>

    <div v-else-if="!devices.length" class="py-12 text-center text-muted-foreground">
      {{ t('common.noData') }}
    </div>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card v-for="device in devices" :key="device.id" class="overflow-hidden">
        <CardContent class="p-5">
          <div class="mb-3 flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="flex size-10 items-center justify-center rounded-lg bg-muted">
                <RiMacbookLine v-if="device.type === 'Electron'" class="size-5 text-foreground" />
                <RiComputerLine v-else class="size-5 text-foreground" />
              </div>
              <div>
                <div class="font-medium leading-tight">{{ device.name }}</div>
                <div class="text-xs text-muted-foreground">{{ device.type }}</div>
              </div>
            </div>
            <Badge :variant="device.status === 'connected' ? 'default' : 'secondary'">
              {{ device.status === 'connected' ? t('device.connected') : t('device.disconnected') }}
            </Badge>
          </div>

          <div v-if="device.libraryId" class="mb-3 text-xs text-muted-foreground">
            Library: {{ device.libraryId }}
          </div>

          <div v-if="device.lastSeen" class="mb-3 text-xs text-muted-foreground">
            {{ t('device.lastSeen') }}: {{ device.lastSeen }}
          </div>

          <div class="flex justify-end border-t pt-3">
            <Button
              v-if="device.status === 'connected'"
              variant="ghost"
              size="sm"
              @click="disconnectDevice(device.id)"
            >
              {{ t('device.disconnect') }}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
