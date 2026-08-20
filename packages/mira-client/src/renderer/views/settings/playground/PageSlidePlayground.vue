<template>
  <!-- ============ 页面滑动组件 Tab ============ -->
  <TabsContent value="pageSlide" class="space-y-6 mt-4">
    <div class="space-y-1">
      <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.pageSlideDemoTitle') }}</p>
      <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.pageSlideDesc') }}</p>
    </div>

    <!-- 演示容器：两页叠加，绝对定位铺满，需由外部给定尺寸 -->
    <PageSlide
      v-model:page="page"
      :exit-enabled="exitEnabled"
      :slide-duration="duration"
      :slide-distance="`${distance}px`"
      :blur="`${blur}px`"
      :stagger="`${stagger}ms`"
      class="h-72 overflow-hidden rounded-xl border bg-card text-card-foreground"
    >
      <template #page-1>
        <div class="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <span class="material-icons text-5xl text-primary">waving_hand</span>
          <p class="text-base font-semibold">{{ $t('views.playgroundPanel.pageSlidePage1Title') }}</p>
          <p class="max-w-sm text-xs text-muted-foreground">{{ $t('views.playgroundPanel.pageSlidePage1Body') }}</p>
          <Button size="sm" @click="page = 2">
            {{ $t('views.playgroundPanel.pageSlideNext') }}
            <span class="material-icons text-base">arrow_forward</span>
          </Button>
        </div>
      </template>

      <template #page-2>
        <div class="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <span class="material-icons text-5xl text-primary">article</span>
          <p class="text-base font-semibold">{{ $t('views.playgroundPanel.pageSlidePage2Title') }}</p>
          <p class="max-w-sm text-xs text-muted-foreground">{{ $t('views.playgroundPanel.pageSlidePage2Body') }}</p>
          <Button size="sm" variant="outline" @click="page = 1">
            <span class="material-icons text-base">arrow_back</span>
            {{ $t('views.playgroundPanel.pageSlidePrev') }}
          </Button>
        </div>
      </template>
    </PageSlide>

    <!-- 过渡参数 -->
    <div class="space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" @click="toggle">
          <span class="material-icons text-base">swap_horiz</span>
          {{ $t('views.playgroundPanel.pageSlideToggle') }}
        </Button>
        <span class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.pageSlideCurrent', { n: page }) }}</span>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <!-- 启用退出动效 -->
        <div class="flex items-center justify-between gap-3 rounded-lg border p-3">
          <Label class="text-xs">{{ $t('views.playgroundPanel.pageSlideExitEnabled') }}</Label>
          <Switch v-model="exitEnabled" />
        </div>

        <!-- 位移距离 -->
        <div class="space-y-2 rounded-lg border p-3">
          <div class="flex items-center justify-between">
            <Label class="text-xs">{{ $t('views.playgroundPanel.pageSlideDistance') }}</Label>
            <span class="text-xs text-muted-foreground">{{ distance }}px</span>
          </div>
          <Slider :model-value="[distance]" :min="0" :max="40" :step="1" @update:model-value="v => (distance = v?.[0] ?? 0)" />
        </div>

        <!-- 模糊量 -->
        <div class="space-y-2 rounded-lg border p-3">
          <div class="flex items-center justify-between">
            <Label class="text-xs">{{ $t('views.playgroundPanel.pageSlideBlur') }}</Label>
            <span class="text-xs text-muted-foreground">{{ blur }}px</span>
          </div>
          <Slider :model-value="[blur]" :min="0" :max="10" :step="1" @update:model-value="v => (blur = v?.[0] ?? 0)" />
        </div>

        <!-- 过渡时长 -->
        <div class="space-y-2 rounded-lg border p-3">
          <div class="flex items-center justify-between">
            <Label class="text-xs">{{ $t('views.playgroundPanel.pageSlideDuration') }}</Label>
            <span class="text-xs text-muted-foreground">{{ duration }}ms</span>
          </div>
          <Slider :model-value="[duration]" :min="0" :max="800" :step="50" @update:model-value="v => (duration = v?.[0] ?? 0)" />
        </div>

        <!-- 进入页延迟 -->
        <div class="space-y-2 rounded-lg border p-3">
          <div class="flex items-center justify-between">
            <Label class="text-xs">{{ $t('views.playgroundPanel.pageSlideStagger') }}</Label>
            <span class="text-xs text-muted-foreground">{{ stagger }}ms</span>
          </div>
          <Slider :model-value="[stagger]" :min="0" :max="300" :step="20" @update:model-value="v => (stagger = v?.[0] ?? 0)" />
        </div>
      </div>
    </div>
  </TabsContent>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { PageSlide } from '@renderer/components/common'

const page = ref<1 | 2>(1)
const toggle = () => {
  page.value = page.value === 1 ? 2 : 1
}

const exitEnabled = ref(true)
const distance = ref(8)
const blur = ref(3)
const duration = ref(250)
const stagger = ref(0)
</script>
