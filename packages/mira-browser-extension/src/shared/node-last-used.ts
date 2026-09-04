/**
 * 文件夹/标签「最后使用」记录:浏览器扩展导入时 touch,供树按 last_used 排序。
 *
 * 独立 chrome.storage.local key(不进 settings,避免高频导入写放大),
 * 结构 { folder/tag: { `${libraryId}:${id}`: 毫秒时间戳 } }。
 * 写入在内存合并 200ms 后落盘,批量导入只写一次且避免并发读改写丢更新。
 */
import { dbg } from './debug';

/** 使用记录的导入落点形态(与上传 payload 的 folderId/tags 一致;tags 为标签 ID) */
export interface NodeUsageTarget {
  folderId?: string | number | null;
  tags?: string[];
}

export interface NodeLastUsed {
  folder: Record<string, number>;
  tag: Record<string, number>;
}

const STORAGE_KEY = 'mira_node_last_used';
/** 合并写窗口(ms):同批导入的多次 touch 一次落盘 */
const FLUSH_DELAY = 200;

const nodeKey = (libraryId: string, id: string | number) => `${libraryId}:${id}`;

const hasStorage = () =>
  typeof chrome !== 'undefined' && !!(chrome as any).storage?.local;

export async function readNodeLastUsed(): Promise<NodeLastUsed> {
  if (!hasStorage()) return { folder: {}, tag: {} };
  try {
    const got = await chrome.storage.local.get(STORAGE_KEY);
    const v = got[STORAGE_KEY] as NodeLastUsed | undefined;
    return { folder: v?.folder ?? {}, tag: v?.tag ?? {} };
  } catch {
    return { folder: {}, tag: {} };
  }
}

/** 待落盘的增量(仅 background 上下文使用) */
let pending: NodeLastUsed | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushPending(): Promise<void> {
  flushTimer = null;
  if (!pending) return;
  const patch = pending;
  pending = null;
  try {
    const cur = await readNodeLastUsed();
    await chrome.storage.local.set({
      [STORAGE_KEY]: {
        folder: { ...cur.folder, ...patch.folder },
        tag: { ...cur.tag, ...patch.tag },
      },
    });
    dbg.log('upload', 'node last-used saved', {
      folder: Object.keys(patch.folder),
      tag: Object.keys(patch.tag),
    });
  } catch (error) {
    // 记录失败不影响导入
    dbg.warn('upload', 'node last-used save failed', { error });
  }
}

/**
 * 导入时记录落点文件夹/标签的使用时间(fire-and-forget,失败静默)。
 * 在 background 各导入入口调用(uploader.enqueue / BATCH_IMPORT)。
 */
export function touchNodeLastUsed(libraryId: string | undefined, target: NodeUsageTarget): void {
  if (!libraryId || !hasStorage()) return;
  const folderId = target.folderId;
  const tags = target.tags ?? [];
  if ((folderId == null || folderId === '') && !tags.length) return;
  pending ??= { folder: {}, tag: {} };
  const ts = Date.now();
  if (folderId != null && folderId !== '') pending.folder[nodeKey(libraryId, folderId)] = ts;
  for (const tag of tags) pending.tag[nodeKey(libraryId, tag)] = ts;
  if (flushTimer == null) flushTimer = setTimeout(flushPending, FLUSH_DELAY);
}
