/**
 * 资源类型
 */
export type ResourceKind = 'image' | 'audio' | 'video';

export interface ImageUrlRule {
  name: string;
  host: string;
  path: string;
  replacement: string;
}

export const DEFAULT_IMAGE_URL_RULES: ImageUrlRule[] = [{
  name: 'Pinterest originals',
  host: '(?:^|\\.)pinimg\\.com$',
  path: '^/(?:vwebp/)?\\d+x(?:\\d+)?/(.+)$',
  replacement: '/originals/$1',
}];

/**
 * 嗅探资源展示视图:list 列表 / masonry 瀑布流
 */
export type SnifferViewMode = 'list' | 'masonry';

/**
 * 嗅探资源排序方向:asc 旧的在上 / desc 新的在上
 */
export type SnifferSortOrder = 'asc' | 'desc';

/**
 * 界面语言:i18n locale
 */
export type Locale = 'zh-CN' | 'en';

/**
 * 素材库树视图样式:tree 经典树 / tiles 末级叶子层平铺
 */
export type LibraryTreeStyle = 'tree' | 'tiles';

/**
 * 素材库树展示排序(与 mira-plugin-ui/library 的 LibraryTreeSortMode 字面量保持一致):
 * id 按节点 ID / title 按首字 / created_at 按创建时间(新的在前) /
 * last_used 按最后使用(本扩展导入时记录,最近在前) / custom 自定义拖拽顺序
 */
export type LibraryTreeSortMode = 'id' | 'title' | 'created_at' | 'last_used' | 'custom';

/** 拖拽快传站点列表模式 */
export type DragPopoverMode = 'whitelist' | 'blacklist';

/**
 * 嗅探到的资源
 */
export interface SniffedResource {
  /** url 派生 hash,去重用 */
  id: string;
  url: string;
  kind: ResourceKind;
  source: 'dom' | 'perf';
  /** image/video 宽 */
  width?: number;
  /** image/video 高 */
  height?: number;
  /** audio/video 时长(秒) */
  duration?: number;
  /** video 海报图 url */
  poster?: string;
  mimeType?: string;
  /** srcset 其他候选 url */
  variants?: string[];
  /** 出现次数 */
  occurrences: number;
  /** 嗅探时间戳 */
  sniffedAt: number;
  /** 全部 Tab 聚合展示时的来源信息 */
  tabId?: number;
  tabTitle?: string;
  /** 资源所在页面 URL，用于下载时设置 Referer */
  pageUrl?: string;
  referrer?: string;
}

/**
 * 上传任务状态
 */
export type UploadStatus = 'queued' | 'uploading' | 'success' | 'failed';

/**
 * 上传任务来源
 */
export type UploadSource = 'screenshot' | 'dragdrop' | 'sniffer' | 'dropzone';

/**
 * 上传任务
 */
export interface UploadTask {
  id: string;
  source: UploadSource;
  file: File;
  libraryId: string;
  tags?: string[];
  folderId?: string;
  status: UploadStatus;
  /** 0-100 */
  percent: number;
  error?: string;
  result?: { success: boolean; file: string; error?: string };
  createdAt: number;
}

/**
 * UI 模式
 */
export type UIMode = 'popup' | 'sidePanel';

/**
 * 主题:auto 跟随系统偏好,light/dark 手动覆盖
 */
export type Theme = 'auto' | 'light' | 'dark';

/**
 * 单个服务器连接配置。
 *
 * 多服务器改造后,扩展可保存多个服务器并通过 activeServerId 切换;
 * 顶层 serverURL/username/password 仅作迁移期兼容字段(由激活服务器同步写入)。
 */
export interface ServerConfig {
  /** crypto.randomUUID() */
  id: string;
  /** 显示名,如「本机开发」 */
  name: string;
  /** http://localhost:8081 */
  serverURL: string;
  username: string;
  password: string;
}

/**
 * 扩展设置
 */
export interface ExtensionSettings {
  /**
   * 多服务器列表(改造后的主存储)。
   * 顶层 serverURL/username/password 仅保留用于迁移与 ensureClient 兜底。
   */
  servers: ServerConfig[];
  /** 当前激活服务器 id;为空表示尚未选择(进连接界面手动选) */
  activeServerId: string;
  /** @deprecated 迁移兼容:与 activeServer 的凭据保持同步,供旧路径读取 */
  serverURL: string;
  /** @deprecated 迁移兼容 */
  username: string;
  /** @deprecated 迁移兼容 */
  password: string;
  libraryId: string;
  folderId?: string;
  tags: string[];
  uiMode: UIMode;
  theme: Theme;
  /** 素材库树视图样式(快捷导入面板的文件夹/标签树) */
  libraryTreeStyle: LibraryTreeStyle;
  /** 文件夹树默认排序 */
  libraryFolderSort: LibraryTreeSortMode;
  /** 标签树默认排序 */
  libraryTagSort: LibraryTreeSortMode;
  /** 界面语言:i18n locale */
  locale: Locale;
  dragPopoverEnabled: boolean;
  /** 白名单仅列表内启用;黑名单仅列表外启用 */
  dragPopoverMode: DragPopoverMode;
  /** 拖拽快传站点列表(host 精确匹配) */
  dragPopoverHosts: string[];
  dropZoneEnabled: boolean;
  /** 页面图片 hover 时右上角显示 dots 操作按钮(点击弹出「导入图片」菜单) */
  imageHoverButtonEnabled: boolean;
  snifferEnabled: boolean;
  /** 嗅探资源展示视图:list 列表 / masonry 瀑布流 */
  snifferView: SnifferViewMode;
  /** 嗅探资源排序方向:asc 旧的在上 / desc 新的在上 */
  snifferSortOrder: SnifferSortOrder;
  /** 嗅探图片最小宽度(px,0 不过滤) */
  snifferMinWidth: number;
  /** 嗅探图片最小高度(px,0 不过滤) */
  snifferMinHeight: number;
  /** 嗅探图片宽高比过滤(选中的比例 key,空数组不过滤) */
  snifferAspectRatios: string[];
  snifferKinds: ResourceKind[];
  autoScrollEnabled: boolean;
  /** 滚动间隔(ms) */
  autoScrollDelay: number;
  /** 批量导入时的 maxurl 解析和图片抓取并发数 */
  batchImportConcurrency: number;
  /** 嗅探「导入到」上次使用的素材库 */
  snifferImportLibraryId: string;
  /** 嗅探「导入到」上次使用的文件夹 */
  snifferImportFolderId: string;
  /** 嗅探「导入到」上次使用的标签名 */
  snifferImportTags: string[];
  /** 前端高清大图升级(maxurl),默认开 */
  imuEnabled: boolean;
  /** 高清图 URL 替换规则(JSON 编辑后持久化) */
  imuRules: ImageUrlRule[];
}

/**
 * 默认设置(开箱不崩)
 */
export const DEFAULT_SETTINGS: ExtensionSettings = {
  servers: [],
  activeServerId: '',
  serverURL: '',
  username: '',
  password: '',
  libraryId: '',
  tags: [],
  uiMode: 'popup',
  theme: 'auto',
  libraryTreeStyle: 'tree',
  libraryFolderSort: 'id',
  libraryTagSort: 'id',
  locale: 'zh-CN',
  dragPopoverEnabled: true,
  dragPopoverMode: 'blacklist',
  dragPopoverHosts: [],
  dropZoneEnabled: true,
  imageHoverButtonEnabled: false,
  snifferEnabled: false,
  snifferView: 'list',
  snifferSortOrder: 'desc',
  snifferMinWidth: 0,
  snifferMinHeight: 0,
  snifferAspectRatios: [],
  snifferKinds: ['image', 'audio', 'video'],
  autoScrollEnabled: false,
  autoScrollDelay: 800,
  batchImportConcurrency: 3,
  snifferImportLibraryId: '',
  snifferImportFolderId: '',
  snifferImportTags: [],
  imuEnabled: true,
  imuRules: DEFAULT_IMAGE_URL_RULES,
};

/**
 * 判断拖拽快传按钮是否在指定 host 启用。
 * 按 host 精确匹配,忽略大小写与首尾空白。
 */
export function isDragPopoverHostAllowed(
  host: string,
  mode: DragPopoverMode,
  hosts: string[] | undefined,
): boolean {
  const h = (host || '').trim().toLowerCase();
  const listed = !!h && !!hosts?.some(item => item.trim().toLowerCase() === h);
  return mode === 'whitelist' ? listed : !listed;
}

/**
 * 跨上下文文件序列化结构
 * chrome.runtime.sendMessage 无法序列化 File,用此结构传输。
 *
 * wire 格式用 number[]:实测 ArrayBuffer → 到达 SW 变成 {};
 * Uint8Array → 到达 SW 变成 {0:x,1:y,...} 类数组对象(丢 TypedArray 身份)。
 * 只有普通 number[] 经结构化克隆稳定,故 buffer 在传输层是 number[]。
 * (类型上保留宽容联合,stagedToFile 的 normalizeBytes 兼容全部形态)
 */
export interface StagedFile {
  name: string;
  type: string;
  /** 二进制(传输层 number[];兼容 Uint8Array/ArrayBuffer/类数组对象) */
  buffer: number[] | Uint8Array;
}

/**
 * 素材库树节点:文件夹 / 标签通用形态。
 *
 * 后端 Folder / Tag 都是扁平 + parent_id(根为 0 / undefined),
 * 前端一次性 getAll 后按 parent_id 组装成树。
 */
export interface LibraryTreeNode {
  id: number;
  title: string;
  color?: number;
  /** 0 表示根节点(无父级) */
  parentId: number;
  level: number;
  children: LibraryTreeNode[];
}
