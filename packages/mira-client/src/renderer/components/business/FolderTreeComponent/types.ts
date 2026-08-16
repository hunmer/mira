/** 树节点（@he-tree/vue 渲染用） */
export interface HeTreeNode {
  id: string
  label: string
  icon?: string
  count?: number
  color?: number | null
  nodeType: string
  originalData?: any
  children?: HeTreeNode[]
  /** 初始展开状态（@he-tree/vue 直接读写节点上的 open） */
  open?: boolean
}

/** 基础分类（全部/未分类/未打标/回收站） */
export interface BaseCategory {
  id: string
  label: string
  icon: string
  iconColor?: string
  count?: number
}
