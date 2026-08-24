/**
 * 薄层:右键菜单动作(删除确认已内置 AlertDialog)自 mira-plugin-ui/library,
 * 这里注入扩展的 background 服务与 vue-i18n 文案。
 */
import { useI18n } from 'vue-i18n';
import { useLibraryTreeActions as useLibraryTreeActionsBase } from 'mira-plugin-ui/library';
import type { LibraryTreeMenuState, UseLibraryTreeActionsOptions } from 'mira-plugin-ui/library';
import { extLibraryServices } from './useLibraryTree';

export type { LibraryTreeMenuState, UseLibraryTreeActionsOptions };

export function useLibraryTreeActions(options: UseLibraryTreeActionsOptions) {
  const { t } = useI18n();
  return useLibraryTreeActionsBase(options, {
    services: extLibraryServices(),
    t: (key, params) => (t as any)(key, params),
  });
}
