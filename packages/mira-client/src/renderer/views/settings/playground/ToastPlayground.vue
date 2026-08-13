<template>
  <!-- ============ 应用内 Toast Tab ============ -->
  <TabsContent value="toast" class="space-y-6 mt-4">
    <div class="space-y-1">
      <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.toastIntro') }}</p>
      <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.toastIntroDesc') }}</p>
    </div>

    <!-- 基础类型 -->
    <div class="space-y-3">
      <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.toastTypeTitle') }}</p>
      <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.toastTypeDesc') }}</p>
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Button
          v-for="d in typeDemos"
          :key="d.value"
          variant="outline"
          size="sm"
          @click="showByType(d.value)"
        >
          <span class="material-icons text-base" :style="{ color: d.color }">{{ d.icon }}</span>
          {{ d.label }}
        </Button>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="space-y-3">
      <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.toastActionTitle') }}</p>
      <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.toastActionDesc') }}</p>
      <div class="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" @click="showWithActions">
          <span class="material-icons text-base">smart_button</span>
          {{ $t('views.playgroundPanel.toastActionDemo') }}
        </Button>
      </div>
    </div>

    <!-- Promise 状态 -->
    <div class="space-y-3">
      <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.toastPromiseTitle') }}</p>
      <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.toastPromiseDesc') }}</p>
      <div class="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" @click="showPromise(1500)">
          <span class="material-icons text-base">hourglass_top</span>
          {{ $t('views.playgroundPanel.toastPromiseDemo') }}
        </Button>
      </div>
    </div>

    <!-- 弹出位置 -->
    <div class="space-y-3">
      <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.toastPositionTitle') }}</p>
      <p class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.toastPositionDesc') }}</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

    <!-- 自定义参数 -->
    <div class="space-y-3">
      <p class="text-sm font-semibold text-foreground dark:text-muted-foreground">{{ $t('views.playgroundPanel.toastCustomTitle') }}</p>
      <div class="rounded-lg border border-border p-3 space-y-3 bg-background/40">
        <label class="block">
          <span class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.toastMessageLabel') }}</span>
          <input
            v-model="custom.message"
            class="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
            :placeholder="$t('views.playgroundPanel.toastMessagePlaceholder')"
          />
        </label>
        <label class="block">
          <span class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.toastDescLabel') }}</span>
          <input
            v-model="custom.description"
            class="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
            :placeholder="$t('views.playgroundPanel.toastDescPlaceholder')"
          />
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label class="block">
            <span class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.toastTypeLabel') }}</span>
            <select
              v-model="custom.type"
              class="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
            >
              <option v-for="d in typeDemos" :key="d.value" :value="d.value">{{ d.label }}</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.toastPositionLabel') }}</span>
            <select
              v-model="custom.position"
              class="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
            >
              <option v-for="p in positionDemos" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </label>
          <label class="flex items-end gap-2 pb-0.5">
            <span class="text-xs text-muted-foreground whitespace-nowrap">{{ $t('views.playgroundPanel.toastDurationLabel') }}</span>
            <input
              v-model.number="custom.duration"
              type="number"
              min="0"
              step="500"
              class="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>
        <label class="block">
          <span class="text-xs text-muted-foreground">{{ $t('views.playgroundPanel.toastActionTextLabel') }}</span>
          <input
            v-model="custom.actionText"
            class="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
            :placeholder="$t('views.playgroundPanel.toastActionTextPlaceholder')"
          />
        </label>
        <div class="flex flex-wrap items-center gap-2">
          <Button size="sm" @click="showCustom" :disabled="!custom.message.trim()">
            <span class="material-icons text-base">send</span>
            {{ $t('views.playgroundPanel.toastSend') }}
          </Button>
          <Button variant="outline" size="sm" @click="dismissAll">
            <span class="material-icons text-base">close</span>
            {{ $t('views.playgroundPanel.toastDismissAll') }}
          </Button>
        </div>
      </div>
    </div>
  </TabsContent>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

const { t } = useI18n()

// Toast 类型演示数据（value 对应 toast / toast.success / ... 方法名）
const typeDemos = [
  { value: 'default', label: 'Default', icon: 'chat_bubble', color: '#a1a1aa' },
  { value: 'success', label: 'Success', icon: 'check_circle', color: '#10b981' },
  { value: 'warning', label: 'Warning', icon: 'warning', color: '#f59e0b' },
  { value: 'error', label: 'Error', icon: 'error', color: '#ef4444' },
  { value: 'info', label: 'Info', icon: 'info', color: '#3b82f6' },
] as const

type ToastType = (typeof typeDemos)[number]['value']

// 弹出位置演示数据（vue-sonner 支持的 6 个屏幕位置）
const positionDemos = [
  { value: 'top-left', label: 'top-left' },
  { value: 'top-center', label: 'top-center' },
  { value: 'top-right', label: 'top-right' },
  { value: 'bottom-left', label: 'bottom-left' },
  { value: 'bottom-center', label: 'bottom-center' },
  { value: 'bottom-right', label: 'bottom-right' },
] as const

type ToastPosition = (typeof positionDemos)[number]['value']

// 自定义参数表单
const custom = reactive({
  message: t('views.playgroundPanel.toastCustomMessage'),
  description: t('views.playgroundPanel.toastCustomDesc'),
  type: 'info' as ToastType,
  position: 'bottom-right' as ToastPosition,
  duration: 4000,
  actionText: '',
})

/**
 * 按类型调用对应的 toast 方法
 */
function showByType(type: ToastType) {
  const fn = type === 'default' ? toast : toast[type]
  fn(t(`views.playgroundPanel.toastDemo_${type}`), {
    description: t('views.playgroundPanel.toastDemoDesc', { type }),
    duration: 4000,
  })
}

/**
 * 带 action / cancel 按钮
 */
function showWithActions() {
  toast(t('views.playgroundPanel.toastFileDeleted'), {
    description: t('views.playgroundPanel.toastFileDeletedDesc'),
    action: {
      label: t('views.playgroundPanel.toastUndo'),
      onClick: () => toast.success(t('views.playgroundPanel.toastUndone')),
    },
    cancel: {
      label: t('views.playgroundPanel.dismissAction'),
      onClick: () => {},
    },
    duration: 8000,
  })
}

/**
 * Promise 状态流转：loading → success
 */
function showPromise(ms: number) {
  const delay = () => new Promise<void>(resolve => setTimeout(resolve, ms))
  toast.promise(delay(), {
    loading: t('views.playgroundPanel.toastPromiseLoading'),
    success: () => t('views.playgroundPanel.toastPromiseSuccess'),
    error: () => t('views.playgroundPanel.toastPromiseError'),
  })
}

function showByPosition(position: ToastPosition) {
  toast(t('views.playgroundPanel.toastPositionDemo'), {
    description: position,
    position,
    duration: 3000,
  })
}

function showCustom() {
  const fn = custom.type === 'default' ? toast : toast[custom.type]
  const options: Record<string, unknown> = {
    description: custom.description || undefined,
    duration: custom.duration,
    position: custom.position,
  }
  if (custom.actionText.trim()) {
    options.action = {
      label: custom.actionText.trim(),
      onClick: () => toast(t('views.playgroundPanel.toastActionClicked', { label: custom.actionText.trim() })),
    }
  }
  fn(custom.message, options)
}

function dismissAll() {
  toast.dismiss()
}
</script>
