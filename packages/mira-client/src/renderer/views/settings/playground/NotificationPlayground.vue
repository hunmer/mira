<template>
  <!-- ============ 通知 Tab ============ -->
  <TabsContent value="notification" class="space-y-6 mt-4">
    <template v-if="isElectron">
      <!-- 通知类型 -->
      <div class="space-y-3">
        <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.typeTitle') }}</p>
        <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.typeDesc') }}</p>
        <div class="flex flex-wrap gap-2">
          <Button
            v-for="t in typeDemos"
            :key="t.type"
            variant="outline"
            size="sm"
            @click="showByType(t.type)"
          >
            <span class="material-icons text-base" :style="{ color: t.color }">{{ t.icon }}</span>
            {{ t.label }}
          </Button>
        </div>
      </div>

      <!-- 屏幕位置 -->
      <div class="space-y-3">
        <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.positionTitle') }}</p>
        <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.positionDesc') }}</p>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button
            v-for="p in positionDemos"
            :key="p.value"
            variant="outline"
            size="sm"
            @click="showByPosition(p.value)"
          >
            {{ p.label }}
          </Button>
        </div>
      </div>

      <!-- 自定义内容（结构化 + HTML）-->
      <div class="space-y-3">
        <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.customContent') }}</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" @click="showStructured">
            <span class="material-icons text-base">subject</span>
            {{ $t('views.playgroundPanel.structuredFields') }}
          </Button>
          <Button variant="secondary" size="sm" @click="showHtml">
            <span class="material-icons text-base">code</span>
            {{ $t('views.playgroundPanel.customHtml') }}
          </Button>
          <Button variant="secondary" size="sm" @click="showImages">
            <span class="material-icons text-base">image</span>
            {{ $t('views.playgroundPanel.imagesNotification') }}
          </Button>
        </div>
      </div>

      <!-- 出现动画 -->
      <div class="space-y-3">
        <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.animationTitle') }}</p>
        <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.animationDesc') }}</p>
        <div class="flex flex-wrap items-center gap-2">
          <Button
            v-for="a in animationDemos"
            :key="a.value"
            variant="outline"
            size="sm"
            @click="showByAnimation(a.value)"
          >
            {{ a.label }}
          </Button>
        </div>
      </div>

      <!-- 时长控制 -->
      <div class="space-y-3">
        <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.durationTitle') }}</p>
        <div class="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" @click="showWithDuration(0)">{{ $t('views.playgroundPanel.persistent') }}</Button>
          <Button variant="outline" size="sm" @click="showWithDuration(1500)">{{ $t('views.playgroundPanel.oneHalfSec') }}</Button>
          <Button variant="outline" size="sm" @click="showWithDuration(5000)">{{ $t('views.playgroundPanel.fiveSec') }}</Button>
          <Button variant="outline" size="sm" @click="dismissCurrent">
            <span class="material-icons text-base">close</span>
            {{ $t('views.playgroundPanel.dismissCurrent') }}
          </Button>
        </div>
      </div>

      <!-- 自定义输入 -->
      <div class="space-y-3">
        <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.customParams') }}</p>
        <div class="rounded-lg border border-border p-3 space-y-3 bg-background/40">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="block">
              <span class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.titleLabel') }}</span>
              <input
                v-model="custom.title"
                class="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                :placeholder="$t('views.playgroundPanel.titlePlaceholder')"
              />
            </label>
            <label class="block">
              <span class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.typeLabel') }}</span>
              <select
                v-model="custom.type"
                class="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
              >
                <option value="info">info</option>
                <option value="success">success</option>
                <option value="warning">warning</option>
                <option value="error">error</option>
                <option value="loading">loading</option>
              </select>
            </label>
          </div>
          <label class="block">
            <span class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.animationLabel') }}</span>
            <select
              v-model="custom.animation"
              class="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
            >
              <option value="slide">{{ $t('views.playgroundPanel.slideOption') }}</option>
              <option value="fade">{{ $t('views.playgroundPanel.fadeOption') }}</option>
              <option value="zoom">{{ $t('views.playgroundPanel.zoomOption') }}</option>
              <option value="bounce">{{ $t('views.playgroundPanel.bounceOption') }}</option>
              <option value="none">{{ $t('views.playgroundPanel.noneOption') }}</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.bodyLabel') }}</span>
            <textarea
              v-model="custom.body"
              rows="2"
              class="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary resize-none"
              :placeholder="$t('views.playgroundPanel.bodyPlaceholder')"
            ></textarea>
          </label>
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-2 text-sm">
              <span class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.durationMsLabel') }}</span>
              <input
                v-model.number="custom.duration"
                type="number"
                min="0"
                step="500"
                class="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <Button size="sm" @click="showCustom" :disabled="!custom.title.trim()">
              <span class="material-icons text-base">send</span>
              {{ $t('views.playgroundPanel.send') }}
            </Button>
          </div>
        </div>
      </div>
    </template>

    <!-- 非 Electron 环境降级提示 -->
    <div v-else class="rounded-lg border border-dashed border-border p-8 text-center">
      <span class="material-icons text-4xl text-muted-foreground mb-2 block">desktop_access_disabled</span>
      <p class="text-sm text-muted-foreground">
        {{ $t('views.playgroundPanel.notElectronDesc') }}
        <br />{{ $t('views.playgroundPanel.openDesktop') }}
      </p>
    </div>
  </TabsContent>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import type { NotificationPayload, FloatingWindowPosition, NotificationAnimation } from '@/shared/types'

const { t } = useI18n()

// 是否处于 Electron 环境（通知窗口仅桌面端可用）
const isElectron = computed(() => !!window.electronAPI?.notificationWindow)

// 通知类型演示数据
const typeDemos = [
  { type: 'info', label: 'Info', icon: 'info', color: '#3b82f6' },
  { type: 'success', label: 'Success', icon: 'check_circle', color: '#10b981' },
  { type: 'warning', label: 'Warning', icon: 'warning', color: '#f59e0b' },
  { type: 'error', label: 'Error', icon: 'error', color: '#ef4444' },
  { type: 'loading', label: 'Loading', icon: 'autorenew', color: '#6366f1' },
] as const

// 屏幕位置演示数据
const positionDemos = computed(() => [
  { value: 'top-left', label: t('views.playgroundPanel.positionTopLeft') },
  { value: 'top-right', label: t('views.playgroundPanel.positionTopRight') },
  { value: 'bottom-left', label: t('views.playgroundPanel.positionBottomLeft') },
  { value: 'bottom-right', label: t('views.playgroundPanel.positionBottomRight') },
  { value: 'top', label: t('views.playgroundPanel.positionTop') },
  { value: 'bottom', label: t('views.playgroundPanel.positionBottom') },
  { value: 'center', label: t('views.playgroundPanel.positionCenter') },
] as const)

// 出现动画演示数据
const animationDemos = computed(() => [
  { value: 'slide', label: t('views.playgroundPanel.animationSlide') },
  { value: 'fade', label: t('views.playgroundPanel.animationFade') },
  { value: 'zoom', label: t('views.playgroundPanel.animationZoom') },
  { value: 'bounce', label: t('views.playgroundPanel.animationBounce') },
  { value: 'none', label: t('views.playgroundPanel.animationNone') },
] as const)

// 自定义参数表单
const custom = ref<NotificationPayload>({
  title: t('views.playgroundPanel.customNotificationTitle'),
  body: t('views.playgroundPanel.customNotificationBody'),
  type: 'info',
  duration: 5000,
  animation: 'slide',
})

/**
 * 发送通知的统一封装（带错误处理）
 */
async function notify(payload: NotificationPayload) {
  try {
    await window.electronAPI?.notificationWindow?.show(payload)
  } catch (err) {
    console.error('[Playground] 通知发送失败:', err)
  }
}

// ============ 演示动作 ============

function showByType(type: NotificationPayload['type']) {
  const map: Record<string, NotificationPayload> = {
    info: { title: t('views.playgroundPanel.infoTitle'), body: t('views.playgroundPanel.infoBody'), type: 'info' },
    success: { title: t('views.playgroundPanel.successTitle'), body: t('views.playgroundPanel.successBody'), type: 'success' },
    warning: { title: t('views.playgroundPanel.warningTitle'), body: t('views.playgroundPanel.warningBody'), type: 'warning' },
    error: { title: t('views.playgroundPanel.errorTitle'), body: t('views.playgroundPanel.errorBody'), type: 'error' },
    // loader 旋转图标常驻展示，时长放宽便于观察
    loading: { title: t('views.playgroundPanel.loadingTitle'), body: t('views.playgroundPanel.loadingBody'), type: 'loading', duration: 6000 },
  }
  notify(map[type || 'info'])
}

function showByPosition(position: FloatingWindowPosition) {
  notify({
    title: t('views.playgroundPanel.positionDemoTitle'),
    body: t('views.playgroundPanel.positionDemoBody', { position }),
    type: 'info',
    position,
    duration: 3000,
  })
}

function showByAnimation(animation: NotificationAnimation) {
  notify({
    title: t('views.playgroundPanel.animationDemoTitle'),
    body: t('views.playgroundPanel.animationDemoBody', { animation }),
    type: 'info',
    animation,
    duration: 4000,
  })
}

function showStructured() {
  notify({
    title: t('views.playgroundPanel.importDoneTitle'),
    body: t('views.playgroundPanel.importDoneBody'),
    type: 'success',
    actions: [
      { id: 'view', label: t('views.playgroundPanel.viewAction') },
      { id: 'dismiss', label: t('views.playgroundPanel.dismissAction') },
    ],
    duration: 0, // 常驻，等待用户操作
  })
}

/**
 * 图片通知演示：images 字段在卡片左侧展示（多图 2x2 网格）。
 * 图片 URL 需绝对地址（相对路径在通知窗口的 file:// 页面下无法解析）。
 */
function showImages() {
  const images = ['AI.png', 'BMP.png', 'CSV.png', 'JPG.png'].map(
    (name) => new URL(`ext_icons/${name}`, window.location.href).href
  )
  notify({
    title: t('views.playgroundPanel.imagesNotificationTitle'),
    body: t('views.playgroundPanel.imagesNotificationBody'),
    type: 'success',
    images,
    actions: [{ id: 'view', label: t('views.playgroundPanel.viewAction') }],
    duration: 8000,
  })
}

function showHtml() {
  notify({
    title: t('views.playgroundPanel.customContentTitle'),
    type: 'info',
    html: '<div style="display:flex;flex-direction:column;gap:6px;">' +
      `<p style="margin:0;">${t('views.playgroundPanel.customHtmlPrefix')} <b>HTML</b></p>` +
      '<ul style="margin:0;padding-left:18px;color:#9ca3af;font-size:12px;">' +
      `<li>${t('views.playgroundPanel.htmlInlineCode')} <code style="background:rgba(255,255,255,.1);padding:1px 4px;border-radius:3px;">code</code></li>` +
      `<li>${t('views.playgroundPanel.htmlColoredText')} <span style="color:#10b981;">color</span> ${t('views.playgroundPanel.htmlText')} <span style="color:#f59e0b;">color</span></li>` +
      `<li>${t('views.playgroundPanel.htmlLinkStyle')} <a href="#" style="color:#3b82f6;">link</a></li>` +
      '</ul></div>',
    duration: 6000,
  })
}

function showWithDuration(duration: number) {
  notify({
    title: duration === 0 ? t('views.playgroundPanel.persistentTitle') : t('views.playgroundPanel.msGoneTitle', { n: duration }),
    body: duration === 0 ? t('views.playgroundPanel.persistentBody') : t('views.playgroundPanel.msGoneBody', { n: duration }),
    type: 'info',
    duration,
  })
}

function dismissCurrent() {
  try {
    window.electronAPI?.notificationWindow?.dismiss()
  } catch (err) {
    console.error('[Playground] 关闭通知失败:', err)
  }
}

function showCustom() {
  notify({
    title: custom.value.title,
    body: custom.value.body,
    type: custom.value.type,
    duration: custom.value.duration,
    animation: custom.value.animation,
  })
}
</script>
