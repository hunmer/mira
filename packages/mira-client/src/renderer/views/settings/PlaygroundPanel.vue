<template>
  <div class="p-4 space-y-6">
    <div>
      <h3 class="text-foreground dark:text-muted-foreground text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">
        Playground
      </h3>
      <p class="text-muted-foreground text-sm">{{ $t('views.playgroundPanel.desc') }}</p>
    </div>

    <Tabs v-model="activeTab" class="w-full">
      <TabsList class="grid w-full grid-cols-6">
        <TabsTrigger value="notification" class="flex items-center gap-2">
          <span class="material-icons text-base">notifications</span>
          {{ $t('views.playgroundPanel.notification') }}
        </TabsTrigger>
        <TabsTrigger value="form" class="flex items-center gap-2">
          <span class="material-icons text-base">description</span>
          {{ $t('views.playgroundPanel.declarativeForm') }}
        </TabsTrigger>
        <TabsTrigger value="glow" class="flex items-center gap-2">
          <span class="material-icons text-base">auto_awesome</span>
          {{ $t('views.playgroundPanel.glow') }}
        </TabsTrigger>
        <TabsTrigger value="toast" class="flex items-center gap-2">
          <span class="material-icons text-base">chat_bubble</span>
          {{ $t('views.playgroundPanel.toast') }}
        </TabsTrigger>
        <TabsTrigger value="pageSlide" class="flex items-center gap-2">
          <span class="material-icons text-base">swap_horiz</span>
          {{ $t('views.playgroundPanel.pageSlide') }}
        </TabsTrigger>
        <TabsTrigger value="components" class="flex items-center gap-2">
          <span class="material-icons text-base">widgets</span>
          {{ $t('views.playgroundPanel.components') }}
        </TabsTrigger>
      </TabsList>

      <!-- 各功能演示拆分至 playground/ 目录，子组件自带 TabsContent -->
      <NotificationPlayground />
      <FormPlayground />
      <GlowPlayground />
      <ToastPlayground />
      <PageSlidePlayground />
      <ComponentsPlayground />
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import NotificationPlayground from './playground/NotificationPlayground.vue'
import FormPlayground from './playground/FormPlayground.vue'
import GlowPlayground from './playground/GlowPlayground.vue'
import ToastPlayground from './playground/ToastPlayground.vue'
import PageSlidePlayground from './playground/PageSlidePlayground.vue'
import ComponentsPlayground from './playground/ComponentsPlayground.vue'

const activeTab = ref('notification')
</script>
