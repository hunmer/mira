export interface FolderMoveRequest {
  folderId: string
  folderIds?: string[]
  newParentId?: number
}

export interface SelectableFolder {
  id: string
  children?: SelectableFolder[]
}

export function collectFolderIds(nodes: SelectableFolder[]): string[] {
  return nodes.flatMap(node => [node.id, ...collectFolderIds(node.children || [])])
}

export function getFolderCheckState(node: SelectableFolder, selected: Set<string>): boolean | 'indeterminate' {
  const ids = collectFolderIds([node])
  const count = ids.filter(id => selected.has(id)).length
  return count === ids.length ? true : count === 0 ? false : 'indeterminate'
}

// 子树联动，并同步祖先状态，避免取消某个子项后仍移动整个父文件夹。
export function toggleFolderSelection(
  nodes: SelectableFolder[], selected: Set<string>, id: string, checked: boolean,
): Set<string> {
  const next = new Set(selected)
  function visit(items: SelectableFolder[]): boolean {
    for (const node of items) {
      if (node.id === id) {
        for (const childId of collectFolderIds([node])) {
          if (checked) next.add(childId)
          else next.delete(childId)
        }
        return true
      }
      if (node.children && visit(node.children)) {
        if (node.children.every(child => getFolderCheckState(child, next) === true)) next.add(node.id)
        else next.delete(node.id)
        return true
      }
    }
    return false
  }
  visit(nodes)
  return next
}

// 已选父节点随带后代移动，不再次移动后代，以保留分支内部的层级。
export function collectFolderMoveRoots(nodes: SelectableFolder[], selected: Set<string>): string[] {
  return nodes.flatMap(node => getFolderCheckState(node, selected) === true
    ? [node.id]
    : collectFolderMoveRoots(node.children || [], selected))
}
