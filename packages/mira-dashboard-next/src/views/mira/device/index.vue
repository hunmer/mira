<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DeviceInfo } from '@/types/mira'
import { deviceApi } from '@/api'
import { useBroadcast } from '@/composables/useBroadcast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'vue-sonner'
import { RiLoader4Line, RiComputerLine, RiMacbookLine, RiNotificationLine } from '@remixicon/vue'

const { t } = useI18n()
const devices = ref<DeviceInfo[]>([])
const loading = ref(false)
const selectedIds = ref<Set<string>>(new Set())
const { dialogOpen, broadcastTitle, broadcastMsg, sending, openDialog: openBroadcastDialog, sendBroadcast } = useBroadcast()

const selectedCount = computed(() => selectedIds.value.size)
const allSelected = computed(() => devices.value.length > 0 && selectedIds.value.size === devices.value.length)

function toggleSelect(id: string) {
  const s = new Set(selectedIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedIds.value = s
}

function toggleAll() {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(devices.value.map(d => d.id))
  }
}

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
    selectedIds.value = new Set()
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
      <div class="flex items-center gap-2">
        <Button variant="outline" @click="openBroadcastDialog">
          <RiNotificationLine class="mr-2 size-4" />
          {{ t('device.broadcast') }}
        </Button>
        <Button variant="outline" @click="loadDevices">
          <RiLoader4Line class="mr-2 size-4" :class="{ 'animate-spin': loading }" />
          {{ t('common.refresh') }}
        </Button>
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-muted-foreground">
      <RiLoader4Line class="mx-auto mb-2 size-6 animate-spin" />
      {{ t('common.loading') }}
    </div>

    <div v-else-if="!devices.length" class="py-12 text-center text-muted-foreground">
      {{ t('common.noData') }}
    </div>

    <template v-else>
      <div v-if="selectedCount > 0" class="flex items-center gap-2 text-sm text-muted-foreground">
        {{ t('device.selectedDevices', { count: selectedCount }) }}
      </div>
      <label v-else class="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          :checked="allSelected"
          class="size-4 rounded border-gray-300 accent-primary"
          @change.prevent="toggleAll()"
        />
        {{ t('device.allDevices') }}
      </label>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          v-for="device in devices"
          :key="device.id"
          class="relative overflow-hidden transition-colors"
          :class="selectedIds.has(device.id) ? 'ring-2 ring-primary' : ''"
        >
          <!-- 右上角 checkbox -->
          <label class="absolute right-3 top-3 z-10 flex cursor-pointer items-center">
            <input
              type="checkbox"
              :checked="selectedIds.has(device.id)"
              class="size-4 rounded border-gray-300 text-primary accent-primary"
              @change.prevent="toggleSelect(device.id)"
            />
          </label>

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
    </template>

    <!-- 广播对话框 -->
    <Dialog v-model:open="dialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('device.broadcastTitle') }}</DialogTitle>
          <DialogDescription>
            <span v-if="selectedCount > 0">
              {{ t('device.broadcastTo') }}: {{ t('device.selectedDevices', { count: selectedCount }) }}
            </span>
            <span v-else>{{ t('device.broadcastTo') }}: {{ t('device.allDevices') }}</span>
          </DialogDescription>
        </DialogHeader>

        <Input v-model="broadcastTitle" :placeholder="t('device.broadcastTitlePlaceholder')" />
        <Textarea
          v-model="broadcastMsg"
          :placeholder="t('device.broadcastPlaceholder')"
          rows="4"
        />

        <DialogFooter>
          <Button variant="outline" @click="dialogOpen = false">
            {{ t('common.cancel') }}
          </Button>
          <Button :disabled="sending || !broadcastMsg.trim()" @click="sendBroadcast(allSelected || selectedIds.size === 0 ? undefined : [...selectedIds])">
            <RiLoader4Line v-if="sending" class="mr-2 size-4 animate-spin" />
            {{ t('device.send') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
