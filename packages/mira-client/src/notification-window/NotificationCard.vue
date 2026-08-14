<script setup lang="ts">
import type { NotificationAction, NotificationPayload } from '../shared/types'

/**
 * 单条通知卡片（经 toast.custom 渲染，unstyled 由本组件完全接管外观）。
 *
 * 视觉复刻 HeroUI v3 Alert：
 *   rounded-3xl 表面 + 状态色 indicator 图标 + 同色标题 + muted 描述。
 * 扩展：images（兼容旧 icons 字段）时以左侧图片区替代 indicator；
 * 点击回调 / 操作按钮 / 关闭通过 props 回调上抛，由 App 转发主进程。
 */
interface Props {
  item: NotificationPayload & { __itemKey?: number }
  onClick?: () => void
  onAction?: (action: NotificationAction) => void
  onClose?: () => void
}

const props = defineProps<Props>()

const URL_RE = /^(https?:|file:|data:|\/\/)/i

function isIconUrl(icon?: string): boolean {
  return typeof icon === 'string' && URL_RE.test(icon)
}

/** 左侧图片列表：images 优先，兼容旧 icons 字段（URL 形式，最多 4 张，去重） */
function itemImages(): string[] {
  const raw = Array.isArray(props.item.images)
    ? props.item.images
    : Array.isArray(props.item.icons)
      ? props.item.icons
      : []
  return [...new Set(raw.filter((img) => typeof img === 'string' && URL_RE.test(img)))].slice(0, 4)
}

/** indicator 图标：payload.icon 为 Material Icons 名称时使用，否则按类型回退 */
function displayIcon(): string {
  if (props.item.icon && !isIconUrl(props.item.icon)) return props.item.icon
  return ''
}

/** 状态 → indicator/标题色（HeroUI soft-foreground 的语义色近似） */
const statusText: Record<string, string> = {
  info: 'text-sky-600 dark:text-sky-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
}
const statusBorder: Record<string, string> = {
  info: 'border-sky-600/30 text-sky-600 dark:text-sky-400 dark:border-sky-400/30 hover:bg-sky-600/10',
  success:
    'border-emerald-600/30 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400/30 hover:bg-emerald-600/10',
  warning:
    'border-amber-600/30 text-amber-600 dark:text-amber-400 dark:border-amber-400/30 hover:bg-amber-600/10',
  error:
    'border-red-600/30 text-red-600 dark:text-red-400 dark:border-red-400/30 hover:bg-red-600/10',
}

function statusTextClass(): string {
  return statusText[props.item.type || 'info'] ?? statusText.info
}
function statusBorderClass(): string {
  return statusBorder[props.item.type || 'info'] ?? statusBorder.info
}

function hideBrokenImage(e: Event): void {
  ;(e.target as HTMLElement).style.visibility = 'hidden'
}
</script>

<template>
  <!-- HeroUI Alert 根：flex / items-start / gap-4 / px-4 py-3 / rounded-3xl / surface 背景 -->
  <div
    class="flex w-full cursor-pointer items-start gap-4 rounded-3xl bg-popover px-4 py-3 shadow-lg select-none"
    @click="props.onClick?.()"
  >
    <!-- 左侧图片区（images / icons，替代 indicator 位置） -->
    <div v-if="itemImages().length > 1" class="grid h-16 w-16 shrink-0 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-2xl bg-muted">
      <img
        v-for="img in itemImages()"
        :key="img"
        :src="img"
        draggable="false"
        referrerpolicy="no-referrer"
        class="h-full w-full object-cover"
        @error="hideBrokenImage"
        @mousedown.prevent
        @click.stop
      />
    </div>
    <img
      v-else-if="itemImages().length === 1"
      :src="itemImages()[0]"
      draggable="false"
      referrerpolicy="no-referrer"
      class="h-12 w-12 shrink-0 rounded-2xl bg-muted object-cover"
      @error="hideBrokenImage"
      @mousedown.prevent
      @click.stop
    />
    <!-- indicator：状态图标（有图片时省略，图片即视觉锚点） -->
    <div v-else-if="isIconUrl(item.icon)" class="flex shrink-0 items-center justify-center p-1">
      <img
        :src="item.icon"
        draggable="false"
        referrerpolicy="no-referrer"
        class="size-4 rounded-sm object-cover"
        @error="hideBrokenImage"
        @mousedown.prevent
        @click.stop
      />
    </div>
    <div v-else class="flex shrink-0 items-center justify-center p-1" :class="statusTextClass()">
      <span v-if="displayIcon()" class="material-icons box-content text-[16px] leading-none">
        {{ displayIcon() }}
      </span>
      <svg
        v-else-if="item.type === 'success'"
        viewBox="0 0 16 16"
        fill="none"
        class="box-content size-4"
        aria-hidden="true"
      >
        <path
          clip-rule="evenodd"
          d="M13.5 8a5.5 5.5 0 1 1-11 0a5.5 5.5 0 0 1 11 0M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0m-3.9-1.55a.75.75 0 1 0-1.2-.9L7.419 8.858L6.03 7.47a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.13-.08z"
          fill="currentColor"
          fill-rule="evenodd"
        />
      </svg>
      <svg
        v-else-if="item.type === 'warning'"
        viewBox="0 0 16 16"
        fill="none"
        class="box-content size-4"
        aria-hidden="true"
      >
        <path
          clip-rule="evenodd"
          d="M7.134 2.994L2.217 11.5a1 1 0 0 0 .866 1.5h9.834a1 1 0 0 0 .866-1.5L8.866 2.993a1 1 0 0 0-1.732 0m3.03-.75c-.962-1.665-3.366-1.665-4.329 0L.918 10.749c-.963 1.666.24 3.751 2.165 3.751h9.834c1.925 0 3.128-2.085 2.164-3.751zM8 5a.75.75 0 0 1 .75.75v2a.75.75 0 0 1-1.5 0v-2A.75.75 0 0 1 8 5m1 5.75a1 1 0 1 1-2 0a1 1 0 0 1 2 0"
          fill="currentColor"
          fill-rule="evenodd"
        />
      </svg>
      <svg
        v-else-if="item.type === 'error'"
        viewBox="0 0 16 16"
        fill="none"
        class="box-content size-4"
        aria-hidden="true"
      >
        <path
          clip-rule="evenodd"
          d="M8 13.5a5.5 5.5 0 1 0 0-11a5.5 5.5 0 0 0 0 11M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14m1-4.5a1 1 0 1 1-2 0a1 1 0 0 1 2 0M8.75 5a.75.75 0 0 0-1.5 0v2.5a.75.75 0 0 0 1.5 0z"
          fill="currentColor"
          fill-rule="evenodd"
        />
      </svg>
      <svg v-else viewBox="0 0 16 16" fill="none" class="box-content size-4" aria-hidden="true">
        <path
          clip-rule="evenodd"
          d="M8 13.5a5.5 5.5 0 1 0 0-11a5.5 5.5 0 0 0 0 11M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14m1-9.5a1 1 0 1 1-2 0a1 1 0 0 1 2 0m-.25 3a.75.75 0 0 0-1.5 0V11a.75.75 0 0 0 1.5 0z"
          fill="currentColor"
          fill-rule="evenodd"
        />
      </svg>
    </div>

    <!-- 内容区 -->
    <div class="flex h-full min-w-0 grow flex-col items-start">
      <div class="flex w-full items-start gap-2">
        <p class="min-w-0 flex-1 text-sm leading-6 font-medium" :class="statusTextClass()">
          {{ item.title }}
        </p>
        <button
          class="mt-0.5 flex shrink-0 cursor-pointer rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
          title="关闭"
          @click.stop="props.onClose?.()"
          @mousedown.stop
        >
          <svg viewBox="0 0 16 16" fill="none" class="size-4" aria-hidden="true">
            <path
              clip-rule="evenodd"
              d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8L3.72 4.78a.75.75 0 0 1 0-1.06"
              fill="currentColor"
              fill-rule="evenodd"
            />
          </svg>
        </button>
      </div>
      <div
        v-if="item.html"
        class="max-h-[200px] w-full overflow-y-auto text-sm text-muted-foreground"
        @click.stop
        v-html="item.html"
      />
      <span v-else-if="item.body" class="line-clamp-2 text-sm text-muted-foreground">
        {{ item.body }}
      </span>
      <div v-if="item.actions?.length" class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="action in item.actions"
          :key="action.id"
          class="cursor-pointer rounded-full border px-3 py-0.5 text-xs font-medium transition-colors"
          :class="statusBorderClass()"
          @click.stop="props.onAction?.(action)"
          @mousedown.stop
        >
          {{ action.label }}
        </button>
      </div>
    </div>
  </div>
</template>
