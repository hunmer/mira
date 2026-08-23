<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { ChevronDown, ListTree } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useEditorVersion } from '@/composables/useEditorVersion'
import { useI18n } from '@/lib/i18n'

const { t } = useI18n()

const props = defineProps<{ editor: Editor }>()
const version = useEditorVersion(() => props.editor)

interface Heading {
  level: number
  text: string
  pos: number
}

const headings = computed<Heading[]>(() => {
  void version.value
  const result: Heading[] = []
  props.editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading' && (node.attrs.level as number) <= 3) {
      result.push({ level: node.attrs.level as number, text: node.textContent || t('ol.unnamed'), pos })
    }
  })
  return result
})

/* ---------- 折叠/展开 ---------- */
const panelCollapsed = ref(false)
const collapsed = ref<Set<number>>(new Set())

/** 含子章节的标题（后一个标题层级更深） */
const parentPoses = computed(() => {
  const set = new Set<number>()
  const list = headings.value
  list.forEach((heading, i) => {
    if (list[i + 1] && list[i + 1].level > heading.level) set.add(heading.pos)
  })
  return set
})

/** 折叠某章节后，其更深层级的章节随之隐藏 */
const visibleHeadings = computed(() => {
  const result: Heading[] = []
  let hiddenLevel = 0
  for (const heading of headings.value) {
    if (hiddenLevel && heading.level > hiddenLevel) continue
    hiddenLevel = 0
    result.push(heading)
    if (collapsed.value.has(heading.pos)) hiddenLevel = heading.level
  }
  return result
})

function toggleCollapse (pos: number) {
  const next = new Set(collapsed.value)
  if (next.has(pos)) next.delete(pos)
  else next.add(pos)
  collapsed.value = next
}

/* ---------- 章节定位 ---------- */
const activePos = ref(-1)

function scrollTo (pos: number) {
  const dom = props.editor.view.nodeDOM(pos) as HTMLElement | null
  dom?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  activePos.value = pos
}

/** 滚动时高亮视口顶部最近的章节 */
let ticking = false
function onScroll () {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    ticking = false
    let current = -1
    for (const heading of headings.value) {
      const dom = props.editor.view.nodeDOM(heading.pos) as HTMLElement | null
      if (dom && dom.getBoundingClientRect().top <= 96) current = heading.pos
      else break
    }
    activePos.value = current
  })
}

onMounted (() => document.addEventListener('scroll', onScroll, true))
onBeforeUnmount (() => document.removeEventListener('scroll', onScroll, true))
</script>

<template>
  <aside class="fixed right-4 top-14 z-30 hidden w-52 lg:block">
    <div class="rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur">
      <button
        type="button"
        class="flex w-full cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        @click="panelCollapsed = !panelCollapsed"
      >
        <ListTree class="size-3.5" />
        <span>{{ t('ol.title') }}</span>
        <ChevronDown
          class="ml-auto size-3.5 transition-transform"
          :class="panelCollapsed && '-rotate-90'"
        />
      </button>
      <div v-if="!panelCollapsed && headings.length" class="scroll-thin mt-1.5 max-h-[60vh] space-y-0.5 overflow-y-auto">
        <button
          v-for="heading in visibleHeadings"
          :key="heading.pos"
          type="button"
          class="flex w-full cursor-pointer items-center gap-0.5 truncate rounded-md py-1 pr-2 text-left text-[13px] leading-5 transition-colors"
          :class="activePos === heading.pos
            ? 'bg-accent font-medium text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'"
          :style="{ paddingLeft: `${(heading.level - 1) * 12}px` }"
          :title="heading.text"
          @click="scrollTo(heading.pos)"
        >
          <span
            v-if="parentPoses.has(heading.pos)"
            class="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded hover:bg-foreground/10"
            @click.stop="toggleCollapse(heading.pos)"
          >
            <ChevronDown class="size-3 transition-transform" :class="collapsed.has(heading.pos) && '-rotate-90'" />
          </span>
          <span v-else class="size-4 shrink-0" />
          <span class="truncate">{{ heading.text }}</span>
        </button>
      </div>
      <p v-else-if="!panelCollapsed" class="mt-1 px-1 py-1.5 text-xs leading-5 text-muted-foreground">
        {{ t('ol.empty1') }}<br>{{ t('ol.empty2') }}
      </p>
    </div>
  </aside>
</template>
