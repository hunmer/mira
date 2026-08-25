<template>
  <div>
    <section v-for="group in groups" :key="group.id">
      <div class="flex items-center gap-2 px-4 pt-4 pb-1 border-t border-border/60 first:border-t-0 first:pt-0">
        <span class="material-icons text-base text-muted-foreground">{{ group.icon }}</span>
        <h3 class="text-sm font-semibold text-foreground">{{ t(group.label) }}</h3>
      </div>
      <component :is="group.component" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { markRaw, type Component } from 'vue'
import ScreenshotPanel from './ScreenshotPanel.vue'
import FloatingBallPanel from './FloatingBallPanel.vue'
import BrowserPanel from './BrowserPanel.vue'
import FileSharePanel from './FileSharePanel.vue'

const { t } = useI18n()

interface ExtensionGroup {
  id: string
  label: string // i18n key
  icon: string
  component: Component
}

const groups: ExtensionGroup[] = [
  { id: 'screenshot', label: 'settings.sections.screenshot', icon: 'screenshot_monitor', component: markRaw(ScreenshotPanel) },
  { id: 'file-share', label: 'settings.sections.fileShare', icon: 'share', component: markRaw(FileSharePanel) },
  { id: 'floating-ball', label: 'settings.sections.floatingBall', icon: 'bubble_chart', component: markRaw(FloatingBallPanel) },
  { id: 'browser', label: 'settings.sections.browser', icon: 'language', component: markRaw(BrowserPanel) },
]
</script>
