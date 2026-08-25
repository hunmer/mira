<script setup lang="ts">
/**
 * SidebarModuleSection —— 侧边栏模块统一折叠外壳。
 *
 * Collapsible + 统一标题栏（模块图标 + 标题 + 折叠 chevron）：
 *   - #headerActions 插槽：模块专属操作按钮组（SidebarHeaderActions）
 *   - 默认插槽：模块内容（section-body）
 * 由原 SidebarModuleList 拆出，逻辑零改动。
 */
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'

defineOptions({ name: 'SidebarModuleSection' })

defineProps<{
  /** material icon name */
  icon: string
  /** 已翻译的模块标题 */
  title: string
  open: boolean
}>()

const emit = defineEmits<{ 'update:open': [open: boolean] }>()
</script>

<template>
  <Collapsible :open="open" class="sidebar-section" @update:open="emit('update:open', $event)">
    <!-- 统一标题栏（模块图标 + 标题 + 操作按钮 + 折叠手柄） -->
    <CollapsibleTrigger as-child>
      <header class="section-header">
        <span class="material-icons title-icon">{{ icon }}</span>
        <h2 class="section-title">{{ title }}</h2>
        <span class="material-icons chevron" :class="{ 'chevron--open': open }">expand_more</span>
        <slot name="headerActions" />
      </header>
    </CollapsibleTrigger>
    <CollapsibleContent class="section-body">
      <slot />
    </CollapsibleContent>
  </Collapsible>
</template>

<style scoped>
.sidebar-section {
  /* 与原 FolderTreeComponent 间距保持一致 */
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  user-select: none;
  border-radius: 0.5rem 0.5rem 0 0;
  background: var(--primary);
  color: var(--primary-foreground);
  transition: filter 0.15s ease;
}

.section-header:hover {
  filter: brightness(0.95);
}

/* 折叠态：四角圆角（无内容衔接，恢复完整圆角） */
.section-header[data-state="closed"] {
  border-radius: 0.5rem;
}

.section-header .chevron {
  order: 99;
  margin-left: auto;
  font-size: 18px;
  color: var(--primary-foreground);
  transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
  transform-origin: center center;
  transform: rotate(-90deg);
}

.section-header .chevron--open {
  transform: rotate(0deg);
}

.section-header .title-icon {
  font-size: 16px;
  color: var(--primary-foreground);
}

.section-title {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary-foreground);
  line-height: 1.25rem;
}

/* 桌面端：hover 模块标题时才显示操作按钮（搜索激活 / 键盘聚焦时保持可见）；移动端始终显示。
   header-actions 由父级经插槽传入，需 :deep 穿透 scoped 作用域。 */
@media (min-width: 768px) {
  :deep(.header-actions) {
    opacity: 0;
    pointer-events: none;
    transition: opacity 150ms ease;
  }

  .section-header:hover :deep(.header-actions),
  .section-header:focus-within :deep(.header-actions),
  :deep(.header-actions:has(.text-primary)) {
    opacity: 1;
    pointer-events: auto;
  }
}

.section-body {
  padding-left: 0.125rem;
}
</style>
