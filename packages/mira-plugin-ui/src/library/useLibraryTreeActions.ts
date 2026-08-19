/**
 * 文件夹/标签树的右键菜单动作(删除)。
 * 自 mira-browser-extension useLibraryTreeActions 迁移,数据/文案改为注入。
 *
 * 这里只负责菜单状态与删除流程;「新建/编辑」经 CreateNodeDialog 由各视图模板自理。
 * 删除确认不再走宿主注入的 dialog,由 LibraryTreeView 内置 AlertDialog 呈现:
 * requestDelete 打开确认框,confirmDelete 执行(失败错误写入 deleteError 展示在框内)。
 */
import { ref } from 'vue';
import type { LibraryTreeNode, LibraryTreeKind, LibraryTreeServices, LibraryTreeT } from './types';
import { createLibraryTreeT } from './i18n';

export interface LibraryTreeMenuState {
  node: LibraryTreeNode;
  x: number;
  y: number;
}

export interface UseLibraryTreeActionsOptions {
  mode: LibraryTreeKind;
  /** 当前素材库 id(无库时操作直接放弃) */
  libraryId: () => string;
  /** 删除成功后重载树数据 */
  reload: () => Promise<void> | void;
}

/** 宿主注入:数据服务 / 文案 */
export interface UseLibraryTreeActionsDeps {
  services: LibraryTreeServices;
  t?: LibraryTreeT;
}

export function useLibraryTreeActions(options: UseLibraryTreeActionsOptions, deps: UseLibraryTreeActionsDeps) {
  const t = deps.t ?? createLibraryTreeT();
  const { services } = deps;

  const menu = ref<LibraryTreeMenuState | null>(null);

  function openMenu(node: LibraryTreeNode, x: number, y: number) {
    menu.value = { node, x, y };
  }

  function closeMenu() {
    menu.value = null;
  }

  // ---- 删除:AlertDialog 确认(状态由本 composable 持有,模板在 LibraryTreeView) ----
  /** 待删除节点(非空即确认框打开) */
  const deleteTarget = ref<LibraryTreeNode | null>(null);
  /** folder 场景:同时删除其中的文件 */
  const deleteFiles = ref(false);
  const deleteError = ref('');
  const deleting = ref(false);

  /** 右键「删除」:关闭菜单并打开 AlertDialog 确认 */
  function requestDelete() {
    if (!menu.value) return;
    deleteTarget.value = menu.value.node;
    deleteFiles.value = false;
    deleteError.value = '';
    closeMenu();
  }

  /** 关闭确认框(取消 / 遮罩 / Esc) */
  function closeDelete() {
    deleteTarget.value = null;
    deleteError.value = '';
  }

  /** 确认删除:成功关框并重载;失败错误留在框内可重试 */
  async function confirmDelete() {
    const target = deleteTarget.value;
    const libId = options.libraryId();
    if (!target || !libId || deleting.value) return;
    deleting.value = true;
    deleteError.value = '';
    try {
      await services.deleteNode(options.mode, libId, target.id, options.mode === 'folder' && deleteFiles.value);
      closeDelete();
      await options.reload();
    } catch (e: any) {
      console.warn('[mira-plugin-ui] deleteNode failed', { error: e?.message });
      deleteError.value = t('tree.deleteFailed', { error: e?.message ?? String(e) });
    } finally {
      deleting.value = false;
    }
  }

  return { menu, openMenu, closeMenu, requestDelete, closeDelete, confirmDelete, deleteTarget, deleteFiles, deleteError, deleting };
}
