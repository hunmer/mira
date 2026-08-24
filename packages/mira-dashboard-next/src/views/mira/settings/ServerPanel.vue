<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { settingsApi } from '@/api'
import type { ServerSettings } from '@/types/mira'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'vue-sonner'

const { t } = useI18n()

// ===== 服务器设置 (从 overview 迁移) =====
const serverSettings = ref<ServerSettings>({ authRequired: true, allowRegistration: true })

async function loadServerSettings() {
  try {
    serverSettings.value = await settingsApi.get()
  } catch {
    toast.error(t('common.failed'))
  }
}

async function saveServerSettings() {
  try {
    await settingsApi.update(serverSettings.value)
    toast.success(t('common.success'))
  } catch {
    toast.error(t('common.failed'))
  }
}

// 该面板仅在非 user 角色的服务器 tab 中挂载
onMounted(loadServerSettings)
</script>

<template>
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle class="text-base">{{ t('settings.server.title') }}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex items-center justify-between">
          <Label>{{ t('settings.server.authRequired') }}</Label>
          <Switch v-model="serverSettings.authRequired" />
        </div>
        <div class="flex items-center justify-between">
          <Label>{{ t('settings.server.allowRegistration') }}</Label>
          <Switch v-model="serverSettings.allowRegistration" />
        </div>
        <div class="flex justify-end">
          <Button @click="saveServerSettings">{{ t('common.save') }}</Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
