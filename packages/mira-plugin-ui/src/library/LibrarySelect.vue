<script setup lang="ts">
/**
 * 素材库选择 Select:服务器作分组(SelectGroup/SelectLabel),素材库作候选项。
 *
 * 数据由宿主注入(servers prop),组件不访问数据源;v-model 绑定素材库 id
 * (字符串化),选中时额外 emit('change', { server, library }) 便于宿主定位
 * 所属服务器。跨服务器库 id 需唯一,否则分组内会出现重复 value。
 */
import { computed } from 'vue'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '../components/ui/select'
import type { LibrarySelectOption, LibrarySelectServer } from './types'

const props = withDefaults(defineProps<{
  servers: LibrarySelectServer[]
  modelValue?: string
  placeholder?: string
  disabled?: boolean
}>(), {
  modelValue: '',
  placeholder: '选择素材库',
  disabled: false,
})

const emit = defineEmits<{
  (event: 'update:model-value', libraryId: string): void
  (event: 'change', value: { server: LibrarySelectServer; library: LibrarySelectOption }): void
}>()

function labelOf (item: { name?: string; title?: string; id?: string | number }) {
  return item.name || item.title || String(item.id ?? '')
}

/** 无候选项的服务器不渲染为分组 */
const groups = computed(() => props.servers.filter(server => server.libraries?.length))
const total = computed(() => groups.value.reduce((count, server) => count + server.libraries.length, 0))

function onChange (value: string) {
  emit('update:model-value', value)
  for (const server of groups.value) {
    const library = server.libraries.find(item => String(item.id) === value)
    if (library) {
      emit('change', { server, library })
      return
    }
  }
}
</script>

<template>
  <Select :model-value="modelValue" :disabled="disabled || !total" @update:model-value="onChange">
    <SelectTrigger class="w-full">
      <SelectValue :placeholder="placeholder" />
    </SelectTrigger>
    <SelectContent>
      <template v-if="total">
        <SelectGroup v-for="server in groups" :key="String(server.id ?? labelOf(server))">
          <SelectLabel>{{ labelOf(server) }}</SelectLabel>
          <SelectItem v-for="library in server.libraries" :key="library.id" :value="String(library.id)">
            {{ labelOf(library) }}
          </SelectItem>
        </SelectGroup>
      </template>
      <p v-else class="text-muted-foreground px-2 py-4 text-center text-xs">暂无素材库</p>
    </SelectContent>
  </Select>
</template>
