<template>
  <div
    v-if="contextMenu.visible"
    class="scene-context-menu"
    :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    @click.stop
  >
    <div
      v-if="contextMenu.mergeScenes.length > 0"
      class="context-menu-item-wrapper"
      @mouseenter="showMergeSubMenu = true"
      @mouseleave="handleMenuWrapperLeave"
    >
      <div class="context-menu-item">
        <span class="menu-icon">🔗</span>
        <span>合并片段</span>
        <span class="submenu-arrow">▶</span>
      </div>
      <div
        v-show="showMergeSubMenu"
        class="context-submenu"
        :style="{ left: '100%', top: '0' }"
      >
        <div
          v-for="mergeScene in contextMenu.mergeScenes"
          :key="mergeScene.id"
          class="context-menu-item"
          @click="handleMergeScenes(mergeScene)"
        >
          <span class="menu-icon">🎬</span>
          <span>{{ mergeScene.title }}</span>
          <span class="menu-time">{{ mergeScene.timeRange }}</span>
        </div>
      </div>
    </div>

    <div
      v-if="contextMenu.scene?.isMerged"
      class="context-menu-item"
      @click="handleUnmergeScene"
    >
      <span class="menu-icon">✂️</span>
      <span>取消合并</span>
    </div>

    <div class="context-menu-divider" v-if="contextMenu.mergeScenes.length > 0 || contextMenu.scene?.isMerged"></div>

    <div
      v-if="contextMenu.scene?.isMerged"
      class="context-menu-item"
      @click="handleExportMergedScene"
    >
      <span class="menu-icon">🔗</span>
      <span>导出合并片段</span>
    </div>

    <div
      v-if="!contextMenu.scene?.isMerged"
      class="context-menu-item"
      @click="handleExportSingleScene"
    >
      <span class="menu-icon">📦</span>
      <span>导出此片段</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ContextMenuState } from '../types'

defineProps<{
  contextMenu: ContextMenuState
  showMergeSubMenu: boolean
  handleMenuWrapperLeave: (event: MouseEvent) => void
  handleMergeScenes: (targetScene: { id: string; title: string; timeRange: string }) => void
  handleUnmergeScene: () => void
  handleExportMergedScene: () => void
  handleExportSingleScene: () => void
}>()
</script>

<style scoped>
.scene-context-menu {
  position: fixed;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  min-width: 160px;
  padding: 4px 0;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.context-menu-item-wrapper {
  position: relative;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: #1f2937;
  transition: background 0.15s ease;
  position: relative;
}

.context-menu-item:hover {
  background: #f3f4f6;
}

.context-menu-item .menu-icon {
  font-size: 16px;
  width: 20px;
}

.context-menu-item .submenu-arrow {
  margin-left: auto;
  font-size: 10px;
  color: #9ca3af;
}

.context-menu-item .menu-time {
  margin-left: auto;
  font-size: 11px;
  color: #9ca3af;
}

.context-menu-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 4px 0;
}

.context-submenu {
  position: absolute;
  left: 100%;
  top: -4px;
  margin-left: 0;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 10001;
  min-width: 200px;
  padding: 4px 0;
  animation: fadeIn 0.15s ease;
}

.context-menu-item-wrapper::after {
  content: '';
  position: absolute;
  right: -4px;
  top: 8px;
  bottom: 8px;
  width: 8px;
  z-index: 10002;
}
</style>
