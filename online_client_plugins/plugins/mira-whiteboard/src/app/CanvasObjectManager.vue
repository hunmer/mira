<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorContext, useQuery } from '@woven-canvas/vue'
import {
  Block,
  Camera,
  cascadeDelete,
  deselectAll,
  Frame,
  Screen,
  selectBlock,
  Synced,
} from '@woven-canvas/core'

interface CanvasNodeItem {
  entityId: number
  type: string
  typeLabel: string
  icon: string
  frameLabel: string
}

const TYPE_INFO: Record<string, { label: string; icon: string }> = {
  'arc-arrow': { label: '弧形箭头', icon: 'trending_flat' },
  'elbow-arrow': { label: '折线箭头', icon: 'turn_right' },
  embed: { label: '嵌入内容', icon: 'code' },
  frame: { label: 'Frame', icon: 'filter_center_focus' },
  image: { label: '图片', icon: 'image' },
  'pen-stroke': { label: '画笔', icon: 'gesture' },
  shape: { label: '形状', icon: 'category' },
  'sticky-note': { label: '便签', icon: 'sticky_note_2' },
  tape: { label: '胶带', icon: 'sell' },
  text: { label: '文字', icon: 'title' },
}

const { nextEditorTick } = useEditorContext()
// Synced is queryable at runtime but its base ECS definition is narrower than useQuery's public type.
const syncedQueryComponent = Synced as unknown as typeof Block
const blocks = useQuery([Block, syncedQueryComponent] as const)
const frames = useQuery([Block, Frame, syncedQueryComponent] as const)
const sidebarOpen = ref(false)
const sidebarRef = ref<HTMLElement | null>(null)

const nodes = computed<CanvasNodeItem[]>(() => {
  const blockMap = new Map(blocks.value.map((item) => [item.entityId, item.block.value]))
  const frameLabelMap = new Map(frames.value.map((item) => [
    item.entityId,
    item.frame.value.label || `Frame #${item.entityId}`,
  ]))

  function resolveFrameLabel(parentId: number | null) {
    const visited = new Set<number>()
    let currentId = parentId
    while (currentId !== null && !visited.has(currentId)) {
      visited.add(currentId)
      if (frameLabelMap.has(currentId)) return frameLabelMap.get(currentId)!
      currentId = blockMap.get(currentId)?.parentId ?? null
    }
    return '画布根级'
  }

  return blocks.value
    .map((item) => {
      const block = item.block.value
      const info = TYPE_INFO[block.tag] || { label: block.tag || '未知类型', icon: 'widgets' }
      return {
        entityId: item.entityId,
        type: block.tag,
        typeLabel: info.label,
        icon: info.icon,
        frameLabel: resolveFrameLabel(block.parentId),
      }
    })
    .sort((a, b) => a.frameLabel.localeCompare(b.frameLabel) || a.typeLabel.localeCompare(b.typeLabel) || a.entityId - b.entityId)
})

function focusNode(entityId: number) {
  nextEditorTick((ctx) => {
    const corners = Block.getCorners(ctx, entityId)
    const xs = corners.map((point) => point[0])
    const ys = corners.map((point) => point[1])
    const left = Math.min(...xs)
    const right = Math.max(...xs)
    const top = Math.min(...ys)
    const bottom = Math.max(...ys)
    const screen = Screen.read(ctx)
    const panelWidth = sidebarRef.value?.getBoundingClientRect().width || 320
    const visibleWidth = Math.max(240, screen.width - panelWidth)
    const contentWidth = Math.max(1, right - left)
    const contentHeight = Math.max(1, bottom - top)
    const zoom = Math.min(1.5, Math.max(0.05, Math.min(
      visibleWidth / (contentWidth + 96),
      screen.height / (contentHeight + 96),
    )))
    const camera = Camera.write(ctx)
    camera.zoom = zoom
    camera.left = (left + right) / 2 - visibleWidth / zoom / 2
    camera.top = (top + bottom) / 2 - screen.height / zoom / 2
    deselectAll(ctx)
    selectBlock(ctx, entityId)
  })
}

function deleteNode(entityId: number) {
  nextEditorTick((ctx) => {
    deselectAll(ctx)
    cascadeDelete(ctx, entityId)
  })
}
</script>

<template>
  <button
    type="button"
    class="wb-object-manager-toggle"
    :class="{ open: sidebarOpen }"
    title="对象管理"
    :aria-expanded="sidebarOpen"
    aria-controls="wb-object-manager-sidebar"
    @click="sidebarOpen = !sidebarOpen"
  >
    <span class="material-icons">account_tree</span>
  </button>

  <Transition name="wb-object-manager-slide">
    <aside
      v-if="sidebarOpen"
      id="wb-object-manager-sidebar"
      ref="sidebarRef"
      class="wb-object-manager-sidebar"
      aria-label="对象管理"
    >
      <header class="wb-object-manager-header">
        <div>
          <strong>对象管理</strong>
          <span>{{ nodes.length }} 个节点</span>
        </div>
        <button type="button" title="关闭" @click="sidebarOpen = false">
          <span class="material-icons">close</span>
        </button>
      </header>

      <div class="wb-object-manager-list">
        <div v-if="nodes.length === 0" class="wb-object-manager-empty">
          <span class="material-icons">inventory_2</span>
          <span>当前画布没有对象</span>
        </div>

        <div
          v-for="node in nodes"
          :key="node.entityId"
          class="wb-object-manager-item"
          role="button"
          tabindex="0"
          :title="`聚焦 ${node.typeLabel} #${node.entityId}`"
          @click="focusNode(node.entityId)"
          @keydown.enter.prevent="focusNode(node.entityId)"
          @keydown.space.prevent="focusNode(node.entityId)"
        >
          <span class="material-icons wb-object-manager-type-icon">{{ node.icon }}</span>
          <div class="wb-object-manager-item-info">
            <strong>{{ node.typeLabel }} #{{ node.entityId }}</strong>
            <span :title="node.frameLabel">
              <span class="material-icons">filter_center_focus</span>
              {{ node.frameLabel }}
            </span>
          </div>
          <button
            type="button"
            class="wb-object-manager-delete"
            :title="`删除 ${node.typeLabel} #${node.entityId}`"
            @click.stop="deleteNode(node.entityId)"
          >
            <span class="material-icons">delete_outline</span>
          </button>
        </div>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.wb-object-manager-toggle {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 31;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid #e1e4e8;
  border-radius: 7px;
  color: #4b5563;
  background: #fff;
  box-shadow: 0 2px 8px rgba(20, 24, 32, 0.12);
  cursor: pointer;
  transition: right 0.18s ease, color 0.15s, background 0.15s;
}
.wb-object-manager-toggle:hover,
.wb-object-manager-toggle.open {
  color: #4f46e5;
  background: #eef2ff;
}
.wb-object-manager-toggle.open { right: min(332px, calc(100vw - 44px)); }
.wb-object-manager-toggle .material-icons { font-size: 20px; }

.wb-object-manager-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 30;
  width: min(320px, calc(100vw - 56px));
  height: 100vh;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e2e4e9;
  background: #fff;
  box-shadow: -8px 0 24px rgba(20, 24, 32, 0.12);
}
.wb-object-manager-header {
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px 0 16px;
  border-bottom: 1px solid #eceef2;
}
.wb-object-manager-header > div { display: grid; gap: 2px; }
.wb-object-manager-header strong { color: #20232a; font-size: 14px; }
.wb-object-manager-header > div > span { color: #8a9099; font-size: 11px; }
.wb-object-manager-header button,
.wb-object-manager-delete {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  flex: 0 0 32px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  color: #7a818c;
  background: transparent;
  cursor: pointer;
}
.wb-object-manager-header button:hover { color: #30343b; background: #f1f2f4; }
.wb-object-manager-header .material-icons,
.wb-object-manager-delete .material-icons { font-size: 18px; }
.wb-object-manager-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
}
.wb-object-manager-item {
  min-height: 58px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 6px 7px 10px;
  border-radius: 6px;
  outline: none;
  cursor: pointer;
}
.wb-object-manager-item:hover,
.wb-object-manager-item:focus-visible { background: #f4f5f7; }
.wb-object-manager-type-icon {
  width: 28px;
  color: #596170;
  font-size: 20px;
  text-align: center;
}
.wb-object-manager-item-info {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 4px;
}
.wb-object-manager-item-info strong {
  overflow: hidden;
  color: #25282e;
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wb-object-manager-item-info > span {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  color: #858c96;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wb-object-manager-item-info .material-icons { flex: 0 0 auto; font-size: 13px; }
.wb-object-manager-delete { opacity: 0.58; }
.wb-object-manager-item:hover .wb-object-manager-delete,
.wb-object-manager-item:focus-within .wb-object-manager-delete { opacity: 1; }
.wb-object-manager-delete:hover { color: #dc2626; background: #feecec; }
.wb-object-manager-empty {
  height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #9aa0a9;
  font-size: 12px;
}
.wb-object-manager-empty .material-icons { font-size: 30px; }
.wb-object-manager-slide-enter-active,
.wb-object-manager-slide-leave-active { transition: transform 0.18s ease, opacity 0.18s ease; }
.wb-object-manager-slide-enter-from,
.wb-object-manager-slide-leave-to { transform: translateX(100%); opacity: 0; }

@media (max-width: 480px) {
  .wb-object-manager-toggle.open { display: none; }
}
</style>
