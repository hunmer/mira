<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FloatingMenuBar, MenuButton, MenuDropdown, useEditorContext, useQuery } from '@woven-canvas/vue'
import {
  addComponent,
  AssignFrameChildren,
  Block,
  createBlock,
  deselectAll,
  Frame,
  getChildren,
  RemoveBlock,
  selectBlock,
  Selected,
} from '@woven-canvas/core'

type Alignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'

interface AutoLayoutPreset {
  id: 'compact' | 'balanced' | 'row' | 'column'
  label: string
  description: string
}

const { nextEditorTick } = useEditorContext()
const selected = useQuery([Block, Selected] as const)
const isMultiSelection = computed(() => selected.value.length > 1)
const isSingleImage = computed(
  () => selected.value.length === 1 && selected.value[0].block.value.tag === 'image'
)
const isSingleFrame = computed(
  () => selected.value.length === 1 && selected.value[0].block.value.tag === 'frame'
)
const layoutRows = ref(1)
const layoutColumns = ref(1)
const layoutRowGap = ref(24)
const layoutColumnGap = ref(24)
const autoLayoutPresets: AutoLayoutPreset[] = [
  { id: 'compact', label: '紧凑网格', description: '8 px 间距' },
  { id: 'balanced', label: '均衡网格', description: '24 px 间距' },
  { id: 'row', label: '单行排列', description: '横向展开' },
  { id: 'column', label: '单列排列', description: '纵向展开' },
]

watch(
  () => selected.value.length,
  (count) => {
    if (count < 2) return
    layoutColumns.value = Math.ceil(Math.sqrt(count))
    layoutRows.value = Math.ceil(count / layoutColumns.value)
  },
  { immediate: true }
)

function getBounds(ctx: any, entityId: number) {
  const corners = Block.getCorners(ctx, entityId)
  const xs = corners.map((point) => point[0])
  const ys = corners.map((point) => point[1])
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  }
}

function clampInteger(value: number, min: number, max: number) {
  const normalized = Number.isFinite(value) ? Math.round(value) : min
  return Math.min(Math.max(normalized, min), max)
}

function updateRows() {
  const count = selected.value.length
  layoutRows.value = clampInteger(layoutRows.value, 1, count)
  layoutColumns.value = Math.ceil(count / layoutRows.value)
}

function updateColumns() {
  const count = selected.value.length
  layoutColumns.value = clampInteger(layoutColumns.value, 1, count)
  layoutRows.value = Math.ceil(count / layoutColumns.value)
}

function applyAutoLayout() {
  if (!isMultiSelection.value) return
  const columns = clampInteger(layoutColumns.value, 1, selected.value.length)
  const rowGap = clampInteger(layoutRowGap.value, 0, 500)
  const columnGap = clampInteger(layoutColumnGap.value, 0, 500)
  layoutColumns.value = columns
  layoutRows.value = Math.ceil(selected.value.length / columns)
  layoutRowGap.value = rowGap
  layoutColumnGap.value = columnGap

  nextEditorTick((ctx) => {
    const items = selected.value
      .map(({ entityId }) => ({ entityId, bounds: getBounds(ctx, entityId) }))
      .sort((a, b) => a.bounds.top - b.bounds.top || a.bounds.left - b.bounds.left)
    const left = Math.min(...items.map((item) => item.bounds.left))
    const top = Math.min(...items.map((item) => item.bounds.top))
    const rows = Math.ceil(items.length / columns)
    const columnWidths = Array.from({ length: columns }, () => 0)
    const rowHeights = Array.from({ length: rows }, () => 0)

    items.forEach((item, index) => {
      const row = Math.floor(index / columns)
      const column = index % columns
      columnWidths[column] = Math.max(columnWidths[column], item.bounds.width)
      rowHeights[row] = Math.max(rowHeights[row], item.bounds.height)
    })

    const columnLefts = columnWidths.map((_, index) => (
      left + columnWidths.slice(0, index).reduce((sum, width) => sum + width, 0) + columnGap * index
    ))
    const rowTops = rowHeights.map((_, index) => (
      top + rowHeights.slice(0, index).reduce((sum, height) => sum + height, 0) + rowGap * index
    ))

    items.forEach((item, index) => {
      const row = Math.floor(index / columns)
      const column = index % columns
      Block.translate(ctx, item.entityId, [
        columnLefts[column] - item.bounds.left,
        rowTops[row] - item.bounds.top,
      ])
    })
  })
}

function applyAutoLayoutPreset(preset: AutoLayoutPreset) {
  const count = selected.value.length
  const gridColumns = Math.ceil(Math.sqrt(count))

  if (preset.id === 'row') {
    layoutRows.value = 1
    layoutColumns.value = count
  } else if (preset.id === 'column') {
    layoutRows.value = count
    layoutColumns.value = 1
  } else {
    layoutColumns.value = gridColumns
    layoutRows.value = Math.ceil(count / gridColumns)
  }

  layoutRowGap.value = preset.id === 'compact' ? 8 : 24
  layoutColumnGap.value = preset.id === 'compact' ? 8 : 24
  applyAutoLayout()
}

function createFrameFromSelection() {
  if (!isMultiSelection.value) return
  nextEditorTick((ctx) => {
    const entityIds = selected.value.map((item) => item.entityId)
    const bounds = entityIds.map((entityId) => getBounds(ctx, entityId))
    const padding = 40
    const left = Math.min(...bounds.map((item) => item.left)) - padding
    const right = Math.max(...bounds.map((item) => item.right)) + padding
    const top = Math.min(...bounds.map((item) => item.top)) - padding
    const bottom = Math.max(...bounds.map((item) => item.bottom)) + padding
    const frameId = createBlock(ctx, {
      tag: 'frame',
      position: [left, top],
      size: [right - left, bottom - top],
    })
    addComponent(ctx, frameId, Frame, { label: 'Frame' })
    AssignFrameChildren.spawn(ctx, {
      assignments: entityIds.map((entityId) => ({ entityId, frameId })),
    })
    deselectAll(ctx)
    selectBlock(ctx, frameId)
  })
}

function releaseFrame() {
  if (!isSingleFrame.value) return
  const frameId = selected.value[0].entityId
  nextEditorTick((ctx) => {
    const childIds = getChildren(ctx, frameId)
    AssignFrameChildren.spawn(ctx, {
      assignments: childIds.map((entityId) => ({ entityId, frameId: null })),
    })
    RemoveBlock.spawn(ctx, { entityId: frameId })
    deselectAll(ctx)
    childIds.forEach((entityId) => selectBlock(ctx, entityId))
  })
}

function alignSelection(alignment: Alignment) {
  if (!isMultiSelection.value) return
  nextEditorTick((ctx) => {
    const items = selected.value.map(({ entityId }) => ({ entityId, bounds: getBounds(ctx, entityId) }))
    const selectionLeft = Math.min(...items.map((item) => item.bounds.left))
    const selectionRight = Math.max(...items.map((item) => item.bounds.right))
    const selectionTop = Math.min(...items.map((item) => item.bounds.top))
    const selectionBottom = Math.max(...items.map((item) => item.bounds.bottom))
    const selectionCenterX = (selectionLeft + selectionRight) / 2
    const selectionCenterY = (selectionTop + selectionBottom) / 2

    for (const item of items) {
      let dx = 0
      let dy = 0
      if (alignment === 'left') dx = selectionLeft - item.bounds.left
      if (alignment === 'center') dx = selectionCenterX - item.bounds.centerX
      if (alignment === 'right') dx = selectionRight - item.bounds.right
      if (alignment === 'top') dy = selectionTop - item.bounds.top
      if (alignment === 'middle') dy = selectionCenterY - item.bounds.centerY
      if (alignment === 'bottom') dy = selectionBottom - item.bounds.bottom
      Block.translate(ctx, item.entityId, [dx, dy])
    }
  })
}

function flipImage(axis: 0 | 1) {
  if (!isSingleImage.value) return
  const entityId = selected.value[0].entityId
  nextEditorTick((ctx) => {
    const block = Block.write(ctx, entityId)
    block.flip[axis] = !block.flip[axis]
  })
}
</script>

<template>
  <div class="wb-selection-toolbar">
    <template v-if="isMultiSelection">
      <MenuButton title="创建成 Frame" @click="createFrameFromSelection">
        <span class="material-icons">select_all</span>
      </MenuButton>
      <MenuDropdown title="对齐选项" placement="bottom">
        <template #button>
          <span class="material-icons">align_horizontal_left</span>
        </template>
        <template #dropdown="{ close }">
          <div class="wb-align-grid">
            <button title="左对齐" @click="alignSelection('left'); close()"><span class="material-icons">align_horizontal_left</span></button>
            <button title="水平居中" @click="alignSelection('center'); close()"><span class="material-icons">align_horizontal_center</span></button>
            <button title="右对齐" @click="alignSelection('right'); close()"><span class="material-icons">align_horizontal_right</span></button>
            <button title="顶部对齐" @click="alignSelection('top'); close()"><span class="material-icons">vertical_align_top</span></button>
            <button title="垂直居中" @click="alignSelection('middle'); close()"><span class="material-icons">vertical_align_center</span></button>
            <button title="底部对齐" @click="alignSelection('bottom'); close()"><span class="material-icons">vertical_align_bottom</span></button>
          </div>
        </template>
      </MenuDropdown>
      <MenuDropdown title="自动排序" placement="bottom">
        <template #button>
          <span class="material-icons">grid_view</span>
        </template>
        <template #dropdown="{ close }">
          <div class="wb-auto-layout-panel">
            <div class="wb-auto-layout-presets">
              <button
                v-for="preset in autoLayoutPresets"
                :key="preset.id"
                type="button"
                class="wb-auto-layout-preset"
                @click="applyAutoLayoutPreset(preset); close()"
              >
                <span>{{ preset.label }}</span>
                <small>{{ preset.description }}</small>
              </button>
            </div>
            <div class="wb-auto-layout-fields">
              <label>
                <span>行</span>
                <input v-model.number="layoutRows" type="number" min="1" :max="selected.length" @change="updateRows">
              </label>
              <label>
                <span>列</span>
                <input v-model.number="layoutColumns" type="number" min="1" :max="selected.length" @change="updateColumns">
              </label>
              <label>
                <span>行间距</span>
                <input v-model.number="layoutRowGap" type="number" min="0" max="500">
              </label>
              <label>
                <span>列间距</span>
                <input v-model.number="layoutColumnGap" type="number" min="0" max="500">
              </label>
            </div>
            <button type="button" class="wb-auto-layout-apply" @click="applyAutoLayout(); close()">应用布局</button>
          </div>
        </template>
      </MenuDropdown>
      <div class="wb-toolbar-divider" />
    </template>

    <template v-if="isSingleImage">
      <MenuButton title="水平翻转" @click="flipImage(0)">
        <span class="material-icons">flip</span>
      </MenuButton>
      <MenuButton title="垂直翻转" @click="flipImage(1)">
        <span class="material-icons wb-flip-vertical">flip</span>
      </MenuButton>
      <div class="wb-toolbar-divider" />
    </template>

    <template v-if="isSingleFrame">
      <MenuButton title="解除 Frame" @click="releaseFrame">
        <span class="material-icons">layers_clear</span>
      </MenuButton>
      <div class="wb-toolbar-divider" />
    </template>

    <FloatingMenuBar />
  </div>
</template>

<style scoped>
.wb-selection-toolbar {
  display: flex;
  align-items: center;
  height: 40px;
  color: var(--wov-gray-100, #f8f9f9);
  background: var(--wov-gray-700, #060607);
  border-radius: var(--wov-menu-border-radius, 12px);
  box-shadow: 0 0 0.5px #0000002e, 0 3px 8px #0000001a, 0 1px 3px #0000001a;
}
.wb-selection-toolbar :deep(.wov-floating-menu-bar) {
  background: transparent;
  border-radius: 0;
  box-shadow: none;
}
.wb-toolbar-divider { width: 1px; height: 24px; margin: 0 4px; background: var(--wov-gray-600, #2e3338); }
.material-icons { font-size: 19px; }
.wb-flip-vertical { transform: rotate(90deg); }
.wb-align-grid {
  display: grid;
  grid-template-columns: repeat(3, 34px);
  gap: 3px;
  padding: 5px;
  color: var(--wov-gray-100, #f8f9f9);
  background: var(--wov-gray-700, #060607);
  border-radius: 8px;
}
.wb-align-grid button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.wb-align-grid button:hover { background: var(--wov-gray-600, #2e3338); }
.wb-auto-layout-panel {
  width: 260px;
  padding: 10px;
  color: var(--wov-gray-100, #f8f9f9);
  background: var(--wov-gray-700, #060607);
  border-radius: 10px;
  box-shadow: 0 8px 24px #00000038;
  font-family: var(--wov-font-family, sans-serif);
}
.wb-auto-layout-presets {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  margin-bottom: 10px;
}
.wb-auto-layout-preset {
  min-width: 0;
  padding: 7px 8px;
  border: 0;
  border-radius: 6px;
  color: inherit;
  background: var(--wov-gray-600, #2e3338);
  cursor: pointer;
  text-align: left;
}
.wb-auto-layout-preset:hover { background: var(--wov-gray-500, #4f5660); }
.wb-auto-layout-preset span,
.wb-auto-layout-preset small { display: block; white-space: nowrap; }
.wb-auto-layout-preset span { font-size: 12px; font-weight: 600; }
.wb-auto-layout-preset small { margin-top: 2px; color: var(--wov-gray-300, #c7ccd1); font-size: 10px; }
.wb-auto-layout-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.wb-auto-layout-fields label { display: grid; gap: 4px; min-width: 0; }
.wb-auto-layout-fields label > span { color: var(--wov-gray-300, #c7ccd1); font-size: 11px; }
.wb-auto-layout-fields input {
  width: 100%;
  height: 30px;
  min-width: 0;
  padding: 0 8px;
  border: 1px solid var(--wov-gray-500, #4f5660);
  border-radius: 5px;
  outline: none;
  color: inherit;
  background: var(--wov-gray-600, #2e3338);
  font: inherit;
  font-size: 12px;
}
.wb-auto-layout-fields input:focus { border-color: var(--wov-primary, #6a58f2); }
.wb-auto-layout-apply {
  width: 100%;
  height: 32px;
  margin-top: 10px;
  border: 0;
  border-radius: 6px;
  color: #fff;
  background: var(--wov-primary, #6a58f2);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
}
.wb-auto-layout-apply:hover { background: var(--wov-primary-light, #8a76f4); }
</style>
