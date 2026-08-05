<script setup lang="ts">
/**
 * HomeView 的 Tabs 条：返回按钮 + 活动标签 + 右键菜单。
 * 活动标签 / 关闭 / 切换等数据与逻辑由 index.vue 通过 props 注入，
 * 共享 layoutId="home-active-tab" 的激活态指示器在本组件内渲染。
 */
import { ref, watch, nextTick } from 'vue'
import { Motion, LayoutGroup } from 'motion-v'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu'
import type { TabItem } from '@renderer/composables'

interface TabContextMenuItem {
  label?: string
  icon?: string
  separator?: boolean
  disabled?: boolean
  command?: () => void
}

const props = defineProps<{
  activeTabs: TabItem[]
  tabContextMenuItems: TabContextMenuItem[]
  isTabClosable: (tabId: string) => boolean
  onActivateLastTab: () => void
  onSwitchTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onContextMenu: (tab: TabItem, event: MouseEvent) => void
  onActiveTabIdChange?: (activeTabId: string | undefined) => void
}>()

// Tab 条滚动容器：切换 tab 时自动滚动到可见位置
const tabScrollContainer = ref<HTMLElement>()
let lastActiveId: string | undefined
watch(
  () => props.activeTabs.find(t => t.active)?.id,
  (activeId) => {
    // 供父组件感知当前激活 tab（滚动等副作用）
    props.onActiveTabIdChange?.(activeId)
    if (activeId === lastActiveId) return
    lastActiveId = activeId
    nextTick(() => {
      const container = tabScrollContainer.value
      if (!container) return
      const active = container.querySelector('[data-active-tab="true"]') as HTMLElement | null
      active?.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' })
    })
  }
)

function handleSwitchTab(tab: TabItem) {
  if (tab.active) return
  props.onSwitchTab(tab.id)
}

function handleTabContextMenu(tab: TabItem, event: MouseEvent) {
  if (tab.type === 'home') {
    event.preventDefault()
    return
  }
  props.onContextMenu(tab, event)
}
</script>

<template>
  <div class="flex h-full items-end gap-0.5">
    <!-- 返回：激活上一次的 tab -->
    <div class="flex items-center gap-0.5 shrink-0 mb-0.5 mr-1">
      <button
        class="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-white/50 hover:backdrop-blur-xl transition-[color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-95"
        title="激活上一次的tab (Ctrl+Shift+Tab)" @click="props.onActivateLastTab">
        <span class="material-icons">arrow_back</span>
      </button>
    </div>

    <ContextMenu>
      <ContextMenuTrigger as-child>
        <LayoutGroup id="home-tabs">
          <div ref="tabScrollContainer" class="flex items-end gap-1 h-full">
            <button v-for="tab in props.activeTabs" :key="tab.id" :data-active-tab="tab.active" :class="[
              'group relative flex items-center space-x-1 shrink-0 text-xs font-medium transition-colors duration-150',
              // 激活/非激活统一基础高度，差异化的背景交给下方共享 layoutId 指示器滑动
              tab.active
                ? 'z-10 -mb-px py-1 text-primary-foreground'
                : 'py-0.5 mb-0.5 text-muted-foreground hover:text-primary active:scale-[0.98]',
              // 无关闭按钮的 tab（如 home）右侧补足间距，使内容与可关闭 tab 视觉对齐
              (props.activeTabs.length > 1 && props.isTabClosable(tab.id))
                ? (tab.active ? 'px-2' : 'px-1.5')
                : (tab.active ? 'pl-2 pr-5' : 'pl-1.5 pr-5')
            ]" @click="handleSwitchTab(tab)" @contextmenu="handleTabContextMenu(tab, $event)">
              <!-- 激活态背景：共享 layoutId，切换 tab 时由 motion-v 在按钮间平滑滑动 -->
              <Motion v-if="tab.active" layoutId="home-active-tab"
                :transition="{ type: 'spring', stiffness: 400, damping: 32 }"
                class="absolute inset-0 z-0 rounded-t-2xl border border-b-0 border-primary/60 bg-primary shadow-[0_-4px_16px_var(--shadow-primary-sm)]" />
              <span class="relative z-[1] material-icons text-[12px] leading-none"
                :style="{ color: tab.active ? undefined : tab.iconColor }">
                {{ tab.icon }}
              </span>
              <span class="relative z-[1] truncate max-w-[120px]">{{ tab.label }}</span>
              <button v-if="props.activeTabs.length > 1 && props.isTabClosable(tab.id)"
                class="relative z-[1] rounded-full opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary/10 active:scale-90"
                style="line-height: 0;" @click.stop="props.onCloseTab(tab.id)">
                <span class="material-icons text-xs">close</span>
              </button>
            </button>
          </div>
        </LayoutGroup>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem v-for="item in props.tabContextMenuItems" :key="item.label" @click="item.command?.()">
          {{ item.label }}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  </div>
</template>
