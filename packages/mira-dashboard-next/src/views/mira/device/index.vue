<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DeviceInfo } from '@/types/mira'
import { deviceApi } from '@/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'vue-sonner'
import { RiLoader4Line } from '@remixicon/vue'

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

    <div class="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('device.deviceName') }}</TableHead>
            <TableHead>{{ t('device.deviceType') }}</TableHead>
            <TableHead>{{ t('common.status') }}</TableHead>
            <TableHead>{{ t('device.lastSeen') }}</TableHead>
            <TableHead>{{ t('common.actions') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="loading">
            <TableCell :colspan="5" class="py-8 text-center text-muted-foreground">{{ t('common.loading') }}</TableCell>
          </TableRow>
          <TableRow v-else-if="!devices.length">
            <TableCell :colspan="5" class="py-8 text-center text-muted-foreground">{{ t('common.noData') }}</TableCell>
          </TableRow>
          <TableRow v-for="device in devices" :key="device.id">
            <TableCell class="font-medium">{{ device.name }}</TableCell>
            <TableCell class="text-muted-foreground">{{ device.type }}</TableCell>
            <TableCell>
              <Badge :variant="device.status === 'connected' ? 'default' : 'secondary'">
                {{ device.status === 'connected' ? t('device.connected') : t('device.disconnected') }}
              </Badge>
            </TableCell>
            <TableCell class="text-muted-foreground">{{ device.lastSeen }}</TableCell>
            <TableCell>
              <Button v-if="device.status === 'connected'" variant="ghost" size="sm" @click="disconnectDevice(device.id)">
                {{ t('device.disconnect') }}
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
