<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { TextSelection } from '@tiptap/pm/state'
import { GripVertical, Plus } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const props = defineProps<{ editor: Editor }>()

const root = ref<HTMLElement | null>(null)
const handleEl = ref<HTMLElement | null>(null)
const handle = reactive({ visible: false, top: 0, left: 0 })
const dropLine = reactive({ visible: false, top: 0, left: 0, width: 0 })

let blockRange: { from: number; to: number } | null = null
let dragRange: { from: number; to: number } | null = null
let insertPos: number | null = null
let dragging = false
let lastMove = 0

function wrapperRect () {
  return root.value?.parentElement?.getBoundingClientRect()
}

/** 把任意 pos 归一到所属顶层块的 { from, to, dom } */
function topLevelBlockAt (pos: number) {
  const view = props.editor.view
  const doc = props.editor.state.doc
  let $pos = doc.resolve(Math.max(pos, 1))
  while ($pos.depth > 1) $pos = doc.resolve($pos.before())
  if ($pos.depth === 0) $pos = doc.resolve(1)
  const from = $pos.before(1)
  const to = $pos.after(1)
  const dom = view.nodeDOM(from) as HTMLElement | null
  if (!dom) return null
  return { from, to, rect: dom.getBoundingClientRect() }
}

function positionHandle (rect: DOMRect) {
  const wrap = wrapperRect()
  if (!wrap) return
  const leftOffset = rect.left - wrap.left
  // 整体挂在块文字左侧外（卡片 padding 之外），避免与文字重叠
  handle.left = leftOffset - 64
  handle.top = rect.top - wrap.top + rect.height / 2 - 12
}

/** 监听绑在 document 上：把手在编辑器 DOM 之外，绑编辑器会导致鼠标移向把手时触发隐藏 */
function onDocMouseMove (event: MouseEvent) {
  if (dragging) return
  if (handleEl.value?.contains(event.target as Node)) return
  const now = performance.now()
  if (now - lastMove < 30) return
  lastMove = now
  const coords = props.editor.view.posAtCoords({ left: event.clientX, top: event.clientY })
  const block = coords ? topLevelBlockAt(coords.pos) : null
  if (!block) { handle.visible = false; blockRange = null; return }
  blockRange = { from: block.from, to: block.to }
  positionHandle(block.rect)
  handle.visible = true
}

function hideHandle () {
  if (dragging) return
  handle.visible = false
  blockRange = null
}

/* ---------- 块拖拽重排 ---------- */
function onDragStart (event: DragEvent) {
  if (!blockRange || !event.dataTransfer) return
  dragRange = { ...blockRange }
  insertPos = null
  dragging = true
  handle.visible = false
  event.dataTransfer.setData('text/plain', '')
  event.dataTransfer.effectAllowed = 'move'
}

function onDragOver (event: DragEvent) {
  if (!dragRange || !event.dataTransfer) return
  event.preventDefault()
  event.stopPropagation()
  event.dataTransfer.dropEffect = 'move'
  const coords = props.editor.view.posAtCoords({ left: event.clientX, top: event.clientY })
  if (!coords) return
  const block = topLevelBlockAt(coords.pos)
  const wrap = wrapperRect()
  if (!block || !wrap) return
  const before = event.clientY < block.rect.top + block.rect.height / 2
  insertPos = before ? block.from : block.to
  dropLine.top = (before ? block.rect.top : block.rect.bottom) - wrap.top - 1
  dropLine.left = block.rect.left - wrap.left
  dropLine.width = block.rect.width
  dropLine.visible = true
}

function onDrop (event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  const range = dragRange
  const pos = insertPos
  clearDrag()
  if (!range || pos === null) return
  // 原位或落点在被拖块内部：不移动
  if (pos >= range.from && pos <= range.to) return
  const node = props.editor.state.doc.nodeAt(range.from)
  if (!node) return
  const tr = props.editor.state.tr
  tr.delete(range.from, range.to)
  tr.insert(pos > range.to ? pos - (range.to - range.from) : pos, node)
  props.editor.view.dispatch(tr)
}

function clearDrag () {
  dragging = false
  dragRange = null
  insertPos = null
  dropLine.visible = false
}

/* ---------- 加号：在块后插入段落并唤起 / 菜单 ---------- */
function insertBlockBelow () {
  if (!blockRange) return
  const { to } = blockRange
  props.editor
    .chain()
    .focus()
    .command(({ tr, state, dispatch }) => {
      if (dispatch) {
        const paragraph = state.schema.nodes.paragraph.create()
        tr.insert(to, paragraph)
        tr.setSelection(TextSelection.near(tr.doc.resolve(to + 1)))
      }
      return true
    })
    .insertContent('/')
    .run()
}

onMounted (() => {
  const dom = props.editor.view.dom
  document.addEventListener('mousemove', onDocMouseMove)
  // capture 阶段拦截，避免 ProseMirror 自己的拖放处理
  dom.addEventListener('dragover', onDragOver, true)
  dom.addEventListener('drop', onDrop, true)
  document.addEventListener('dragend', clearDrag)
  document.addEventListener('scroll', hideHandle, true)
})

onBeforeUnmount (() => {
  const dom = props.editor.view.dom
  document.removeEventListener('mousemove', onDocMouseMove)
  dom.removeEventListener('dragover', onDragOver, true)
  dom.removeEventListener('drop', onDrop, true)
  document.removeEventListener('dragend', clearDrag)
  document.removeEventListener('scroll', hideHandle, true)
})
</script>

<template>
  <div ref="root" class="pointer-events-none absolute inset-0 z-10">
    <div
      v-show="handle.visible"
      ref="handleEl"
      class="pointer-events-auto absolute flex items-center gap-0.5"
      :style="{ top: `${handle.top}px`, left: `${handle.left}px` }"
      @mousedown.prevent
    >
      <button
        type="button"
        title="在下方插入块"
        class="flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        @click="insertBlockBelow"
      >
        <Plus class="size-4" />
      </button>
      <button
        type="button"
        draggable="true"
        title="拖拽移动块"
        class="flex size-6 cursor-grab items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground active:cursor-grabbing"
        @dragstart="onDragStart"
      >
        <GripVertical class="size-4" />
      </button>
    </div>
    <div
      v-show="dropLine.visible"
      class="absolute h-0.5 rounded-full bg-primary"
      :style="{ top: `${dropLine.top}px`, left: `${dropLine.left}px`, width: `${dropLine.width}px` }"
    />
  </div>
</template>
