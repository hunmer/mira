<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { ListTree } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useEditorVersion } from '@/composables/useEditorVersion'

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
      result.push({ level: node.attrs.level as number, text: node.textContent || '未命名章节', pos })
    }
  })
  return result
})

const activePos = ref(-1)

/** 章节定位：平滑滚动到对应标题 */
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
  <aside class="sticky top-6 hidden w-52 shrink-0 lg:block">
    <div class="rounded-xl border bg-card p-3 shadow-sm">
      <div class="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
        <ListTree class="size-3.5" />
        <span>文档大纲</span>
      </div>
      <div v-if="headings.length" class="scroll-thin max-h-[60vh] space-y-0.5 overflow-y-auto">
        <button
          v-for="heading in headings"
          :key="heading.pos"
          type="button"
          class="block w-full cursor-pointer truncate rounded-md py-1 pr-2 text-left text-[13px] leading-5 transition-colors"
          :class="activePos === heading.pos
            ? 'bg-accent font-medium text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'"
          :style="{ paddingLeft: `${(heading.level - 1) * 12 + 4}px` }"
          :title="heading.text"
          @click="scrollTo(heading.pos)"
        >
          {{ heading.text }}
        </button>
      </div>
      <p v-else class="px-1 py-1.5 text-xs leading-5 text-muted-foreground">
        暂无章节<br>输入 <code class="rounded bg-muted px-1">/</code> 插入标题后在此定位
      </p>
    </div>
  </aside>
</template>
