/**
 * 薄层:右键菜单动作(新建同级/新建子级/删除)已迁至 mira-plugin-ui/library,
 * 这里注入扩展的 background 服务、DialogHost 弹窗与 vue-i18n 文案。
 */
import { useI18n } from 'vue-i18n';
import { useLibraryTreeActions as useLibraryTreeActionsBase } from 'mira-plugin-ui/library';
import type { LibraryTreeMenuState, UseLibraryTreeActionsOptions } from 'mira-plugin-ui/library';
import { useDialog } from './useDialog';
import { extLibraryServices } from './useLibraryTree';

export type { LibraryTreeMenuState, UseLibraryTreeActionsOptions };

export function useLibraryTreeActions(options: UseLibraryTreeActionsOptions) {
  const { t } = useI18n();
  return useLibraryTreeActionsBase(options, {
    services: extLibraryServices(),
    dialog: useDialog(),
    t: (key, params) => (t as any)(key, params),
  });
}
