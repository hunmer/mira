<template>
  <div class="home-dashboard flex h-full flex-col bg-background">
    <!-- 顶部工具栏 -->
    <div class="dashboard-toolbar flex items-center justify-between border-b px-4 py-2">
      <div class="flex items-center gap-2 text-sm font-medium">
        <span class="material-icons text-base text-primary">dashboard</span>
        <span>仪表盘</span>
      </div>
      <div class="flex items-center gap-1">
        <div ref="addMenuRef" class="relative">
          <button
            class="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
            @click="addMenuOpen = !addMenuOpen"
          >
            <span class="material-icons text-base">add</span>
            <span class="hidden sm:inline">添加卡片</span>
          </button>
          <!-- 下拉菜单 -->
          <Transition name="dashboard-menu">
            <div
              v-if="addMenuOpen"
              class="dashboard-add-menu absolute right-0 z-50 mt-1 w-72 overflow-hidden rounded-lg border bg-popover shadow-lg"
            >
              <div class="border-b px-3 py-2 text-xs text-muted-foreground">添加卡片</div>
              <div class="max-h-72 overflow-y-auto py-1">
                <button
                  v-for="def in menuCards"
                  :key="def.type"
                  class="flex w-full items-start gap-3 px-3 py-2 text-left transition-colors hover:bg-accent"
                  @click="onAddCard(def.type)"
                >
                  <span
                    class="material-icons mt-0.5 text-lg"
                    :style="{ color: def.iconColor || 'var(--primary)' }"
                  >
                    {{ def.icon || 'extension' }}
                  </span>
                  <span class="flex-1 overflow-hidden">
                    <span class="block truncate text-sm font-medium">{{ def.title }}</span>
                    <span v-if="def.description" class="block truncate text-xs text-muted-foreground">
                      {{ def.description }}
                    </span>
                  </span>
                </button>
                <div v-if="menuCards.length === 0" class="px-3 py-4 text-center text-xs text-muted-foreground">
                  暂无可添加的卡片
                </div>
              </div>

              <!-- 打开小组件配置窗口 -->
              <div class="border-t border-border">
                <div class="border-b px-3 py-2 text-xs text-muted-foreground">小组件配置</div>
                <div class="max-h-60 overflow-y-auto py-1">
                  <button
                    v-for="entry in configurableCards"
                    :key="entry.id"
                    class="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent"
                    @click="onOpenConfig(entry.id)"
                  >
                    <span
                      class="material-icons mt-0.5 text-lg"
                      :style="{ color: entry.iconColor || 'var(--primary)' }"
                    >
                      {{ entry.icon || 'tune' }}
                    </span>
                    <span class="flex-1 overflow-hidden">
                      <span class="block truncate text-sm font-medium">{{ entry.title }}</span>
                      <span class="block truncate text-xs text-muted-foreground">点击配置此小组件</span>
                    </span>
                    <span class="material-icons ml-auto text-base text-muted-foreground">tune</span>
                  </button>
                  <div
                    v-if="configurableCards.length === 0"
                    class="px-3 py-4 text-center text-xs text-muted-foreground"
                  >
                    暂无可配置的小组件
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 编辑模式切换 -->
        <button
          class="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors"
          :class="
            editMode
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground'
          "
          @click="editMode = !editMode"
        >
          <span class="material-icons text-base">{{ editMode ? 'check' : 'edit' }}</span>
          <span class="hidden sm:inline">{{ editMode ? '完成' : '编辑' }}</span>
        </button>
      </div>
    </div>

    <!-- 布局切换条 -->
    <div class="dashboard-layouts-bar flex items-center gap-1 overflow-x-auto border-b px-3 py-1.5">
      <div
        v-for="layout in store.layouts"
        :key="layout.id"
        class="dashboard-layout-chip group flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
        :class="
          layout.id === store.activeId
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        "
        @click="store.switchLayout(layout.id)"
      >
        <span class="material-icons text-sm">{{ layout.icon || 'dashboard' }}</span>
        <span class="max-w-[10rem] truncate">{{ layout.name }}</span>
        <!-- 默认布局标记（不可删除） -->
        <span
          v-if="store.isDefaultLayout(layout.id)"
          class="material-icons text-[10px] text-muted-foreground/60"
          title="默认布局（不可删除）"
        >
          lock
        </span>
        <!-- 右侧操作（hover 显示） -->
        <span class="flex items-center" @click.stop>
          <button
            class="ml-0.5 flex h-4 w-4 items-center justify-center rounded text-muted-foreground/70 opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
            title="重命名"
            @click="openLayoutDialog('edit', layout.id)"
          >
            <span class="material-icons text-xs">edit</span>
          </button>
          <button
            v-if="!store.isDefaultLayout(layout.id)"
            class="ml-0.5 flex h-4 w-4 items-center justify-center rounded text-muted-foreground/70 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
            title="删除布局"
            @click="openDeleteConfirm(layout.id)"
          >
            <span class="material-icons text-xs">close</span>
          </button>
        </span>
      </div>

      <!-- 新建布局 -->
      <button
        class="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="新建布局"
        @click="openLayoutDialog('create')"
      >
        <span class="material-icons text-sm">add</span>
        <span class="hidden sm:inline">新建布局</span>
      </button>
    </div>

    <!-- 空状态 -->
    <div
      v-if="store.renderableLayout.length === 0"
      class="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground"
    >
      <span class="material-icons text-5xl">dashboard_customize</span>
      <p class="text-sm">还没有任何卡片，点击右上角「添加卡片」开始自定义你的仪表盘</p>
      <button
        v-if="menuCards.length > 0"
        class="mt-2 flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
        @click="addMenuOpen = true"
      >
        <span class="material-icons text-base">add</span>
        添加卡片
      </button>
    </div>

    <!-- 网格布局 -->
    <div v-else class="dashboard-grid-scroll flex-1 overflow-auto p-3">
      <GridLayout
        :key="store.activeId || 'active'"
        :layout="store.renderableLayout"
        :col-num="12"
        :row-height="60"
        :gap="[12, 12]"
        :is-draggable="editMode"
        :is-resizable="editMode"
        :collision-mode="'push'"
        :resize-config="resizeConfig"
        @update:layout="onLayoutUpdate"
      >
        <GridItem
          v-for="item in store.renderableLayout"
          :key="item.i"
          :i="item.i"
          drag-allow-from=".dashboard-drag-handle"
        >
          <DashboardCardShell
            :edit-mode="editMode"
            :title="cardTitle(item.i)"
            :icon="cardIcon(item.i)"
            :icon-color="cardIconColor(item.i)"
            :configurable="cardConfigurable(item.i)"
            @remove="store.removeCard(String(item.i))"
            @config="onOpenConfig(String(item.i))"
          >
            <template #body>
              <div class="dashboard-card-body h-full">
                <component
                  :is="cardComponent(item.i)"
                  v-if="cardComponent(item.i)"
                  :key="cardInstanceKey(item.i)"
                  v-bind="cardProps(item.i)"
                  :config="store.getConfig(item.i)"
                />
                <div v-else class="flex h-full items-center justify-center text-xs text-muted-foreground">
                  卡片组件未注册
                </div>
              </div>
            </template>
          </DashboardCardShell>
        </GridItem>
      </GridLayout>
    </div>

    <!-- 小组件配置窗口 -->
    <CardConfigDialog v-model="configDialogOpen" :instance-id="configTargetId" />

    <!-- 布局 新增/编辑 对话框 -->
    <LayoutDialog v-model="layoutDialogOpen" :mode="layoutDialogMode" :layout-id="layoutDialogTargetId" />

    <!-- 删除布局确认对话框 -->
    <AlertDialog :open="deleteDialogOpen" @update:open="deleteDialogOpen = $event">
      <AlertDialogContent class="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除布局</AlertDialogTitle>
          <AlertDialogDescription>
            <template v-if="deleteTargetLayout">
              确定要删除布局「{{ deleteTargetLayout.name }}」吗？
              <span v-if="deleteTargetLayout.layout.length > 0">
                该布局下的 {{ deleteTargetLayout.layout.length }} 个小组件将一并删除。
              </span>
              此操作不可撤销。
            </template>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-white hover:bg-destructive/90"
            @click="confirmDeleteLayout"
          >
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { GridLayout, GridItem } from 'grid-layout-plus'
import type { ReadonlyLayout, ResizeConfig } from 'grid-layout-plus'
import { useDashboardLayoutStore } from '@renderer/stores/dashboardLayout'
import { cardRegistry } from './dashboard/CardRegistry'
import { registerBuiltinCards } from './dashboard/cards'
import DashboardCardShell from './dashboard/DashboardCardShell.vue'
import CardConfigDialog from './dashboard/CardConfigDialog.vue'
import LayoutDialog from './dashboard/LayoutDialog.vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Props {
  tabId?: string
  libraryId?: string
}

withDefaults(defineProps<Props>(), {
  tabId: 'home',
})

/** 注册内置卡片（幂等） */
registerBuiltinCards()

const store = useDashboardLayoutStore()
const editMode = ref(false)

/**
 * 缩放手柄配置：默认 8 个方向（四条边 + 四个角）都可起缩放。
 * 单个 LayoutItem 可通过 resizeHandles 字段覆盖（限制为部分方向）。
 */
const resizeConfig: ResizeConfig = {
  handles: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'],
}

/** 添加卡片下拉菜单 */
const addMenuOpen = ref(false)
const addMenuRef = ref<HTMLElement | null>(null)

/** 菜单中可见的卡片定义 */
const menuCards = computed(() => cardRegistry.getMenuVisible())

/** 根据 instanceId 取 CardDefinition */
function defOf(instanceId: string | number) {
  const meta = store.getMeta(String(instanceId))
  return meta ? cardRegistry.get(meta.type) : null
}

function cardComponent(instanceId: string | number) {
  return defOf(instanceId)?.component ?? null
}
function cardTitle(instanceId: string | number) {
  return defOf(instanceId)?.title ?? '卡片'
}
function cardIcon(instanceId: string | number) {
  return defOf(instanceId)?.icon ?? 'extension'
}
function cardIconColor(instanceId: string | number) {
  return defOf(instanceId)?.iconColor
}
function cardProps(instanceId: string | number) {
  return store.getMeta(String(instanceId))?.props ?? {}
}
/** 卡片是否支持配置（决定 shell 是否显示齿轮按钮） */
function cardConfigurable(instanceId: string | number) {
  const def = defOf(instanceId)
  return !!(def && cardRegistry.hasConfig(def.type))
}
/**
 * 卡片实例的渲染 key：把配置序列化进去，使相册这类依赖配置重建插件的卡片
 * 在配置变更后整体重建（embla 插件实例无法热更新）。
 */
function cardInstanceKey(instanceId: string | number) {
  const cfg = store.getConfig(instanceId)
  return `${instanceId}__${JSON.stringify(cfg)}`
}

/** 菜单「小组件配置」区域：列出当前已存在且支持配置的卡片实例 */
const configurableCards = computed(() => {
  const out: Array<{ id: string; title: string; icon?: string; iconColor?: string }> = []
  for (const item of store.renderableLayout) {
    const id = String(item.i)
    const def = defOf(id)
    if (def && cardRegistry.hasConfig(def.type)) {
      out.push({ id, title: def.title, icon: def.icon, iconColor: def.iconColor })
    }
  }
  return out
})

/** 配置对话框状态 */
const configDialogOpen = ref(false)
const configTargetId = ref<string | undefined>(undefined)
function onOpenConfig(instanceId: string) {
  addMenuOpen.value = false
  configTargetId.value = instanceId
  configDialogOpen.value = true
}

/** 添加卡片 */
async function onAddCard(type: string) {
  addMenuOpen.value = false
  await store.addCard(type)
  // 添加后自动进入编辑模式，方便调整位置
  if (!editMode.value) editMode.value = true
}

/** 布局（layout）对话框状态 */
const layoutDialogOpen = ref(false)
const layoutDialogMode = ref<'create' | 'edit'>('create')
const layoutDialogTargetId = ref<string | undefined>(undefined)

function openLayoutDialog(mode: 'create' | 'edit', layoutId?: string) {
  // 阻止冒泡到布局 chip 的 click（切换激活），避免打开对话框时同时切走
  layoutDialogMode.value = mode
  layoutDialogTargetId.value = layoutId
  layoutDialogOpen.value = true
}

/** 删除布局确认对话框状态 */
const deleteDialogOpen = ref(false)
const deleteTargetId = ref<string | undefined>(undefined)
/** 当前要删除的布局对象（用于对话框文案展示） */
const deleteTargetLayout = computed(() =>
  deleteTargetId.value ? store.layouts.find((l) => l.id === deleteTargetId.value) : null,
)

/**
 * 打开删除确认对话框。
 * 默认布局不会显示删除按钮，此处仍做一道防御：默认布局直接忽略。
 */
function openDeleteConfirm(layoutId: string) {
  if (store.isDefaultLayout(layoutId)) return
  deleteTargetId.value = layoutId
  deleteDialogOpen.value = true
}

/** 确认删除：执行 store.removeLayout 并关闭对话框 */
async function confirmDeleteLayout() {
  if (!deleteTargetId.value) return
  await store.removeLayout(deleteTargetId.value)
  deleteDialogOpen.value = false
  deleteTargetId.value = undefined
}

/** 布局更新（拖拽/缩放）：v2 的 update:layout 携带 (layout, meta)，这里只需 layout */
function onLayoutUpdate(next: ReadonlyLayout) {
  store.applyLayout(next)
}

/** 点击外部关闭菜单 */
function onDocClick(e: MouseEvent) {
  if (!addMenuRef.value) return
  if (!addMenuRef.value.contains(e.target as Node)) addMenuOpen.value = false
}

/** 按 Esc 退出编辑模式 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (addMenuOpen.value) addMenuOpen.value = false
    else if (editMode.value) editMode.value = false
  }
}

onMounted(async () => {
  await store.load()
  // 默认无卡片时，自动放一张「一言」卡片，方便首次体验
  await nextTick()
  if (store.renderableLayout.length === 0 && cardRegistry.has('hitokoto')) {
    await store.addCard('hitokoto', { x: 0, y: 0 })
  }
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style>
/*
 * grid-layout-plus v2 已在 main.ts 引入 style.css，自带 .vgl-layout / .vgl-item /
 * .vgl-item__resizer 等定位与缩放手柄样式。这里只补充与本项目视觉风格相关的少量覆盖。
 */

/* 拖拽中的卡片加深阴影，增强反馈 */
.home-dashboard .vgl-item.vgl-item--dragging {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}

/* 下拉菜单过渡 */
.dashboard-menu-enter-active,
.dashboard-menu-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.dashboard-menu-enter-from,
.dashboard-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
