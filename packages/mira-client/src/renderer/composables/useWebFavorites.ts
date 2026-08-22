/**
 * 网页收藏夹（纯本地数据，与素材库无关）。
 *
 * 数据以 FolderTreeComponent 兼容的树结构（FolderItem[]）持久化在本地
 * ConfigStorage（key: mira-web-favorites）：文件夹节点可无限嵌套，
 * 叶子节点带 url。多个组件共享同一份模块级单例状态。
 */
import { ref } from 'vue'
import ConfigStorage from '@renderer/utils/ConfigStorage'

export interface WebFavoriteItem {
  id: string
  label: string
  icon?: string
  /** 叶子节点（网页）的地址；文件夹节点无此字段 */
  url?: string
  /** 网页节点的 webview 会话隔离 partition（完整值，含 persist: 前缀） */
  partition?: string
  /** 网页节点加载后是否静音 */
  muted?: boolean
  open?: boolean
  children?: WebFavoriteItem[]
}

const STORAGE_KEY = 'mira-web-favorites'

const items = ref<WebFavoriteItem[]>([])
let loaded = false

function persist() {
  ConfigStorage.setItem(STORAGE_KEY, JSON.stringify(items.value))
}

function generateId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `fav-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function findNode(nodes: WebFavoriteItem[], id: string): WebFavoriteItem | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children?.length) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return null
}

export function useWebFavorites() {
  async function load() {
    if (loaded) return
    loaded = true
    try {
      const raw = await ConfigStorage.getItem(STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed)) items.value = parsed
    } catch (error) {
      console.warn('[webFavorites] 加载失败:', error)
    }
  }

  /** 新增节点；parentId 为空时加入根级，父节点不存在时同样回落到根级 */
  function add(item: Omit<WebFavoriteItem, 'id'>, parentId?: string | null) {
    const node: WebFavoriteItem = { id: generateId(), ...item }
    const parent = parentId ? findNode(items.value, parentId) : null
    if (parent) {
      parent.children = parent.children || []
      parent.children.push(node)
    } else {
      items.value.push(node)
    }
    persist()
  }

  function update(id: string, patch: Partial<Omit<WebFavoriteItem, 'id' | 'children'>>) {
    const node = findNode(items.value, id)
    if (!node) return
    Object.assign(node, patch)
    persist()
  }

  /** 删除节点及其整个子树 */
  function remove(id: string): boolean {
    const targetId = String(id)
    let removed = false
    const removeFrom = (nodes: WebFavoriteItem[]): WebFavoriteItem[] => {
      const next: WebFavoriteItem[] = []
      for (const node of nodes) {
        if (String(node.id) === targetId) {
          removed = true
          continue
        }
        const children = node.children?.length ? removeFrom(node.children) : node.children
        next.push(children === node.children ? node : { ...node, children })
      }
      return next
    }
    if (items.value.some(node => String(node.id) === targetId) || findNode(items.value, targetId)) {
      items.value = removeFrom(items.value)
    }
    if (removed) {
      persist()
    } else {
      console.warn('[webFavorites] 删除目标不存在:', id)
    }
    return removed
  }

  /** 整树替换（拖拽排序后调用） */
  function replaceAll(next: WebFavoriteItem[]) {
    items.value = next
    persist()
  }

  return { items, load, add, update, remove, replaceAll, findNode }
}
