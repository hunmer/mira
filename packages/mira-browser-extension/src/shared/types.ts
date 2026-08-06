/**
 * 资源类型
 */
export type ResourceKind = 'image' | 'audio' | 'video';

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
 * 扩展设置
 */
export interface ExtensionSettings {
  serverURL: string;
  username: string;
  password: string;
  libraryId: string;
  folderId?: string;
  tags: string[];
  uiMode: UIMode;
  theme: Theme;
  dragPopoverEnabled: boolean;
  dropZoneEnabled: boolean;
  snifferEnabled: boolean;
  snifferKinds: ResourceKind[];
  autoScrollEnabled: boolean;
  /** 滚动间隔(ms) */
  autoScrollDelay: number;
  /** 前端高清大图升级(maxurl),默认开 */
  imuEnabled: boolean;
}

/**
 * 默认设置(开箱不崩)
 */
export const DEFAULT_SETTINGS: ExtensionSettings = {
  serverURL: '',
  username: '',
  password: '',
  libraryId: '',
  tags: [],
  uiMode: 'popup',
  theme: 'auto',
  dragPopoverEnabled: true,
  dropZoneEnabled: true,
  snifferEnabled: false,
  snifferKinds: ['image', 'audio', 'video'],
  autoScrollEnabled: false,
  autoScrollDelay: 800,
  imuEnabled: true,
};

/**
 * 跨上下文文件序列化结构
 * chrome.runtime.sendMessage 无法序列化 File,用此结构传输
 */
export interface StagedFile {
  name: string;
  type: string;
  /** 二进制数据 */
  buffer: ArrayBuffer;
}
