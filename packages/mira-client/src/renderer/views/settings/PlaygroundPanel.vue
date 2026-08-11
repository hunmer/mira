<template>
  <div class="p-4 space-y-6">
    <div>
      <h3 class="text-foreground dark:text-muted-foreground text-lg font-bold leading-tight tracking-[-0.015em] pb-2 pt-4">
        Playground
      </h3>
      <p class="text-muted-foreground text-sm">{{ $t('views.playgroundPanel.desc') }}</p>
    </div>

    <Tabs v-model="activeTab" class="w-full">
      <TabsList class="grid w-full grid-cols-3">
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
      </TabsList>

      <!-- ============ 通知 Tab ============ -->
      <TabsContent value="notification" class="space-y-6 mt-4">
        <template v-if="isElectron">
          <!-- 通知类型 -->
          <div class="space-y-3">
            <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.typeTitle') }}</p>
            <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.typeDesc') }}</p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

      <!-- ============ 声明式表单 Tab ============ -->
      <TabsContent value="form" class="space-y-4 mt-4">
        <div class="space-y-1">
          <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.formIntro') }}</p>
          <p class="text-xs text-muted-foreground">
            {{ $t('views.playgroundPanel.formIntroDesc') }}
          </p>
        </div>

        <Card class="bg-background/40">
          <CardContent class="pt-6">
            <SchemaForm
              :schema="formSchema"
              :fields="formFields"
              :initial-values="formInitialValues"
              :title="$t('views.playgroundPanel.formTitle')"
              :form-description="$t('views.playgroundPanel.formDesc')"
              :submit-text="$t('views.playgroundPanel.submit')"
              :submitting="formSubmitting"
              @submit="onFormSubmit"
              @cancel="onFormCancel"
              @invalid="onFormInvalid"
            />
          </CardContent>
        </Card>

        <!-- 提交结果预览 -->
        <div v-if="formResult" class="space-y-2">
          <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.resultTitle') }}</p>
          <pre class="rounded-lg border border-border bg-muted/40 p-3 text-xs overflow-auto max-h-60">{{ formResult }}</pre>
        </div>
      </TabsContent>

      <!-- ============ 发光组件 Tab ============ -->
      <TabsContent value="glow" class="space-y-6 mt-4">
        <div class="space-y-1">
          <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.glowShadowTitle') }}</p>
          <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.glowDesc') }}</p>
        </div>

        <!-- GlowingShadow 三种配色模式 -->
        <div class="space-y-3">
          <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.glowShadowDesc') }}</p>
          <div class="flex flex-wrap items-center gap-8 py-4">
            <GlowingShadow :width="240">{{ $t('views.playgroundPanel.glowRainbow') }}</GlowingShadow>
            <GlowingShadow :width="240" color-mode="mono" color="#3b82f6">{{ $t('views.playgroundPanel.glowMono') }}</GlowingShadow>
            <GlowingShadow :width="240" color-mode="multi" :colors="['#ef4444','#22c55e','#3b82f6']">{{ $t('views.playgroundPanel.glowMulti') }}</GlowingShadow>
          </div>
        </div>

        <!-- GlowingButton 预设 -->
        <div class="space-y-3">
          <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.glowButtonTitle') }}</p>
          <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.glowButtonDesc') }}</p>
          <div class="flex flex-wrap items-center gap-6 py-4">
            <GlowingButton preset="rainbow" @click="onGlowClick">{{ $t('views.playgroundPanel.glowRainbow') }}</GlowingButton>
            <GlowingButton preset="blue">{{ $t('views.playgroundPanel.glowMono') }}</GlowingButton>
            <GlowingButton preset="sunset" size="lg">Sunset</GlowingButton>
            <GlowingButton preset="ocean" size="sm">Ocean</GlowingButton>
            <GlowingButton preset="green" disabled>{{ $t('views.playgroundPanel.glowDisabled') }}</GlowingButton>
          </div>
          <p v-if="glowClickCount > 0" class="text-xs text-muted-foreground">
            {{ $t('views.playgroundPanel.glowClickCount', { n: glowClickCount }) }}
          </p>
        </div>
      </TabsContent>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { z } from 'zod'
import { toast } from 'vue-sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { GlowingShadow } from '@/components/ui/glowing-shadow'
import { GlowingButton } from '@/components/ui/glowing-button'
import { SchemaForm, type SchemaField } from '@/renderer/components/business/SchemaForm'
import type { NotificationPayload, FloatingWindowPosition, NotificationAnimation } from '@/shared/types'

const { t } = useI18n()

const activeTab = ref('notification')

// 是否处于 Electron 环境（通知窗口仅桌面端可用）
const isElectron = computed(() => !!window.electronAPI?.notificationWindow)

// 通知类型演示数据
const typeDemos = [
  { type: 'info', label: 'Info', icon: 'info', color: '#3b82f6' },
  { type: 'success', label: 'Success', icon: 'check_circle', color: '#10b981' },
  { type: 'warning', label: 'Warning', icon: 'warning', color: '#f59e0b' },
  { type: 'error', label: 'Error', icon: 'error', color: '#ef4444' },
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

// ============ 声明式表单 Demo ============

// zod schema：数据类型 + 校验规则的单一真源
const formSchema = computed(() => z.object({
  name: z.string().min(2, t('views.playgroundPanel.nameMin')).max(50, t('views.playgroundPanel.nameMax')),
  type: z.enum(['admin', 'user', 'guest'], { message: t('views.playgroundPanel.selectTypeRequired') }),
  level: z.number().min(0).max(100),
  enabled: z.boolean(),
  tags: z.array(z.string()).optional(),
  description: z.string().max(200, t('views.playgroundPanel.descMax')).optional(),
  birthday: z.date().optional(),
}))

// 字段元数据：驱动渲染
const formFields = computed<SchemaField[]>(() => [
  { name: 'name', label: t('views.playgroundPanel.nameLabel'), type: 'text', required: true, placeholder: t('views.playgroundPanel.namePlaceholder') },
  { name: 'type', label: t('views.playgroundPanel.typeLabel2'), type: 'select', required: true, placeholder: t('views.playgroundPanel.typePlaceholder'),
    options: [
      { label: t('views.playgroundPanel.admin'), value: 'admin' },
      { label: t('views.playgroundPanel.user'), value: 'user' },
      { label: t('views.playgroundPanel.guest'), value: 'guest' },
    ],
  },
  { name: 'level', label: t('views.playgroundPanel.levelLabel'), type: 'slider', min: 0, max: 100, step: 1 },
  { name: 'enabled', label: t('views.playgroundPanel.enabledLabel'), type: 'switch', description: t('views.playgroundPanel.enabledDesc') },
  { name: 'tags', label: t('views.playgroundPanel.tagsLabel'), type: 'checkbox-group',
    options: [
      { label: t('views.playgroundPanel.tagInternal'), value: 'internal' },
      { label: t('views.playgroundPanel.tagPublic'), value: 'public' },
      { label: t('views.playgroundPanel.tagArchived'), value: 'archived' },
    ],
  },
  { name: 'birthday', label: t('views.playgroundPanel.birthdayLabel'), type: 'date' },
  { name: 'description', label: t('views.playgroundPanel.descriptionLabel'), type: 'textarea', colSpan: 2, placeholder: t('views.playgroundPanel.descriptionPlaceholder') },
])

const formInitialValues = {
  name: '',
  type: undefined,
  level: 30,
  enabled: true,
  tags: [],
  description: '',
}

const formSubmitting = ref(false)
const formResult = ref<string>('')

// FormValues 类型：与 formSchema 结构保持一致（独立定义，避免依赖 ComputedRef 做类型推导）
type FormValues = {
  name: string
  type: 'admin' | 'user' | 'guest'
  level: number
  enabled: boolean
  tags?: string[]
  description?: string
  birthday?: Date
}

function onFormSubmit(values: Record<string, unknown>) {
  const data = values as FormValues
  formSubmitting.value = true
  // 模拟异步提交
  setTimeout(() => {
    formResult.value = JSON.stringify(data, null, 2)
    formSubmitting.value = false
    toast.success(t('views.playgroundPanel.formSubmitSuccess'), { description: t('views.playgroundPanel.formSubmitSuccessDesc') })
  }, 600)
}

function onFormCancel() {
  formResult.value = ''
  toast(t('views.playgroundPanel.cancelled'))
}

function onFormInvalid(errors: Record<string, string>) {
  const first = Object.values(errors)[0]
  toast.error(t('views.playgroundPanel.validationFailed'), { description: first || t('views.playgroundPanel.validationFailedDesc') })
}

// ============ 发光组件 Demo ============
const glowClickCount = ref(0)
function onGlowClick() {
  glowClickCount.value++
  toast.success(t('views.playgroundPanel.glowButtonTitle'), { description: t('views.playgroundPanel.glowClickCount', { n: glowClickCount.value }) })
}
</script>
