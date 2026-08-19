/**
 * 树构建与过滤纯函数(自 mira-browser-extension useLibraryTree 迁移)。
 */
import type { LibraryFlatItem, LibraryTreeNode } from './types'

export const ROOT_ID = 0 // parent_id 为 0 或 undefined 均视为根

/**
 * 把扁平列表按 parent_id 组装成树。
 * - 容错:孤儿节点(parent 指向不存在的 id)挂到根,避免被吞掉。
 * - 排序:同层按 sort_index(拖拽排序保存值)升序,缺省/同值按 title。
 */
export function buildTree(items: LibraryFlatItem[]): LibraryTreeNode[] {
  const byParent = new Map<number, LibraryFlatItem[]>();
  const ids = new Set<number>(items.map(i => i.id));
  for (const it of items) {
    // parent 缺失 / 指向不存在的 id / 指向自己 → 当根处理
    let pid = it.parent_id ?? ROOT_ID;
    if (pid !== ROOT_ID && (!ids.has(pid) || pid === it.id)) pid = ROOT_ID;
    const arr = byParent.get(pid) ?? [];
    arr.push(it);
    byParent.set(pid, arr);
  }

  const build = (parentId: number, level: number): LibraryTreeNode[] =>
    (byParent.get(parentId) ?? [])
      .slice()
      .sort((a, b) =>
        ((a.sort_index ?? 0) - (b.sort_index ?? 0)) ||
        (a.title || '').localeCompare(b.title || '', 'zh'))
      .map(it => ({
        id: it.id,
        title: it.title,
        color: it.color,
        description: it.description,
        icon: it.icon,
        parentId,
        level,
        children: build(it.id, level + 1),
      }));

  return build(ROOT_ID, 0);
}

/**
 * 搜索过滤:命中节点的所有祖先也会保留(否则整条分支被裁掉,看不到匹配项)。
 * query 传数组时为多关键词 AND 语义(标题需同时包含全部关键词)。
 * 返回过滤后的树 + 匹配的 id 集合(供树组件高亮命中项)。
 */
export function filterTree(
  nodes: LibraryTreeNode[],
  query: string | string[],
): { tree: LibraryTreeNode[]; matched: Set<number> } {
  const words = (Array.isArray(query) ? query : [query])
    .map(q => q.trim().toLowerCase())
    .filter(Boolean);
  const matched = new Set<number>();
  if (!words.length) return { tree: nodes, matched };

  const walk = (list: LibraryTreeNode[]): LibraryTreeNode[] => {
    const out: LibraryTreeNode[] = [];
    for (const n of list) {
      const kids = walk(n.children);
      const hit = words.every(w => n.title.toLowerCase().includes(w));
      if (hit || kids.length) {
        if (hit) matched.add(n.id);
        out.push({ ...n, children: kids });
      }
    }
    return out;
  };
  return { tree: walk(nodes), matched };
}

/** 把树打平成有序数组(深度优先),便于搜索态下渲染。 */
export function flattenTree(nodes: LibraryTreeNode[]): LibraryTreeNode[] {
  const out: LibraryTreeNode[] = [];
  const walk = (list: LibraryTreeNode[]) => {
    for (const n of list) {
      out.push(n);
      if (n.children.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

/** 收集一棵子树下所有节点 id(含根),用于搜索命中后全部展开。 */
export function collectIds(nodes: LibraryTreeNode[]): Set<number> {
  const ids = new Set<number>();
  const walk = (list: LibraryTreeNode[]) => {
    for (const n of list) {
      ids.add(n.id);
      if (n.children.length) walk(n.children);
    }
  };
  walk(nodes);
  return ids;
}
