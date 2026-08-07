<template>
  <div class="home-dashboard flex h-full flex-col bg-background">
    <!-- 顶部工具栏 -->
    <div class="dashboard-toolbar flex items-center justify-between border-b px-4 py-2">
      <div class="flex items-center gap-2 text-sm font-medium">
        <span class="material-icons text-base text-primary">dashboard</span>
        <span>仪表盘</span>
      </div>
      <div class="flex items-center gap-1">
        <!-- 添加卡片 -->
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
              class="dashboard-add-menu absolute right-0 z-50 mt-1 w-64 overflow-hidden rounded-lg border bg-popover shadow-lg"
            >
              <div class="border-b px-3 py-2 text-xs text-muted-foreground">选择要添加的卡片</div>
              <div class="max-h-80 overflow-y-auto py-1">
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
        :layout="store.renderableLayout"
        :col-num="12"
        :row-height="60"
        :gap="[12, 12]"
        :is-draggable="editMode"
        :is-resizable="editMode"
        :collision-mode="'push'"
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
            @remove="store.removeCard(String(item.i))"
          >
            <template #body>
              <div class="dashboard-card-body h-full">
                <component
                  :is="cardComponent(item.i)"
                  v-if="cardComponent(item.i)"
                  v-bind="cardProps(item.i)"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { GridLayout, GridItem } from 'grid-layout-plus'
import type { ReadonlyLayout } from 'grid-layout-plus'
import { useDashboardLayoutStore } from '@renderer/stores/dashboardLayout'
import { cardRegistry } from './dashboard/CardRegistry'
import { registerBuiltinCards } from './dashboard/cards'
import DashboardCardShell from './dashboard/DashboardCardShell.vue'

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

/** 添加卡片 */
async function onAddCard(type: string) {
  addMenuOpen.value = false
  await store.addCard(type)
  // 添加后自动进入编辑模式，方便调整位置
  if (!editMode.value) editMode.value = true
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
