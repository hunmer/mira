<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Plugin } from '@/types/mira'
import { pluginApi } from '@/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'vue-sonner'
import {
  RiSearchLine, RiMoreLine, RiSettings3Line, RiToggleLine,
  RiStopCircleLine, RiStore2Line,
} from '@remixicon/vue'

const { t } = useI18n()
const plugins = ref<Plugin[]>([])
const loading = ref(false)
const searchQuery = ref('')
const configDialog = ref(false)
const configPlugin = ref<Plugin | null>(null)
const configData = ref<Record<string, any>>({})

async function loadPlugins() {
  loading.value = true
  try {
    const res = await pluginApi.list()
    plugins.value = Array.isArray(res.data) ? res.data : []
  } catch {
    toast.error(t('common.failed'))
  } finally {
    loading.value = false
  }
}

async function toggleStatus(plugin: Plugin) {
  try {
    const newStatus = plugin.status === 'active' ? 'inactive' : 'active'
    await pluginApi.updateStatus(plugin.name, newStatus)
    toast.success(t('common.success'))
    await loadPlugins()
  } catch {
    toast.error(t('common.failed'))
  }
}

function openConfig(plugin: Plugin) {
  configPlugin.value = plugin
  configData.value = {}
  configDialog.value = true
}

async function saveConfig() {
  if (!configPlugin.value) return
  try {
    await pluginApi.configure(configPlugin.value.name, configData.value)
    toast.success(t('common.success'))
    configDialog.value = false
  } catch {
    toast.error(t('common.failed'))
  }
}

async function uninstallPlugin(name: string) {
  if (!confirm(t('common.confirmDelete'))) return
  try {
    await pluginApi.uninstall(name)
    toast.success(t('common.success'))
    await loadPlugins()
  } catch {
    toast.error(t('common.failed'))
  }
}

onMounted(loadPlugins)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">{{ t('plugin.title') }}</h1>
      <Button>
        <RiStore2Line class="mr-2 size-4" /> {{ t('plugin.pluginStore') }}
      </Button>
    </div>

    <div class="relative max-w-sm">
      <RiSearchLine class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input v-model="searchQuery" :placeholder="t('common.search')" class="pl-9" />
    </div>

    <div v-if="loading" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card v-for="i in 6" :key="i"><CardContent class="h-40 animate-pulse" /></Card>
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card v-for="plugin in plugins.filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))" :key="plugin.name">
        <CardHeader class="pb-2">
          <div class="flex items-start justify-between">
            <div>
              <CardTitle class="text-base">{{ plugin.name }}</CardTitle>
              <p class="text-xs text-muted-foreground">{{ t('plugin.version') }}: {{ plugin.version }}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon"><RiMoreLine class="size-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem @click="toggleStatus(plugin)">
                  <RiToggleLine class="mr-2 size-4" />
                  {{ plugin.status === 'active' ? t('plugin.disable') : t('plugin.enable') }}
                </DropdownMenuItem>
                <DropdownMenuItem v-if="plugin.configurable" @click="openConfig(plugin)">
                  <RiSettings3Line class="mr-2 size-4" /> {{ t('plugin.configure') }}
                </DropdownMenuItem>
                <DropdownMenuItem class="text-destructive" @click="uninstallPlugin(plugin.name)">
                  <RiStopCircleLine class="mr-2 size-4" /> {{ t('plugin.uninstall') }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <p class="mb-3 line-clamp-2 text-sm text-muted-foreground">{{ plugin.description || '-' }}</p>
          <div class="flex items-center gap-2">
            <Badge :variant="plugin.status === 'active' ? 'default' : 'secondary'">
              {{ plugin.status === 'active' ? t('plugin.enabled') : t('plugin.disabled') }}
            </Badge>
            <span class="text-xs text-muted-foreground">{{ t('plugin.author') }}: {{ plugin.author }}</span>
          </div>
        </CardContent>
      </Card>
    </div>

    <div v-if="!loading && !plugins.length" class="py-12 text-center text-muted-foreground">
      {{ t('common.noData') }}
    </div>

    <!-- Config Dialog -->
    <Dialog :open="configDialog" @update:open="configDialog = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ t('plugin.configure') }} - {{ configPlugin?.name }}</DialogTitle>
        </DialogHeader>
        <div class="py-4 text-center text-sm text-muted-foreground">
          {{ t('common.noData') }}
        </div>
        <DialogFooter>
          <Button variant="outline" @click="configDialog = false">{{ t('common.cancel') }}</Button>
          <Button @click="saveConfig">{{ t('common.save') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
