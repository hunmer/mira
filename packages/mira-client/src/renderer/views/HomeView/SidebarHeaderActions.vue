<script setup lang="ts">
/**
 * SidebarHeaderActions —— 侧边栏模块标题栏操作按钮组（搜索 / 添加 / 管理等）。
 *
 * 按钮以配置数组由父级传入；桌面端 hover 显隐由 SidebarModuleSection 的媒体查询控制。
 * 由原 SidebarModuleList 拆出，逻辑零改动。
 */
defineOptions({ name: 'SidebarHeaderActions' })

export interface SidebarHeaderActionButton {
  icon: string
  title: string
  /** 激活态高亮（如搜索开启时） */
  active?: boolean
  onClick: () => void
}

defineProps<{ buttons: SidebarHeaderActionButton[] }>()
</script>

<template>
  <div class="header-actions" @click.stop>
    <button
      v-for="btn in buttons"
      :key="btn.title"
      class="header-action-btn"
      :class="{ 'text-primary': btn.active }"
      :title="btn.title"
      @click="btn.onClick"
    >
      <span class="material-icons leading-none" style="font-size: 18px">{{ btn.icon }}</span>
    </button>
  </div>
</template>

<style scoped>
/* 操作按钮组（搜索 / 添加）—— 与 FolderTreeComponent 自带标题栏风格一致 */
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  margin-left: auto;
}

.header-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  color: var(--primary-foreground);
  border-radius: 0.25rem;
  transition: transform 160ms ease-out;
}

.header-action-btn:hover {
  color: var(--primary-foreground);
  background: color-mix(in oklch, var(--primary-foreground) 15%, transparent);
}

/* 搜索激活态：在 primary 背景上用亮色高亮（覆盖全局 .text-primary） */
.header-action-btn.text-primary {
  color: var(--primary-foreground);
  background: color-mix(in oklch, var(--primary-foreground) 25%, transparent);
}

.header-action-btn:active {
  transform: scale(0.9);
}
</style>
