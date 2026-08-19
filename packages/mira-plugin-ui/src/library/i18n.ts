/**
 * 树组件内置文案(与 mira-browser-extension locales/zh-CN 的同名 key 保持一致)。
 *
 * 宿主传 t(vue-i18n 的 t 等)即接管文案;key 命名沿用扩展 locales
 * (library.* / tree.* / common.* / upload.*),扩展接入时无需新增翻译。
 */
import type { LibraryTreeT } from './types'

const zh = {
  'common.loading': '加载中…',
  'common.refresh': '刷新',
  'common.clear': '清除',
  'common.folder': '文件夹',
  'common.tag': '标签',
  'common.failed': '失败',
  'upload.dropHint': '拖放文件到此处,或点击选择',
  'library.searchPlaceholder': '搜索{type}…',
  'library.create': '新建{type}',
  'library.loadFailed': '加载失败:{error}',
  'library.emptyTitle': '当前素材库下暂无{type}',
  'library.emptyHint': '拖放文件到此可上传到素材库根目录',
  'library.noMatch': '未找到匹配的{type}',
  'tree.createSibling': '新建同级',
  'tree.createChild': '新建子{type}',
  'tree.delete': '删除',
  'tree.createPrompt': '请输入{type}名称',
  'tree.newName': '新建{type}{n}',
  'tree.createFailed': '创建失败:{error}',
  'tree.deleteFolderConfirm': '确定删除文件夹「{name}」?',
  'tree.deleteFilesCheck': '同时删除其中的文件',
  'tree.deleteTagConfirm': '确定删除标签「{name}」?',
  'tree.deleteFailed': '删除失败:{error}',
  'tree.root': '根目录',
  'tree.tagRoot': '根标签',
  'tree.dragMoveConfirm': '确定移动「{name}」到「{parent}」下?',
  'tree.sortFailed': '排序保存失败:{error}',
  'tree.moveFailed': '移动失败:{error}',
} as const

/** {n} 命名插值(vue-i18n 风格) */
function interpolate(template: string, params?: Record<string, unknown>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (m, key: string) =>
    key in params ? String(params[key]) : m,
  )
}

/** 内置中文兜底 t */
export function createLibraryTreeT(): LibraryTreeT {
  return (key, params) => {
    const template = (zh as Record<string, string>)[key]
    return template ? interpolate(template, params) : key
  }
}
