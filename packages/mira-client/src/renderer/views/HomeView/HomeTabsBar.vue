<script setup lang="ts">
/**
 * HomeView 的 Tabs 条：返回按钮 + 活动标签 + 右键菜单。
 * 活动标签 / 关闭 / 切换等数据与逻辑由 index.vue 通过 props 注入，
 * 共享 layoutId="home-active-tab" 的激活态指示器在本组件内渲染。
 */
import { ref, watch, nextTick, computed } from 'vue'
import { Motion, LayoutGroup } from 'motion-v'
import { useSettingsStore } from '@renderer/stores/settings'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import type { TabItem } from '@renderer/composables'
import type { HomeSplitLayout } from './homeSplitLayout'

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
  canActivateLastTab: boolean
  onActivateLastTab: () => void
  onSwitchTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onContextMenu: (tab: TabItem, event: MouseEvent) => void
  onReorderTabs?: (fromTabId: string, toTabId: string) => void
  onActiveTabIdChange?: (activeTabId: string | undefined) => void
  onToggleLeftSidebar?: () => void
  leftSidebarOpen?: boolean
  splitLayout: HomeSplitLayout
  onSplitLayoutChange: (layout: HomeSplitLayout) => void
}>()

const splitLayouts: Array<{ id: HomeSplitLayout; icon: string; labelKey: string }> = [
  { id: 'single', icon: 'crop_square', labelKey: 'single' },
  { id: 'two-columns', icon: 'vertical_split', labelKey: 'twoColumns' },
  { id: 'four-grid', icon: 'grid_view', labelKey: 'fourGrid' },
  { id: 'three-columns', icon: 'view_column', labelKey: 'threeColumns' },
  { id: 'three-rows', icon: 'view_stream', labelKey: 'threeRows' },
]

const draggingTabId = ref<string>()
const dragOverTabId = ref<string>()
const failedIconUrls = ref(new Map<string, string>())
const settingsStore = useSettingsStore()
// 是否展示 tab 图标（设置面板「展示 tab 图标」）
const showTabIcons = computed(() => settingsStore.settings.showTabIcons)

function isImageIcon(tab: TabItem) {
  return /^(https?|site-icon):\/\//i.test(tab.icon) && failedIconUrls.value.get(tab.id) !== tab.icon
}

function handleIconError(tab: TabItem) {
  const next = new Map(failedIconUrls.value)
  next.set(tab.id, tab.icon)
  failedIconUrls.value = next
}

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

function handleDragStart(tab: TabItem, event: DragEvent) {
  if (tab.type === 'home' || !props.onReorderTabs || !event.dataTransfer) {
    event.preventDefault()
    return
  }
  draggingTabId.value = tab.id
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', tab.id)
}

function handleDragOver(tab: TabItem, event: DragEvent) {
  if (!draggingTabId.value || tab.type === 'home' || tab.id === draggingTabId.value) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  dragOverTabId.value = tab.id
}

function handleDrop(tab: TabItem, event: DragEvent) {
  event.preventDefault()
  const fromTabId = draggingTabId.value
  if (fromTabId && tab.type !== 'home' && fromTabId !== tab.id) {
    props.onReorderTabs?.(fromTabId, tab.id)
  }
  draggingTabId.value = undefined
  dragOverTabId.value = undefined
}

function handleDragEnd() {
  draggingTabId.value = undefined
  dragOverTabId.value = undefined
}
</script>

<template>
  <div class="flex h-full w-full min-w-0 items-end gap-0.5 me-1">
    <!-- 返回：激活上一次的 tab -->
    <div class="flex items-end gap-0.5 shrink-0 mr-1">
      <button
        :disabled="!props.canActivateLastTab"
        :title="props.canActivateLastTab ? $t('views.homeTabsBar.activateLastTab') : $t('views.homeTabsBar.noTabToReturn')"
        :class="[
          'h-6 w-8 flex items-center justify-center rounded-full transition-[color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
          props.canActivateLastTab
            ? 'text-muted-foreground hover:text-primary hover:bg-white/50 hover:backdrop-blur-xl active:scale-95'
            : 'text-muted-foreground/40 cursor-not-allowed'
        ]"
        @click="props.onActivateLastTab">
        <span class="material-icons text-xl">arrow_back</span>
      </button>
    </div>

    <div class="flex h-full min-w-0 flex-1">
      <ContextMenu>
        <ContextMenuTrigger as-child>
          <div ref="tabScrollContainer" class="flex min-w-0 flex-1 items-end gap-1 h-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <LayoutGroup id="home-tabs">
            <button v-for="tab in props.activeTabs" :key="tab.id" :data-active-tab="tab.active" :draggable="tab.type !== 'home' && !!props.onReorderTabs" :class="[
              'group relative flex items-center space-x-1 shrink-0 text-xs font-medium transition-colors duration-150',
              // 激活/非激活统一基础高度，差异化的背景交给下方共享 layoutId 指示器滑动
              tab.active
                ? 'z-10 -mb-px py-1 text-primary-foreground'
                : 'py-0.5 mb-0.5 text-muted-foreground hover:text-primary active:scale-[0.98]',
              // 无关闭按钮的 tab（如 home）右侧补足间距，使内容与可关闭 tab 视觉对齐
              (props.activeTabs.length > 1 && props.isTabClosable(tab.id))
                ? (tab.active ? 'px-2' : 'px-1.5')
                : (tab.active ? 'pl-2 pr-5' : 'pl-1.5 pr-5'),
              draggingTabId === tab.id ? 'opacity-50' : '',
              dragOverTabId === tab.id ? 'border-l-2 border-primary' : '',
              tab.type !== 'home' && props.onReorderTabs ? 'cursor-grab active:cursor-grabbing' : ''
            ]" @click="handleSwitchTab(tab)" @contextmenu="handleTabContextMenu(tab, $event)"
              @dragstart="handleDragStart(tab, $event)" @dragover="handleDragOver(tab, $event)"
              @drop="handleDrop(tab, $event)" @dragend="handleDragEnd">
              <!-- 激活态背景：共享 layoutId，切换 tab 时由 motion-v 在按钮间平滑滑动 -->
              <Motion v-if="tab.active" layoutId="home-active-tab"
                :transition="{ type: 'spring', stiffness: 400, damping: 32 }"
                class="absolute inset-0 z-0 rounded-t-lg border border-b-0 border-white/30 shadow-[0_-4px_16px_var(--shadow-primary-sm)]"
                :style="{ backgroundColor: tab.iconColor || 'var(--primary)' }" />
              <img v-if="showTabIcons && isImageIcon(tab)" :src="tab.icon" alt="" draggable="false"
                class="relative z-[1] h-3 w-3 shrink-0 rounded-sm object-contain" @error="handleIconError(tab)" />
              <span v-else-if="showTabIcons" class="relative z-[1] material-icons text-[12px] leading-none"
                :style="{ color: tab.active ? '#fff' : tab.iconColor }">
                {{ tab.icon }}
              </span>
              <span class="relative z-[1] truncate max-w-[120px]">{{ tab.label }}</span>
              <button v-if="props.activeTabs.length > 1 && props.isTabClosable(tab.id)"
                class="relative z-[1] rounded-full opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary/10 active:scale-90"
                style="line-height: 0;" @click.stop="props.onCloseTab(tab.id)">
                <span class="material-icons text-xs">close</span>
              </button>
            </button>
          </LayoutGroup>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem v-for="item in props.tabContextMenuItems" :key="item.label" @click="item.command?.()">
            {{ item.label }}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <button
          type="button"
          class="ml-auto mb-0.5 flex h-7 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/50 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          :title="$t('views.homeTabsBar.splitLayout')"
          :aria-label="$t('views.homeTabsBar.splitLayout')"
        >
          <span class="material-icons text-lg">view_quilt</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-44">
        <DropdownMenuItem
          v-for="layout in splitLayouts"
          :key="layout.id"
          class="gap-2"
          @select="props.onSplitLayoutChange(layout.id)"
        >
          <span class="material-icons text-base">{{ layout.icon }}</span>
          <span class="flex-1">{{ $t(`views.homeTabsBar.layouts.${layout.labelKey}`) }}</span>
          <span v-if="props.splitLayout === layout.id" class="material-icons text-sm text-primary">check</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
