/**
 * 加载素材库下的文件夹 / 标签树(自扩展 useLibraryTree 迁移,services 注入版)。
 * mode='folder' → services.listFolders;'tag' → services.listTags。
 */
import { computed, ref } from 'vue';
import type { LibraryFlatItem, LibraryTreeKind, LibraryTreeServices } from './types';
import { buildTree } from './tree';

export function useLibraryTreeData(mode: LibraryTreeKind, services: LibraryTreeServices) {
  const raw = ref<LibraryFlatItem[]>([]);
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
      const list = mode === 'folder' ? await services.listFolders(libId) : await services.listTags(libId);
      raw.value = list ?? [];
    } catch (e: any) {
      console.warn('[mira-plugin-ui] library tree load failed', { mode, error: e?.message });
      error.value = e?.message ?? String(e);
      raw.value = [];
    } finally {
      loading.value = false;
    }
  }

  const tree = computed(() => buildTree(raw.value));
  const count = computed(() => raw.value.length);

  return { tree, count, loading, error, libraryId, load };
}
