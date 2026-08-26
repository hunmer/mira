<script setup lang="ts">
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import OrderedSectionList from '@renderer/components/common/OrderedSectionList.vue'

interface Item { id: string; title: string; pluginId: string }

const list = ref<Item[]>([])

const perPage = computed(() => Math.max(1, Math.floor(400 / 40)))
const pagesA = computed(() => {
  const size = perPage.value
  const l = list.value
  if (size >= l.length) return [l]
  const out: Item[][] = []
  for (let i = 0; i < l.length; i += size) out.push(l.slice(i, i + size))
  return out
})
function onReorderA(pi: number, items: Item[]) { void pi; void items }
const panelEls = ref<Array<HTMLElement | null>>([])
function setPanelEl(i: number, el: any) {
  panelEls.value[i] = (el as HTMLElement) ?? null
}
</script>

<template>
  <Motion class="flex">
    <div v-for="(page, pi) in pagesA" :key="pi" :ref="(el: any) => setPanelEl(pi, el)">
      <OrderedSectionList :items="page" draggable headerless horizontal @update:items="onReorderA(pi, $event)">
        <template #default="{ item }">{{ item.pluginId }}</template>
      </OrderedSectionList>
    </div>
  </Motion>
</template>
