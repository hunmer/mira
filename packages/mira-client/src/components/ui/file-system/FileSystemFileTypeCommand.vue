<script setup lang="ts">
/**
 * 可搜索的文件类型清单（由 React 版 FileSystemFileTypeCommand 移植）
 *
 * cmdk 组合框渲染在菜单弹层内，长 MIME 清单可以边打字边过滤。
 * 切换选择后保持打开以便多选；上下键与回车来自组合框自身的语义。
 */
import { Check } from "@lucide/vue"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import FileSystemFileTypeIcon from "./FileSystemFileTypeIcon.vue"
import {
  FILE_TYPE_FILTER_GROUPS,
  type FileTypeFilterOption,
} from "./fileSystemUtils"

defineOptions({ name: "FileSystemFileTypeCommand" })

const props = defineProps<{
  checkedMimes: string[]
  options: FileTypeFilterOption[]
}>()

const emit = defineEmits<{
  (e: "toggle", mime: string, checked: boolean): void
}>()

// cmdk 拥有列表聚焦时的按键；仅 Escape（关菜单）与 Tab 继续向外传播。
function onKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape" && event.key !== "Tab") {
    event.stopPropagation()
  }
}
</script>

<template>
  <div @keydown.capture="onKeydown">
    <Command class="-m-1 w-[calc(100%+0.5rem)] bg-transparent">
      <CommandInput placeholder="Search file types…" class="h-9" />
      <CommandList class="max-h-none">
        <CommandEmpty>No file types found.</CommandEmpty>
        <div class="h-auto max-h-64 overflow-y-auto">
          <CommandGroup
            v-for="group in FILE_TYPE_FILTER_GROUPS"
            :key="group"
            :heading="group"
          >
            <CommandItem
              v-for="option in props.options.filter(
                (entry) => entry.group === group
              )"
              :key="option.mime"
              :value="option.label"
              @select="emit('toggle', option.mime, !props.checkedMimes.includes(option.mime))"
            >
              <Check
                :class="
                  cn(
                    'size-4 text-foreground',
                    !props.checkedMimes.includes(option.mime) && 'opacity-0'
                  )
                "
              />
              <FileSystemFileTypeIcon
                :file-name="option.iconFileName"
                class="size-4"
              />
              {{ option.label }}
            </CommandItem>
          </CommandGroup>
        </div>
      </CommandList>
    </Command>
  </div>
</template>
