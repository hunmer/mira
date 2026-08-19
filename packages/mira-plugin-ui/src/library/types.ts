/**
 * 素材库树(文件夹/标签)组件的类型与依赖注入接口。
 *
 * 组件库不直接访问数据源(background 桥 / SDK / fetch),
 * 由宿主通过 services / dialog / upload 注入:
 * - services: 树数据加载与节点 CRUD
 * - dialog:   prompt/alert/confirm 弹窗(编辑动作的名称输入与删除确认)
 * - upload:   拖放/选择文件后的上传动作(宿主自行路由到上传队列)
 */

/** 素材库树节点:文件夹 / 标签通用形态(扁平 + parent_id 组装) */
export interface LibraryTreeNode {
  id: number
  title: string
  color?: number
  /** 0 表示根节点(无父级) */
  parentId: number
  level: number
  children: LibraryTreeNode[]
}

/** 后端 folder/tag 扁平项的通用形态(id/title/parent_id/color 字段一致) */
export interface LibraryFlatItem {
  id: number
  title: string
  parent_id?: number
  color?: number
}

export type LibraryTreeKind = 'folder' | 'tag'

/** 素材库候选项(LibrarySelect 的选项形态) */
export interface LibrarySelectOption {
  id: string | number
  name?: string
  title?: string
}

/** 服务器分组:名称作组标签,libraries 为组内候选项(跨服务器需保证库 id 唯一) */
export interface LibrarySelectServer {
  id?: string | number
  name?: string
  title?: string
  libraries: LibrarySelectOption[]
}

/** 数据服务:宿主实现(扩展走 background 桥,其他宿主可走 SDK) */
export interface LibraryTreeServices {
  listFolders(libraryId: string): Promise<LibraryFlatItem[] | null>
  listTags(libraryId: string): Promise<LibraryFlatItem[] | null>
  /** 创建节点,返回值不限定(部分后端返回新 id) */
  createNode(kind: LibraryTreeKind, libraryId: string, title: string, parentId?: number): Promise<unknown>
  /** 删除节点;folder 场景 deleteFiles 表示同时删除其中文件 */
  deleteNode(kind: LibraryTreeKind, libraryId: string, id: number, deleteFiles?: boolean): Promise<unknown>
}

/** 弹窗服务:与扩展 useDialog 的 Promise 风格子集对齐 */
export interface LibraryTreeDialog {
  alert(options: { title?: string; message?: string; danger?: boolean }): Promise<void>
  confirm(options: { message?: string; danger?: boolean }): Promise<boolean>
  prompt(options: { title?: string; message?: string; defaultValue?: string }): Promise<string | null>
  confirmCheck(options: {
    message?: string
    checkboxLabel?: string
    danger?: boolean
  }): Promise<{ ok: boolean; checked: boolean }>
}

/** 上传落点:文件夹落点带 folderId,标签落点带 tags(按标题,服务器按名称关联) */
export interface LibraryTreeUploadTarget {
  folderId?: number
  tags?: string[]
}

/** 上传服务:树视图拖放/选择文件后回调,宿主路由到自己的上传队列 */
export interface LibraryTreeUpload {
  /** 本地文件落点;target 缺省表示素材库根目录 */
  files(files: File[], target?: LibraryTreeUploadTarget): void
  /** 链接落点;target 缺省表示素材库根目录 */
  urls(urls: string[], target?: LibraryTreeUploadTarget): void
}

/** 文案函数:vue-i18n 风格(key + {n} 命名插值),缺省用内置中文 */
export type LibraryTreeT = (key: string, params?: Record<string, unknown>) => string
