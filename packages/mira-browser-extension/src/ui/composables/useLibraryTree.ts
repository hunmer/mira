/**
 * 薄层:树构建/过滤纯函数与数据加载已迁至 mira-plugin-ui/library,
 * 这里把扩展的 background 桥适配成库的 LibraryTreeServices,并保持原导出 API 不变。
 */
import { useLibraryTreeData } from 'mira-plugin-ui/library';
import { buildTree, filterTree, flattenTree, collectIds, sortTree, ROOT_ID } from 'mira-plugin-ui/library';
import type { LibraryFlatItem, LibraryTreeServices } from 'mira-plugin-ui/library';
import { useBackground } from './useBackground';
import { readNodeLastUsed } from '@/shared/node-last-used';

export { buildTree, filterTree, flattenTree, collectIds, sortTree, ROOT_ID };
export type { LibraryFlatItem };

/**
 * folder/tag 原始对象 → FlatItem(运行时两者字段一致)。
 *
 * 注:不直接用 SDK 的 Folder/Tag 类型 —— sdk barrel 里的 Tag 接口缺 parent_id
 * (types.ts 重导出的 Tag 与 TagModule 里的同名接口字段不一致),而运行时
 * 服务器返回的 folder/tag 都带 parent_id(扁平层级)。故这里用宽松的原始形态。
 * lastUsed 为本扩展导入时记录的使用时间 map(key `${libraryId}:${id}`),供树按 last_used 排序。
 */
function adapt(
  raw: { id: number; title: string; parent_id?: number; color?: number; sort_index?: number; description?: string; icon?: string; createdAt?: string | number; created_at?: string | number },
  lastUsed?: Record<string, number>,
  libraryId?: string,
): LibraryFlatItem {
  return {
    id: raw.id,
    title: raw.title,
    parent_id: typeof raw.parent_id === 'number' ? raw.parent_id : undefined,
    color: raw.color,
    description: raw.description,
    icon: raw.icon,
    sort_index: raw.sort_index,
    created_at: raw.created_at ?? raw.createdAt,
    last_used_at: libraryId != null ? lastUsed?.[`${libraryId}:${raw.id}`] : undefined,
  };
}

/** 扩展数据服务:background 桥 → mira-plugin-ui LibraryTreeServices */
export function extLibraryServices(): LibraryTreeServices {
  const bg = useBackground();
  return {
    async listFolders(libraryId) {
      const [list, lastUsed] = await Promise.all([bg.listFolders(libraryId), readNodeLastUsed()]);
      return (list ?? []).map(it => adapt(it, lastUsed.folder, libraryId));
    },
    async listTags(libraryId) {
      const [list, lastUsed] = await Promise.all([bg.listTags(libraryId), readNodeLastUsed()]);
      return (list ?? []).map(it => adapt(it, lastUsed.tag, libraryId));
    },
    createNode: (kind, libraryId, title, parentId) => bg.createNode(kind, libraryId, title, parentId),
    deleteNode: (kind, libraryId, id, deleteFiles) => bg.deleteNode(kind, libraryId, id, deleteFiles),
    // 右键「编辑」:改 title/description/color/icon
    updateNode: (kind, libraryId, id, title, extra) => bg.updateNode(kind, libraryId, id, title, extra),
    // 拖拽排序:同层顺序 / 跨层移动
    moveNode: (kind, libraryId, id, parentId) => bg.moveNode(kind, libraryId, id, parentId),
    updateSortIndex: (kind, libraryId, items) => bg.updateSortIndex(kind, libraryId, items),
  };
}

/**
 * 加载当前素材库下的文件夹 / 标签树。
 * mode='folder' → bg.listFolders;'tag' → bg.listTags。
 */
export function useLibraryTree(mode: 'folder' | 'tag') {
  return useLibraryTreeData(mode, extLibraryServices());
}
