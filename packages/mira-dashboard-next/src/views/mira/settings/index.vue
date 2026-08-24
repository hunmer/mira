<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { RiDownloadCloud2Line, RiStore2Line, RiSettingsLine } from '@remixicon/vue'
import DownloadPanel from './DownloadPanel.vue'
import PluginPanel from './PluginPanel.vue'
import ServerPanel from './ServerPanel.vue'

const { t } = useI18n()
const authStore = useAuthStore()
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold">{{ t('settings.title') }}</h1>
      <p class="text-sm text-muted-foreground mt-1">{{ t('settings.download.subtitle') }}</p>
    </div>

    <Tabs default-value="download">
      <TabsList>
        <TabsTrigger value="download">
          <RiDownloadCloud2Line class="size-4 mr-1.5" />
          {{ t('settings.tabs.download') }}
        </TabsTrigger>
        <TabsTrigger value="plugin">
          <RiStore2Line class="size-4 mr-1.5" />
          插件
        </TabsTrigger>
        <TabsTrigger v-if="authStore.userRole !== 'user'" value="server">
          <RiSettingsLine class="size-4 mr-1.5" />
          {{ t('settings.tabs.server') }}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="download" class="space-y-6 mt-4">
        <DownloadPanel />
      </TabsContent>
      <TabsContent value="plugin" class="space-y-6 mt-4">
        <PluginPanel />
      </TabsContent>
      <TabsContent value="server" class="space-y-6 mt-4">
        <ServerPanel />
      </TabsContent>
    </Tabs>
  </div>
</template>
