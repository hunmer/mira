import { computed, ref } from 'vue';
import { useBackground } from './useBackground';
import { dbg } from '@/shared/debug';
import type { LibraryTreeNode } from '@/shared/types';

/**
 * 文件夹 / 标签扁平项的通用形态。
 * 后端 Folder / Tag 字段名一致(id / title / parent_id / color),
 * 用一个适配函数统一收口。
 *
 * 注:不直接用 SDK 的 Folder/Tag 类型 —— sdk barrel 里的 Tag 接口缺 parent_id
 * (types.ts 重导出的 Tag 与 TagModule 里的同名接口字段不一致),而运行时
 * 服务器返回的 folder/tag 都带 parent_id(扁平层级)。故这里用宽松的原始形态。
 */
interface FlatItem {
  id: number;
  title: string;
  parent_id?: number;
  color?: number;
}

const ROOT_ID = 0; // parent_id 为 0 或 undefined 均视为根

/** folder / tag 原始对象 → FlatItem(运行时两者字段一致) */
function adapt(raw: { id: number; title: string; parent_id?: number; color?: number }): FlatItem {
  return {
    id: raw.id,
    title: raw.title,
    parent_id: typeof raw.parent_id === 'number' ? raw.parent_id : undefined,
    color: raw.color,
  };
}

/**
 * 把扁平列表按 parent_id 组装成树。
 * - 容错:孤儿节点(parent 指向不存在的 id)挂到根,避免被吞掉。
 * - 排序:同层按 title 排序。
 */
export function buildTree(items: FlatItem[]): LibraryTreeNode[] {
  const byParent = new Map<number, FlatItem[]>();
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
      .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh'))
      .map(it => ({
        id: it.id,
        title: it.title,
        color: it.color,
        parentId,
        level,
        children: build(it.id, level + 1),
      }));

  return build(ROOT_ID, 0);
}

/**
 * 加载当前素材库下的文件夹 / 标签树。
 * mode='folder' → bg.listFolders;'tag' → bg.listTags。
 */
export function useLibraryTree(mode: 'folder' | 'tag') {
  const bg = useBackground();
  const raw = ref<FlatItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const libraryId = ref('');

  /** 根据当前 libraryId 重新拉取 */
  async function load(libId: string) {
    libraryId.value = libId;
    if (!libId) {
      raw.value = [];
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const list = mode === 'folder' ? await bg.listFolders(libId) : await bg.listTags(libId);
      raw.value = (list ?? []).map(adapt);
    } catch (e: any) {
      dbg.warn('lib-tree', 'load failed', { mode, error: e?.message });
      error.value = e?.message ?? String(e);
      raw.value = [];
    } finally {
      loading.value = false;
    }
  }

  const tree = computed<LibraryTreeNode[]>(() => buildTree(raw.value));
  const count = computed(() => raw.value.length);

  return { tree, count, loading, error, libraryId, load };
}

/**
 * 搜索过滤:命中节点的所有祖先也会保留(否则整条分支被裁掉,看不到匹配项)。
 * 返回过滤后的树 + 匹配的 id 集合(供树组件高亮命中项)。
 */
export function filterTree(
  nodes: LibraryTreeNode[],
  query: string,
): { tree: LibraryTreeNode[]; matched: Set<number> } {
  const q = query.trim().toLowerCase();
  const matched = new Set<number>();
  if (!q) return { tree: nodes, matched };

  const walk = (list: LibraryTreeNode[]): LibraryTreeNode[] => {
    const out: LibraryTreeNode[] = [];
    for (const n of list) {
      const kids = walk(n.children);
      const hit = n.title.toLowerCase().includes(q);
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

export { ROOT_ID };
