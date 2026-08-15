import { nextTick, ref, type ComputedRef, type Ref } from 'vue'
import type { HeTreeNode } from '../types'

/** 定位并高亮指定节点：展开祖先、滚动到可见、短暂高亮 */
export function useLocateNode(options: {
  itemType: Ref<'folder' | 'tag'>
  treeData: Ref<HeTreeNode[]>
  rawNodes: Ref<HeTreeNode[]>
  nodeMap: ComputedRef<Map<string, HeTreeNode>>
  treeRef: Ref<any>
  treeContainerRef: Ref<HTMLElement | null>
  searchQuery: Ref<string>
  showSearch: Ref<boolean>
}) {
  const locatingNodeId = ref<string | null>(null)

  async function locateNode(id: string): Promise<boolean> {
    options.searchQuery.value = ''
    options.showSearch.value = false
    await nextTick()

    const node = options.nodeMap.value.get(id)
    const stat = options.treeRef.value?.statsFlat?.find((item: any) => item.data?.id === id)
      || (node ? options.treeRef.value?.getStat?.(node) : null)

    if (stat) {
      let current = stat
      const openedIds: string[] = []
      while (current) {
        current.open = true
        if (current.data?.id) openedIds.push(current.data.id)
        current = current.parent
      }
      await nextTick()
    }

    const target = options.treeContainerRef.value?.querySelector<HTMLElement>(`[data-folder-tree-node-id="${id}"]`)
    if (!target) return false

    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    locatingNodeId.value = null
    window.setTimeout(() => {
      locatingNodeId.value = id
      window.setTimeout(() => {
        if (locatingNodeId.value === id) {
          locatingNodeId.value = null
        }
      }, 1800)
    }, 250)
    return true
  }

  return { locatingNodeId, locateNode }
}
