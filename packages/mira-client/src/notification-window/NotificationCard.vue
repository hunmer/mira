<script setup lang="ts">
import type { NotificationAction, NotificationPayload } from '../shared/types'

/**
 * 单条通知卡片（经 toast.custom 渲染，外观由本组件完全接管，unstyled）。
 * 点击回调 / 操作按钮 / 关闭均通过 props 回调上抛，由 App 转发主进程。
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

/** 多文件缩略图（URL 形式，最多 4 张，去重） */
function itemIcons(): string[] {
  const icons = Array.isArray(props.item.icons) ? props.item.icons : []
  return [...new Set(icons.filter((icon) => typeof icon === 'string' && URL_RE.test(icon)))].slice(0, 4)
}

/** 非 URL 图标回退：icon 字段的 Material Icons 名称，再按类型回退 */
function displayIcon(): string {
  if (props.item.icon && !isIconUrl(props.item.icon)) return props.item.icon
  const fallback: Record<string, string> = {
    success: 'check_circle',
    warning: 'warning',
    error: 'error',
    info: 'notifications',
  }
  return fallback[props.item.type || 'info']
}

const typeBarColor: Record<string, string> = {
  info: 'bg-sky-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
}

const typeIconColor: Record<string, string> = {
  info: 'text-sky-500',
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  error: 'text-red-500',
}

function hideBrokenImage(e: Event): void {
  ;(e.target as HTMLElement).style.visibility = 'hidden'
}
</script>

<template>
  <div
    class="flex w-full cursor-pointer overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg select-none"
    @click="props.onClick?.()"
  >
    <!-- 左侧类型色条 -->
    <div class="w-1 shrink-0 self-stretch" :class="typeBarColor[item.type || 'info']" />

    <!-- 缩略图 / 图标区 -->
    <div class="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden bg-muted">
      <template v-if="itemIcons().length > 1">
        <div class="grid h-full w-full grid-cols-2 grid-rows-2 gap-px">
          <img
            v-for="thumb in itemIcons()"
            :key="thumb"
            :src="thumb"
            draggable="false"
            referrerpolicy="no-referrer"
            class="min-h-0 min-w-0 object-cover"
            @error="hideBrokenImage"
            @mousedown.prevent
            @click.stop
          />
        </div>
      </template>
      <img
        v-else-if="isIconUrl(item.icon)"
        :src="item.icon"
        draggable="false"
        referrerpolicy="no-referrer"
        class="h-full w-full object-cover"
        @error="hideBrokenImage"
        @mousedown.prevent
        @click.stop
      />
      <span v-else class="material-icons text-[32px]" :class="typeIconColor[item.type || 'info']">
        {{ displayIcon() }}
      </span>
    </div>

    <!-- 信息区 -->
    <div class="min-w-0 flex-1 py-3 pr-2 pl-3">
      <div class="mb-1 flex items-center gap-2">
        <div class="min-w-0 flex-1 truncate text-sm font-semibold">{{ item.title }}</div>
        <button
          class="flex shrink-0 cursor-pointer rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          title="关闭"
          @click.stop="props.onClose?.()"
          @mousedown.stop
        >
          <span class="material-icons text-base">close</span>
        </button>
      </div>
      <div
        v-if="item.html"
        class="max-h-[200px] overflow-y-auto text-[13px] leading-relaxed text-muted-foreground"
        @click.stop
        v-html="item.html"
      />
      <p v-else-if="item.body" class="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
        {{ item.body }}
      </p>
      <div v-if="item.actions?.length" class="mt-2.5 flex gap-2">
        <button
          v-for="action in item.actions"
          :key="action.id"
          class="cursor-pointer rounded-md border border-border bg-muted px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-sky-500 hover:bg-sky-500 hover:text-white"
          @click.stop="props.onAction?.(action)"
          @mousedown.stop
        >
          {{ action.label }}
        </button>
      </div>
    </div>
  </div>
</template>
