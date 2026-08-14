<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import StatCard from '@/components/common/StatCard.vue'
import { systemApi, libraryApi, pluginApi, adminApi } from '@/api'
import { toast } from 'vue-sonner'
import {
  RiFolderLine, RiPuzzleLine, RiUserSettingsLine, RiDatabase2Line,
  RiRefreshLine, RiComputerLine, RiTimeLine, RiInformationLine,
} from '@remixicon/vue'

const { t } = useI18n()

const loading = ref(false)
const stats = ref({ libraries: 0, plugins: 0, admins: 0, dbSize: '0 B' })
const systemInfo = ref({ uptime: '-', version: '-', nodeVersion: '-' })
const recentActivities = ref<{ id: number; message: string; time: string }[]>([])

function formatSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

async function refreshData() {
  loading.value = true
  try {
    const [libsRes, pluginsRes, adminsRes, healthRes] = await Promise.allSettled([
      libraryApi.list(),
      pluginApi.list(),
      adminApi.list(),
      systemApi.health(),
    ])

    const unwrap = (r: PromiseFulfilledResult<any>) => r.value?.data?.data ?? r.value?.data ?? r.value
    const libs = libsRes.status === 'fulfilled' ? (Array.isArray(unwrap(libsRes)) ? unwrap(libsRes) : []) : []
    const plugins = pluginsRes.status === 'fulfilled' ? (Array.isArray(unwrap(pluginsRes)) ? unwrap(pluginsRes) : []) : []
    const admins = adminsRes.status === 'fulfilled' ? (Array.isArray(unwrap(adminsRes)) ? unwrap(adminsRes) : []) : []
    const health = healthRes.status === 'fulfilled' ? unwrap(healthRes) : null

    const totalSize = libs.reduce((s: number, l: any) => s + (l.size || 0), 0)
    stats.value = { libraries: libs.length, plugins: plugins.length, admins: admins.length, dbSize: formatSize(totalSize) }

    if (health) {
      systemInfo.value = {
        uptime: formatUptime(health.uptime || 0),
        version: health.version || '-',
        nodeVersion: health.nodeVersion || '-',
      }
    }
  } catch {
    toast.error(t('common.failed'))
  } finally {
    loading.value = false
  }
}

await refreshData()
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">{{ t('overview.title') }}</h1>
        <p class="text-muted-foreground">{{ t('overview.subtitle') }}</p>
      </div>
      <div class="flex gap-2">
        <Button :disabled="loading" @click="refreshData">
          <RiRefreshLine class="mr-2 size-4" :class="{ 'animate-spin': loading }" />
          {{ t('overview.refreshData') }}
        </Button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard :title="t('overview.totalLibraries')" :value="stats.libraries" :icon="RiFolderLine" />
      <StatCard :title="t('overview.totalPlugins')" :value="stats.plugins" :icon="RiPuzzleLine" />
      <StatCard :title="t('overview.totalAdmins')" :value="stats.admins" :icon="RiUserSettingsLine" />
      <StatCard :title="t('overview.dbSize')" :value="stats.dbSize" :icon="RiDatabase2Line" />
    </div>

    <!-- System Info & Activity -->
    <div class="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <RiComputerLine class="size-5" /> {{ t('overview.systemInfo') }}
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">{{ t('overview.serverStatus') }}</span>
            <Badge variant="secondary">{{ t('overview.running') }}</Badge>
          </div>
          <Separator />
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">{{ t('overview.uptime') }}</span>
            <span class="text-sm font-medium">{{ systemInfo.uptime }}</span>
          </div>
          <Separator />
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">{{ t('overview.version') }}</span>
            <span class="text-sm font-medium">{{ systemInfo.version }}</span>
          </div>
          <Separator />
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">{{ t('overview.nodeVersion') }}</span>
            <span class="text-sm font-medium">{{ systemInfo.nodeVersion }}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <RiTimeLine class="size-5" /> {{ t('overview.recentActivity') }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="recentActivities.length" class="space-y-3">
            <div v-for="a in recentActivities" :key="a.id" class="flex items-center gap-3 rounded-lg p-2">
              <RiInformationLine class="size-4 text-muted-foreground" />
              <div class="flex-1">
                <p class="text-sm">{{ a.message }}</p>
                <p class="text-xs text-muted-foreground">{{ a.time }}</p>
              </div>
            </div>
          </div>
          <div v-else class="py-8 text-center text-muted-foreground">
            {{ t('overview.noActivity') }}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
