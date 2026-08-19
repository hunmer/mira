/**
 * 文件夹/标签树的右键菜单动作(新建同级/新建子级/删除)。
 *
 * 由 LibraryTreeView(树视图)与 CustomUploadView(自定义上传)共用:
 * 这里只负责菜单状态与 CRUD 弹窗逻辑,菜单本身的渲染(<ContextMenu>)由各视图模板完成。
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useBackground } from './useBackground';
import { useDialog } from './useDialog';
import { dbg } from '@/shared/debug';
import type { LibraryTreeNode } from '@/shared/types';

export interface LibraryTreeMenuState {
  node: LibraryTreeNode;
  x: number;
  y: number;
}

export interface UseLibraryTreeActionsOptions {
  mode: 'folder' | 'tag';
  /** 当前素材库 id(无库时操作直接放弃) */
  libraryId: () => string;
  /** 当前节点总数(新建默认名「新建文件夹/标签 N」用) */
  count: () => number;
  /** 创建/删除成功后重载树数据 */
  reload: () => Promise<void> | void;
  /** 新建子级后展开其父节点,使新节点可见 */
  expand: (id: number) => void;
}

export function useLibraryTreeActions(options: UseLibraryTreeActionsOptions) {
  const { t } = useI18n();
  const bg = useBackground();
  const dialog = useDialog();

  const menu = ref<LibraryTreeMenuState | null>(null);
  const titleText = computed(() => (options.mode === 'folder' ? t('common.folder') : t('common.tag')));

  function openMenu(node: LibraryTreeNode, x: number, y: number) {
    menu.value = { node, x, y };
  }

  function closeMenu() {
    menu.value = null;
  }

  /**
   * 新建节点(sibling/child 由 level 决定 parentId):
   *  - sibling:与目标节点同级 → parentId = node.parentId
   *  - child:作为目标节点的子级 → parentId = node.id
   *
   * 用弹窗收集名称(默认「新建文件夹/标签 N」),空名/取消则放弃。
   */
  async function createNode(level: 'sibling' | 'child') {
    const target = menu.value?.node;
    if (!target) return;
    const parentId = level === 'sibling' ? target.parentId : target.id;
    closeMenu();

    const libId = options.libraryId();
    if (!libId) return;
    const defaultName = t('tree.newName', { type: titleText.value, n: options.count() + 1 });
    const title = await dialog.prompt({
      title: t('tree.createPrompt', { type: titleText.value }),
      defaultValue: defaultName,
    });
    if (!title?.trim()) return;

    try {
      await bg.createNode(options.mode, libId, title.trim(), parentId || undefined);
      await options.reload();
      if (level === 'child') options.expand(target.id);
    } catch (e: any) {
      dbg.warn('lib-tree', 'createNode failed', { error: e?.message });
      await dialog.alert({
        title: t('common.failed'),
        message: t('tree.createFailed', { error: e?.message ?? String(e) }),
        danger: true,
      });
    }
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
      await bg.deleteNode(options.mode, libId, target.id, deleteFiles);
      await options.reload();
    } catch (e: any) {
      dbg.warn('lib-tree', 'deleteNode failed', { error: e?.message });
      await dialog.alert({
        title: t('common.failed'),
        message: t('tree.deleteFailed', { error: e?.message ?? String(e) }),
        danger: true,
      });
    }
  }

  return { menu, titleText, openMenu, closeMenu, createNode, deleteNode };
}
