/**
 * 素材库数据缓存(内存 + chrome.storage.local 双层):
 * 打开上传视图等场景先用上次数据占位渲染,再后台刷新,避免 UI 闪烁。
 *
 * - key 按「服务器 + 类型 + 素材库」隔离,换服务器/换库互不污染
 * - 内存层在常驻页面(如 sidePanel)内同步命中,首帧即可渲染占位数据
 * - 写入 fire-and-forget,失败静默(缓存丢失只影响占位体验)
 */
import type { Library } from 'mira-app-core/shared/sdk';
import type { LibraryFlatItem } from 'mira-plugin-ui/library';

export type LibraryCacheKind = 'folder' | 'tag';

const PREFIX = 'mira_library_cache';
const hasStorage = () =>
  typeof chrome !== 'undefined' && !!(chrome as any).storage?.local;

const memLibraries = new Map<string, Library[]>();
const memTree = new Map<string, LibraryFlatItem[]>();

const libKey = (scope: string) => `${PREFIX}:${scope}:libraries`;
const treeKey = (scope: string, kind: LibraryCacheKind, libraryId: string) =>
  `${PREFIX}:${scope}:${kind}:${libraryId}`;

export async function readCachedLibraries(scope: string): Promise<Library[] | null> {
  const hit = memLibraries.get(scope);
  if (hit) return hit;
  if (!hasStorage()) return null;
  try {
    const key = libKey(scope);
    const v = (await chrome.storage.local.get(key))[key] as Library[] | undefined;
    if (v?.length) memLibraries.set(scope, v);
    return v ?? null;
  } catch {
    return null;
  }
}

export function writeCachedLibraries(scope: string, libraries: Library[]): void {
  if (!libraries.length) return;
  memLibraries.set(scope, libraries);
  if (!hasStorage()) return;
  chrome.storage.local.set({ [libKey(scope)]: libraries }).catch(() => {});
}

export async function readCachedTree(
  scope: string,
  kind: LibraryCacheKind,
  libraryId: string,
): Promise<LibraryFlatItem[] | null> {
  if (!libraryId) return null;
  const key = treeKey(scope, kind, libraryId);
  const hit = memTree.get(key);
  if (hit) return hit;
  if (!hasStorage()) return null;
  try {
    const v = (await chrome.storage.local.get(key))[key] as LibraryFlatItem[] | undefined;
    if (v) memTree.set(key, v);
    return v ?? null;
  } catch {
    return null;
  }
}

export function writeCachedTree(
  scope: string,
  kind: LibraryCacheKind,
  libraryId: string,
  items: LibraryFlatItem[],
): void {
  if (!libraryId) return;
  const key = treeKey(scope, kind, libraryId);
  memTree.set(key, items);
  if (!hasStorage()) return;
  chrome.storage.local.set({ [key]: items }).catch(() => {});
}
