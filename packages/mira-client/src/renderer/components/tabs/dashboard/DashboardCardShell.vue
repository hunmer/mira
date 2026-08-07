<template>
  <div
    class="dashboard-card-shell group relative flex h-full flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md"
  >
    <!-- 卡片标题栏 -->
    <div
      class="dashboard-card-header flex items-center justify-between border-b px-3 py-1.5"
    >
      <div class="flex min-w-0 items-center gap-1.5">
        <span
          class="material-icons text-base"
          :style="{ color: iconColor || 'var(--primary)' }"
        >
          {{ icon }}
        </span>
        <span class="truncate text-xs font-medium">{{ title }}</span>
      </div>

      <!-- 编辑模式下的操作区（仅拖拽 handle + 删除） -->
      <div
        v-if="editMode"
        class="dashboard-card-edit-actions flex items-center gap-0.5"
        @click.stop
      >
        <button
          class="dashboard-drag-handle flex h-6 w-6 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing"
          title="拖拽移动（按住并拖动）"
        >
          <span class="material-icons text-sm">drag_indicator</span>
        </button>
        <button
          class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title="删除卡片"
          @click="emit('remove')"
        >
          <span class="material-icons text-sm">close</span>
        </button>
      </div>
    </div>

    <!-- 卡片内容 -->
    <div class="relative flex-1 overflow-hidden">
      <slot name="body" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Dashboard 卡片外壳。
 * - 提供统一的标题栏 / 边框 / 阴影样式
 * - 编辑模式下在标题栏右侧展示「拖拽 handle + 删除按钮」
 * - 拖拽 handle 带有固定 class `dashboard-drag-handle`，由外层 HomeTabView 通过
 *   grid-layout-plus 的 drag-allow-from 限定为唯一拖拽触发点，
 *   这样卡片正文/标题栏不会误触发拖拽
 */
interface Props {
  /** 标题 */
  title: string
  /** Material icon 名 */
  icon?: string
  /** 图标颜色 */
  iconColor?: string
  /** 是否处于编辑模式 */
  editMode?: boolean
}

defineProps<Props>()
const emit = defineEmits<{
  (e: 'remove'): void
}>()
</script>
