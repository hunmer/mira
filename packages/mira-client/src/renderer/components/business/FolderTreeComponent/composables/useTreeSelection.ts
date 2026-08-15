import { computed, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { HeTreeNode } from '../types'
import { collectDescendantIds, collectTopLevelSelectedNodes, buildSelectPayload } from '../utils'

/**
 * 选择模式（单选/多选）。
 * selectionMode 由 prop 决定能力；selectionActive 表示当前是否已进入选择状态。
 */
export function useTreeSelection(options: {
  selectionMode: Ref<'none' | 'single' | 'multi'>
  selectedKeys: Ref<string[] | undefined>
  treeData: Ref<HeTreeNode[]>
  rawNodes: Ref<HeTreeNode[]>
  defaultIcon: Ref<string>
  onSelect: (item: any) => void
}) {
  const { t } = useI18n()

  const selectionEnabled = computed(() => options.selectionMode.value !== 'none')
  const isMultiMode = computed(() => options.selectionMode.value === 'multi')
  const selectionModeLabel = computed(() => isMultiMode.value ? t('business.folderTreeComponent.multiSelectLabel') : t('business.folderTreeComponent.singleSelectLabel'))
  // 传入选择模式时直接进入选择状态，便于在弹窗中点击即选
  const selectionActive = ref(options.selectionMode.value !== 'none')
  const selectedNodeIds = ref<Set<string>>(new Set())
  // 选择模式下当前选中的节点数量
  const selectionCount = computed(() => selectedNodeIds.value.size)
  // 是否在节点最左侧展示 checkbox（仅多选模式）
  const showNodeCheckbox = computed(() => selectionActive.value && isMultiMode.value)

  function toggleSelectionMode() {
    selectionActive.value = !selectionActive.value
    if (!selectionActive.value) clearSelection()
  }

  // 选择模式能力变化时，自动关闭已激活的选择状态并清空选中
  watch(options.selectionMode, (mode) => {
    selectionActive.value = mode !== 'none'
    clearSelection()
  })

  function clearSelection() {
    selectedNodeIds.value = new Set()
  }

  // 单选模式下仅保留一个节点
  function selectSingle(node: HeTreeNode) {
    selectedNodeIds.value = new Set([node.id])
  }

  // 判断节点是否处于选中状态（含被选中分组下的子项）
  function isNodeSelected(node: HeTreeNode): boolean {
    if (selectedNodeIds.value.has(node.id)) return true
    // 多选分组被选中时，其子项也视为选中
    if (isMultiMode.value) {
      const ids = collectDescendantIds(node)
      return ids.some(id => selectedNodeIds.value.has(id))
    }
    return false
  }

  // 节点勾选状态：true / false / 'indeterminate'（仅多选模式使用）
  function getNodeCheckState(node: HeTreeNode): boolean | 'indeterminate' {
    if (!node.children?.length) {
      return selectedNodeIds.value.has(node.id)
    }
    const ids = collectDescendantIds(node)
    const selectedCount = ids.filter(id => selectedNodeIds.value.has(id)).length
    if (selectedCount === 0) return false
    if (selectedCount === ids.length) return true
    return 'indeterminate'
  }

  function onNodeCheckChange(node: HeTreeNode, checked: boolean | 'indeterminate') {
    const next = new Set(selectedNodeIds.value)
    const ids = collectDescendantIds(node)
    if (checked) {
      ids.forEach(id => next.add(id))
    } else {
      ids.forEach(id => next.delete(id))
    }
    selectedNodeIds.value = next
    // 复选框交互同样通知外层，以便弹窗调用方即时应用节点
    options.onSelect(buildSelectPayload(node, options.defaultIcon.value, { selected: checked === true }))
  }

  function selectAll() {
    const next = new Set<string>()
    const walk = (nodes: HeTreeNode[]) => {
      for (const node of nodes) {
        collectDescendantIds(node).forEach(id => next.add(id))
      }
    }
    walk(options.treeData.value)
    selectedNodeIds.value = next
  }

  function collectSelectedTopLevelNodes(): { nodes: HeTreeNode[]; total: number } {
    return collectTopLevelSelectedNodes(options.treeData.value, selectedNodeIds.value)
  }

  // 数据加载或外部当前文件变化后，同步初始化选择状态
  watch([options.selectedKeys, options.rawNodes], ([keys]) => {
    if (!selectionActive.value) return
    const wanted = new Set((keys || []).map(String))
    const available = new Set<string>()
    const collect = (nodes: HeTreeNode[]) => nodes.forEach(node => {
      available.add(String(node.id))
      if (node.children) collect(node.children)
    })
    collect(options.rawNodes.value)
    selectedNodeIds.value = new Set([...wanted].filter(id => available.has(id)))
  }, { immediate: true, deep: true })

  return {
    selectionEnabled,
    isMultiMode,
    selectionModeLabel,
    selectionActive,
    selectedNodeIds,
    selectionCount,
    showNodeCheckbox,
    toggleSelectionMode,
    clearSelection,
    selectSingle,
    isNodeSelected,
    getNodeCheckState,
    onNodeCheckChange,
    selectAll,
    collectSelectedTopLevelNodes,
  }
}
