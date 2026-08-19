/**
 * 文件夹/标签树的右键菜单动作(删除)。
 * 自 mira-browser-extension useLibraryTreeActions 迁移,数据/弹窗/文案改为注入。
 *
 * 这里只负责菜单状态与删除流程;「新建」经 CreateNodeDialog 由各视图模板自理
 * (useLibraryTreeActions 不再包办 prompt 收集名称)。
 */
import { ref } from 'vue';
import type { LibraryTreeDialog, LibraryTreeNode, LibraryTreeKind, LibraryTreeServices, LibraryTreeT } from './types';
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

/** 宿主注入:数据服务 / 弹窗 / 文案 */
export interface UseLibraryTreeActionsDeps {
  services: LibraryTreeServices;
  dialog: LibraryTreeDialog;
  t?: LibraryTreeT;
}

export function useLibraryTreeActions(options: UseLibraryTreeActionsOptions, deps: UseLibraryTreeActionsDeps) {
  const t = deps.t ?? createLibraryTreeT();
  const { services, dialog } = deps;

  const menu = ref<LibraryTreeMenuState | null>(null);

  function openMenu(node: LibraryTreeNode, x: number, y: number) {
    menu.value = { node, x, y };
  }

  function closeMenu() {
    menu.value = null;
  }

  /**
   * 删除节点。folder 用单弹窗 + 复选框(是否同时删除其中的文件);
   * tag 用普通确认弹窗。
   */
  async function deleteNode() {
    const target = menu.value?.node;
    if (!target) return;
    closeMenu();

    const libId = options.libraryId();
    if (!libId) return;

    let deleteFiles = false;
    if (options.mode === 'folder') {
      // 单弹窗:确认删除 + 复选框「同时删除其中的文件」
      const r = await dialog.confirmCheck({
        message: t('tree.deleteFolderConfirm', { name: target.title }),
        checkboxLabel: t('tree.deleteFilesCheck'),
        danger: true,
      });
      if (!r.ok) return;
      deleteFiles = r.checked;
    } else {
      if (!(await dialog.confirm({
        message: t('tree.deleteTagConfirm', { name: target.title }),
        danger: true,
      }))) return;
    }

    try {
      await services.deleteNode(options.mode, libId, target.id, deleteFiles);
      await options.reload();
    } catch (e: any) {
      console.warn('[mira-plugin-ui] deleteNode failed', { error: e?.message });
      await dialog.alert({
        title: t('common.failed'),
        message: t('tree.deleteFailed', { error: e?.message ?? String(e) }),
      });
    }
  }

  return { menu, openMenu, closeMenu, deleteNode };
}
