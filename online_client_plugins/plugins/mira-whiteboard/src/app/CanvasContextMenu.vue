<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useEditorContext, useImageCreation } from '@woven-canvas/vue'
import {
  addComponent,
  Camera,
  createBlock,
  deselectAll,
  DuplicateSelected,
  RemoveSelected,
  selectBlock,
  Shape,
  Text,
} from '@woven-canvas/core'
import { useCanvasImageTransfer } from './useCanvasImageTransfer'

type MenuKind = 'canvas' | 'block' | 'image'

const { getEditor, nextEditorTick } = useEditorContext()
const { createImageBlock } = useImageCreation()
const { copyImage, isImageEntity } = useCanvasImageTransfer()
const menuOpen = ref(false)
const menuKind = ref<MenuKind>('canvas')
const menuX = ref(0)
const menuY = ref(0)
const menuRef = ref<HTMLElement | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const menuEntityId = ref<number | null>(null)
let insertionPoint: [number, number] = [0, 0]

function closeMenu() {
  menuOpen.value = false
}

function getWorldPoint(event: MouseEvent, canvas: HTMLElement): [number, number] | null {
  const ctx = getEditor()?._getContext()
  if (!ctx) return null
  const camera = Camera.read(ctx)
  const rect = canvas.getBoundingClientRect()
  return [
    camera.left + (event.clientX - rect.left) / camera.zoom,
    camera.top + (event.clientY - rect.top) / camera.zoom,
  ]
}

async function openMenu(event: MouseEvent, kind: MenuKind) {
  menuKind.value = kind
  menuX.value = event.clientX
  menuY.value = event.clientY
  menuOpen.value = true
  await nextTick()
  const rect = menuRef.value?.getBoundingClientRect()
  if (!rect) return
  menuX.value = Math.max(8, Math.min(menuX.value, window.innerWidth - rect.width - 8))
  menuY.value = Math.max(8, Math.min(menuY.value, window.innerHeight - rect.height - 8))
}

function handleContextMenu(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  const canvas = target?.closest<HTMLElement>('.wb-canvas')
  if (!canvas) return

  event.preventDefault()
  event.stopPropagation()
  const worldPoint = getWorldPoint(event, canvas)
  if (worldPoint) insertionPoint = worldPoint

  const blockElement = target?.closest<HTMLElement>('.wov-block[data-entity-id]')
  if (blockElement) {
    const entityId = Number(blockElement.dataset.entityId)
    menuEntityId.value = Number.isFinite(entityId) ? entityId : null
    if (Number.isFinite(entityId) && blockElement.dataset.selected !== 'true') {
      nextEditorTick((ctx) => {
        deselectAll(ctx)
        selectBlock(ctx, entityId)
      })
    }
    void openMenu(event, isImageEntity(entityId) ? 'image' : 'block')
    return
  }

  menuEntityId.value = null
  nextEditorTick((ctx) => deselectAll(ctx))
  void openMenu(event, 'canvas')
}

function createText() {
  const [x, y] = insertionPoint
  nextEditorTick((ctx) => {
    const entityId = createBlock(ctx, { tag: 'text', position: [x, y], size: [120, 29] })
    addComponent(ctx, entityId, Text, {
      ...Text.default(),
      content: '文字',
      constrainWidth: false,
      fontSizePx: 24,
    })
    deselectAll(ctx)
    selectBlock(ctx, entityId)
  })
  closeMenu()
}

function createShape() {
  const [x, y] = insertionPoint
  nextEditorTick((ctx) => {
    const entityId = createBlock(ctx, { tag: 'shape', position: [x, y], size: [200, 200] })
    addComponent(ctx, entityId, Shape, {
      ...Shape.default(),
      kind: 'rectangle',
      strokeKind: 'solid',
      strokeWidth: 2,
      strokeAlpha: 255,
      fillAlpha: 0,
    })
    deselectAll(ctx)
    selectBlock(ctx, entityId)
  })
  closeMenu()
}

function chooseImage() {
  closeMenu()
  imageInput.value?.click()
}

async function handleImageSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await createImageBlock(file, insertionPoint[0], insertionPoint[1])
}

function runSelectionCommand(command: typeof DuplicateSelected | typeof RemoveSelected) {
  getEditor()?.command(command)
  closeMenu()
}

async function copySelectedImage() {
  const entityId = menuEntityId.value
  closeMenu()
  if (entityId === null) return
  try {
    await copyImage(entityId)
  } catch (error) {
    console.warn('[whiteboard] copy image failed', error)
  }
}

onMounted(() => {
  document.addEventListener('contextmenu', handleContextMenu, true)
  document.addEventListener('pointerdown', closeMenu)
  window.addEventListener('blur', closeMenu)
})

onBeforeUnmount(() => {
  document.removeEventListener('contextmenu', handleContextMenu, true)
  document.removeEventListener('pointerdown', closeMenu)
  window.removeEventListener('blur', closeMenu)
})
</script>

<template>
  <input ref="imageInput" type="file" accept="image/*" class="wb-context-file-input" @change="handleImageSelected" />
  <div
    v-if="menuOpen"
    ref="menuRef"
    class="wb-context-menu"
    :style="{ left: `${menuX}px`, top: `${menuY}px` }"
    role="menu"
    @pointerdown.stop
    @contextmenu.prevent
  >
    <template v-if="menuKind === 'canvas'">
      <button role="menuitem" @click="createText"><span class="material-icons">title</span><span>添加文字</span></button>
      <button role="menuitem" @click="chooseImage"><span class="material-icons">image</span><span>添加图片</span></button>
      <button role="menuitem" @click="createShape"><span class="material-icons">category</span><span>添加形状</span></button>
    </template>
    <template v-else>
      <button v-if="menuKind === 'image'" role="menuitem" @click="copySelectedImage"><span class="material-icons">content_copy</span><span>复制图片</span></button>
      <button role="menuitem" @click="runSelectionCommand(DuplicateSelected)"><span class="material-icons">content_copy</span><span>克隆</span></button>
      <button class="danger" role="menuitem" @click="runSelectionCommand(RemoveSelected)"><span class="material-icons">delete_outline</span><span>删除</span></button>
    </template>
  </div>
</template>

<style scoped>
.wb-context-file-input { display: none; }
.wb-context-menu {
  position: fixed;
  z-index: 1000;
  min-width: 156px;
  padding: 5px;
  border: 1px solid #e2e4e9;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(20, 24, 32, 0.16);
}
.wb-context-menu button {
  width: 100%;
  height: 34px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 10px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #25272c;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.wb-context-menu button:hover { background: #f2f3f5; }
.wb-context-menu button.danger { color: #d93025; }
.wb-context-menu button.danger:hover { background: #fceceb; }
.wb-context-menu .material-icons { font-size: 18px; }
</style>
