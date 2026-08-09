<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ScrollArea } from '@/components/ui/scrollarea'
import { getBoneTree, type BoneNode, type BoneVisibility } from '@/spine/loader'
import BoneRow from './BoneRow'

/**
 * 骨骼树（只读查看 + 显隐切换，无编辑/无变换面板）。
 *
 * 移植自 SpineBoneTree.jsx：
 *   - 保留展开/折叠（默认全部展开）
 *   - 保留 Eye/EyeOff 显隐 toggle（通过 BoneVisibility）
 *   - 删除 selectedBone/onSelect 选中高亮（无变换面板）
 */
const props = defineProps<{
  spine: any
  visibility: BoneVisibility
  /** 显隐变更版本号，自增时强制重算 isHidden */
  revision: number
}>()

const emit = defineEmits<{
  (e: 'visibility-change'): void
}>()

const expanded = ref<Set<string>>(new Set())

const tree = computed<BoneNode[]>(() => {
  // revision 作为依赖触发重算（虽不直接使用）
  void props.revision
  return props.spine ? getBoneTree(props.spine) : []
})

const boneTotal = computed(() => props.spine?.skeleton?.bones?.length || 0)

// spine 变化时默认全部展开
watch(
  tree,
  (nodes) => {
    const next = new Set<string>()
    const visit = (list: BoneNode[]) => {
      for (const n of list) {
        next.add(n.bone.data.name)
        visit(n.children)
      }
    }
    visit(nodes)
    expanded.value = next
  },
  { immediate: true },
)

function toggleExpanded(name: string) {
  const next = new Set(expanded.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  expanded.value = next
}

function toggleVisibility(bone: any) {
  props.visibility.toggle(props.spine, bone)
  emit('visibility-change')
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-2 border-b px-3 text-xs font-medium text-muted-foreground">
      骨骼（{{ boneTotal }}）
    </div>
    <ScrollArea class="min-h-0 flex-1">
      <div class="space-y-0.5 p-2">
        <template v-if="tree.length">
          <BoneRow
            v-for="node in tree"
            :key="node.bone.data.name"
            :node="node"
            :expanded="expanded"
            :visibility="visibility"
            :revision="revision"
            @toggle-expanded="toggleExpanded"
            @toggle-visibility="toggleVisibility"
          />
        </template>
        <p v-else class="p-2 text-xs text-muted-foreground">加载角色后显示骨骼</p>
      </div>
    </ScrollArea>
  </div>
</template>
