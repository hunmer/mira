import { computed, ref, type Ref } from 'vue'
import type { TreeNodeData } from '@/components/ui/volt/Tree.vue'
import type { FolderItem } from '@renderer/types/components'
import { pinyinMatch } from '@renderer/utils/helpers'

export function useFolderTreeData(
  folders: Ref<FolderItem[]>,
  tags: Ref<any[]>,
  treeType: Ref<string>,
) {
  const nodeIdMap = ref(new Map<string, {
    id: string
    parentId: string | null
    nodeType: string
    data: any
  }>())

  // 搜索状态
  const showFolderSearch = ref(false)
  const showTagSearch = ref(false)
  const folderSearchQuery = ref('')
  const tagSearchQuery = ref('')

  function convertFoldersToTreeNodes(folderList: FolderItem[], parentId: string | null = null): TreeNodeData[] {
    return folderList.map(folder => {
      const nodeData = {
        key: folder.id,
        label: folder.label || (folder as any).title || (folder as any).name,
        data: {
          ...folder,
          parentId,
          nodeType: treeType.value || 'folder',
        },
        children: folder.children ? convertFoldersToTreeNodes(folder.children, folder.id) : undefined,
        count: folder.count,
        icon: folder.icon,
      }

      nodeIdMap.value.set(folder.id, {
        id: folder.id,
        parentId,
        nodeType: treeType.value || 'folder',
        data: folder,
      })

      return nodeData
    })
  }

  function filterTreeNodes(nodes: TreeNodeData[], query: string): TreeNodeData[] {
    const filtered: TreeNodeData[] = []
    for (const node of nodes) {
      const matchesQuery = node.label ? pinyinMatch(node.label, query) : false
      const filteredChildren = node.children ? filterTreeNodes(node.children, query) : []
      if (matchesQuery || filteredChildren.length > 0) {
        filtered.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
        })
      }
    }
    return filtered
  }

  const treeData = computed((): TreeNodeData[] => {
    nodeIdMap.value.clear()
    return convertFoldersToTreeNodes(folders.value || [])
  })

  const filteredTreeData = computed((): TreeNodeData[] => {
    if (!folderSearchQuery.value.trim()) return treeData.value
    return filterTreeNodes(treeData.value, folderSearchQuery.value.trim())
  })

  const tagTreeNodes = computed<TreeNodeData[]>(() => {
    if (!tags.value) return []
    return tags.value.map(tag => {
      const tagKey = `tag-${tag.id}`
      const nodeData = {
        key: tagKey,
        label: tag.name || tag.title || tag.label,
        icon: 'label',
        iconColor: 'text-green-500',
        count: tag.fileCount || tag.count,
        leaf: true,
        selectable: true,
        data: { ...tag, nodeType: 'tag' },
      }
      nodeIdMap.value.set(tagKey, {
        id: tagKey,
        parentId: null,
        nodeType: 'tag',
        data: tag,
      })
      return nodeData
    })
  })

  const filteredTagTreeNodes = computed((): TreeNodeData[] => {
    if (!tagSearchQuery.value.trim()) return tagTreeNodes.value
    return filterTreeNodes(tagTreeNodes.value, tagSearchQuery.value.trim())
  })

  const userTreeNodes = computed<TreeNodeData[]>(() => {
    if (!folders.value || folders.value.length === 0) return []
    return folders.value.map(convertFolderItemToTreeNode)
  })

  function convertFolderItemToTreeNode(item: FolderItem): TreeNodeData {
    const originalData = (item as any).originalData || {
      id: parseInt(item.id),
      title: item.label,
      parent_id: null,
      color: null,
      icon: null,
    }
    return {
      key: item.id,
      label: item.label || (item as any).title || (item as any).name,
      icon: item.icon || 'folder',
      count: item.count,
      leaf: !item.children || item.children.length === 0,
      children: item.children ? item.children.map(convertFolderItemToTreeNode) : undefined,
      selectable: true,
      data: originalData,
    }
  }

  function getNodeInfo(nodeKey: string) {
    return nodeIdMap.value.get(nodeKey)
  }

  function toggleFolderSearch() {
    showFolderSearch.value = !showFolderSearch.value
    if (!showFolderSearch.value) folderSearchQuery.value = ''
  }

  function toggleTagSearch() {
    showTagSearch.value = !showTagSearch.value
    if (!showTagSearch.value) tagSearchQuery.value = ''
  }

  return {
    nodeIdMap,
    showFolderSearch,
    showTagSearch,
    folderSearchQuery,
    tagSearchQuery,
    treeData,
    filteredTreeData,
    tagTreeNodes,
    filteredTagTreeNodes,
    userTreeNodes,
    getNodeInfo,
    toggleFolderSearch,
    toggleTagSearch,
  }
}
