import type { Folder, Tag } from 'mira-app-core/shared/sdk';
import { createApp, type App } from 'vue';
import type { LibraryFlatItem, LibraryTreeServices, LibraryTreeUpload } from 'mira-plugin-ui/library';
import { dbg } from '@/shared/debug';
import { parseDrop, urlKind } from '@/shared/drag-data';
import type { ResourceKind } from '@/shared/types';
import DragDropOverlay from './overlay/DragDropOverlay.vue';
// 仅在浮层 Shadow DOM 内加载,避免 Tailwind utilities 污染宿主页面
import dragdropOverlayCssUrl from './overlay/dragdrop-overlay.css?url';
import { ensureOverlayStyles, OVERLAY_BASE_CSS } from './overlay/styles';

export interface DragDropPayload {
  /** 已有 File(本地拖动文件) */
  file?: File;
  /** 文件来自网页媒体时保留原始 URL,用于 maxurl 升级 */
  sourceUrl?: string;
  /** 或仅有 url(网页图片) */
  url?: string;
  kind: ResourceKind;
  /** 目标文件夹 id(根区/不设文件夹时为 undefined) */
  folderId?: number;
  /** 拖到标签 chip 上释放时携带的标签(树视图按标题关联) */
  tags?: string[];
}

export interface DragDropHandlers {
  onUpload: (payload: DragDropPayload) => void;
  /** “自定义上传”落点由侧边栏完整表单接管(浮层内右键「上传到此处」也走这里)。 */
  openCustomUpload?: (source: DragSource) => void | Promise<void>;
  /** 取当前素材库的文件夹列表;未连接素材库时返回 null */
  getFolders?: () => Promise<Folder[] | null>;
  /** 取当前素材库的标签列表;未连接素材库时返回 null */
  getTags?: () => Promise<Tag[] | null>;
  /** 当前素材库 id;未连接返回 null(浮层树据此加载) */
  getLibraryId?: () => Promise<string | null>;
  /**
   * 新建文件夹(浮层树「新建」对话框);返回新文件夹 id;失败返回 null。
   */
  createFolder?: (title: string) => Promise<number | null>;
  /** 树 CRUD(可选;提供后浮层树支持右键编辑/删除/拖拽排序/跨层移动),签名与 LibraryTreeServices 一致 */
  createNode?: LibraryTreeServices['createNode'];
  deleteNode?: LibraryTreeServices['deleteNode'];
  updateNode?: LibraryTreeServices['updateNode'];
  updateSortIndex?: LibraryTreeServices['updateSortIndex'];
  moveNode?: LibraryTreeServices['moveNode'];
  /**
   * 拖拽源元素下含多张图片时,「批量导入」drop zone 释放触发。
   * urls 为该元素下收集到的图片 URL 列表。
   */
  onBatchImport?: (urls: string[]) => void;
  /** 「批量复制url」drop zone 释放触发。 */
  onCopyUrls?: (urls: string[]) => void;
}

export interface DragDropController {
  setEnabled(enabled: boolean): void;
  health(): DragDropHealth;
  destroy(): void;
}

export interface DragDropHealth {
  enabled: boolean;
  listenersAttached: boolean;
  documentConnected: boolean;
  baseStylePresent: boolean;
  dragStylePresent: boolean;
}

const SCROLL_EDGE = 48; // 距视口顶/底多少像素触发自动滚动
const SCROLL_STEP = 12; // 每帧滚动像素
const SHOW_THRESHOLD = 8; // 拖拽超过此距离(px)才显示浮层,过滤点击误触
const VIEWPORT_EDGE = 8; // 浮层与视口边缘保留的最小间距
const HEALTH_CHECK_INTERVAL = 5000;
const CONTROLLER_KEY = '__miraDragDropController__';

export interface DragSource {
  url: string;
  kind: ResourceKind;
}

export function folderEmptyMessage(folders: Folder[] | null): string {
  return folders === null ? '未连接素材库' : '暂无文件夹';
}

/** 钳制浮层 top:不超过 视口高度-浮层高度-EDGE,保证内容完整可见(高度变化后可重复调用)。 */
export function clampOverlayTop(top: number, overlayHeight: number, viewportHeight: number): number {
  return Math.max(VIEWPORT_EDGE, Math.min(top, viewportHeight - overlayHeight - VIEWPORT_EDGE));
}

export function calculateOverlayPosition(
  x: number,
  y: number,
  dx: number,
  dy: number,
  overlayWidth: number,
  overlayHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): { left: number; top: number } {
  const GAP = 12;
  const horiz = Math.abs(dx) >= Math.abs(dy);
  let left: number;
  let top: number;

  if (horiz) {
    const preferredLeft = dx >= 0 ? x + GAP : x - GAP - overlayWidth;
    const oppositeLeft = dx >= 0 ? x - GAP - overlayWidth : x + GAP;
    left = preferredLeft;
    if (preferredLeft < VIEWPORT_EDGE || preferredLeft + overlayWidth > viewportWidth - VIEWPORT_EDGE) {
      if (oppositeLeft >= VIEWPORT_EDGE && oppositeLeft + overlayWidth <= viewportWidth - VIEWPORT_EDGE) {
        left = oppositeLeft;
      }
    }
    top = y - overlayHeight / 2;
  } else {
    left = x - overlayWidth / 2;
    const preferredTop = dy >= 0 ? y + GAP : y - GAP - overlayHeight;
    const oppositeTop = dy >= 0 ? y - GAP - overlayHeight : y + GAP;
    top = preferredTop;
    if (preferredTop < VIEWPORT_EDGE || preferredTop + overlayHeight > viewportHeight - VIEWPORT_EDGE) {
      if (oppositeTop >= VIEWPORT_EDGE && oppositeTop + overlayHeight <= viewportHeight - VIEWPORT_EDGE) {
        top = oppositeTop;
      }
    }
  }

  return {
    left: Math.max(VIEWPORT_EDGE, Math.min(left, viewportWidth - overlayWidth - VIEWPORT_EDGE)),
    top: clampOverlayTop(top, overlayHeight, viewportHeight),
  };
}

/** 解析页面内可拖拽的媒体或链接；链接包裹媒体时优先媒体本身。 */
export function resolveDragSource(target: Element | null): DragSource | null {
  if (!target) return null;

  const directMedia = target.closest('img, video');
  if (directMedia) return resolveMediaSource(directMedia);

  // Pinterest 等站点常由图片上方的 draggable 容器/遮罩触发 dragstart，
  // 此时真实 img 是容器的子元素，而不是事件目标或其祖先。
  const containers = [
    target.closest('[draggable="true"]'),
    target.closest('a[href]'),
    target,
  ].filter((element): element is Element => !!element);
  for (const container of containers) {
    const nestedMedia = container.querySelector('img, video');
    if (nestedMedia) {
      const source = resolveMediaSource(nestedMedia);
      if (source) return source;
    }
  }

  const link = target.closest('a[href]') ?? target.querySelector('a[href]');
  const url = (link as HTMLAnchorElement | null)?.href;
  return url ? { url, kind: urlKind(url) } : null;
}

function resolveMediaSource(element: Element): DragSource | null {
  if (element instanceof HTMLImageElement) {
    const url = element.currentSrc || element.src;
    return url ? { url, kind: 'image' } : null;
  }
  if (element instanceof HTMLVideoElement) {
    const url = element.currentSrc || element.src || element.querySelector('source')?.src;
    return url ? { url, kind: 'video' } : null;
  }

  return null;
}

/**
 * 收集拖拽目标元素下的多张图片 URL(批量导入/批量复制用)。
 *
 * 从 target 向上最多 maxDepth 层,取第一个包含 ≥2 张图片的容器;
 * 拖拽目标是媒体元素本身(单图操作)时返回空。
 * 过滤 data: URL 与重复项,最多 limit 张。
 */
export function collectImagesUnder(
  target: Element | null,
  opts?: { maxDepth?: number; limit?: number },
): string[] {
  if (!target) return [];
  if (target.closest('img, video')) return [];
  const maxDepth = opts?.maxDepth ?? 6;
  const limit = opts?.limit ?? 50;
  for (let el: Element | null = target, depth = 0; el && depth < maxDepth; el = el.parentElement, depth++) {
    const urls: string[] = [];
    const seen = new Set<string>();
    for (const img of el.querySelectorAll('img')) {
      const url = (img.currentSrc || img.src || '').trim();
      if (!url || url.startsWith('data:') || seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
      if (urls.length >= limit) break;
    }
    if (urls.length >= 2) return urls;
  }
  return [];
}

export function createDragDrop(handlers: DragDropHandlers): DragDropController {
  const controllerHost = window as unknown as Record<string, DragDropController | undefined>;
  controllerHost[CONTROLLER_KEY]?.destroy();

  let enabled = true;
  let destroyed = false;
  // 浮层为 Vue 组件(DragDropOverlay)动态挂载:overlayHost = document 上的挂载容器;
  // overlayRoot = 容器内 .mira-overlay(fixed 定位/尺寸测量);vueApp = 浮层实例(随 hideOverlay 卸载)
  let overlayHost: HTMLDivElement | null = null;
  let overlayRoot: HTMLElement | null = null;
  let vueApp: App | null = null;
  let scrollTimer: ReturnType<typeof setInterval> | null = null;
  let pendingFolders: Promise<Folder[] | null> | null = null;
  let pendingTags: Promise<Tag[] | null> | null = null;
  let listenersAttached = false;
  // jsdom 无 ResizeObserver(单测环境跳过高度重钳制)
  const resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => clampOverlayToViewport())
    : null;
  // 拖拽起点(dragstart 记录,dragover 据此判断位移与方向);target 为拖拽源元素,供批量图片收集
  let dragOrigin: { x: number; y: number; source: DragSource; target: Element | null } | null = null;
  // 部分站点会拦截 dragstart；提前在 pointerdown 捕获拖拽候选，供 dragover 恢复。
  let pointerOrigin: { x: number; y: number; source: DragSource; target: Element | null } | null = null;

  function sourceFromEvent(e: Event): DragSource | null {
    const target = e.target instanceof Element ? e.target : null;
    let source = resolveDragSource(target);
    for (const element of e.composedPath()) {
      if (source) break;
      if (element instanceof Element) source = resolveDragSource(element);
    }
    return source;
  }

  function onPointerDown(e: PointerEvent) {
    if (!enabled || e.button !== 0) return;
    const target = e.target instanceof Element ? e.target : null;
    const source = sourceFromEvent(e);
    pointerOrigin = source ? { x: e.clientX, y: e.clientY, source, target } : null;
    if (source) dbg.info('dragdrop', 'pointer candidate ready', { source, x: e.clientX, y: e.clientY });
  }

  function onPointerUp() {
    if (!dragOrigin) pointerOrigin = null;
  }

  function onDragStart(e: DragEvent) {
    if (!enabled) { dbg.info('dragdrop', 'dragstart ignored (disabled)'); return; }
    const target = e.target instanceof Element ? e.target : null;
    let source = sourceFromEvent(e) ?? pointerOrigin?.source ?? null;
    if (!source) {
      const transferredUrl = parseDrop(e).urls[0];
      if (transferredUrl) source = { url: transferredUrl, kind: urlKind(transferredUrl) };
    }
    const diagnostics = {
      tag: target?.tagName,
      className: target?.className,
      source,
      dataTransferTypes: Array.from(e.dataTransfer?.types ?? []),
      x: e.clientX,
      y: e.clientY,
    };
    if (!source) {
      dbg.warn('dragdrop', 'dragstart ignored (source unresolved)', diagnostics);
      return;
    }
    dbg.info('dragdrop', 'dragstart source resolved', diagnostics);
    // 只记录起点,不立即显示 —— 等鼠标移动超过阈值后按实际拖拽方向弹出
    dragOrigin = {
      x: pointerOrigin?.x ?? e.clientX,
      y: pointerOrigin?.y ?? e.clientY,
      source,
      target,
    };
    void fetchFolders(); // 预热文件夹拉取,移动达到阈值时已就绪
    void fetchTags(); // 预热标签拉取
  }

  /** document 级 dragover:判断位移,首次超过阈值时按拖拽方向显示浮层 */
  function onDragOverDoc(e: DragEvent) {
    // 浏览器只有在 dragover 被取消默认行为时才显示可放置光标。
    // 先统一接受文件/链接拖拽,再由浮层内部决定具体落点。
    const dragTypes = Array.from(e.dataTransfer?.types ?? []);
    const acceptsExternal = dragTypes.some(type => {
      const t = type.toLowerCase();
      return t === 'files' || t === 'text/plain' || t.includes('html') || t.includes('uri') || t.includes('url') || t.includes('nativeimage') || t.includes('pinterest');
    });
    if (acceptsExternal) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    }
    if (!dragOrigin && pointerOrigin) {
      dragOrigin = pointerOrigin;
      dbg.warn('dragdrop', 'dragstart missed, recovered from pointer candidate', { source: dragOrigin.source });
    }
    // 从文件管理器拖入页面时不会触发页面 dragstart;仅凭 dragover 的 Files 类型
    // 也应显示浮层,释放后由 LibraryTreeView 读取 dataTransfer.files 上传。
    if (!dragOrigin && e.dataTransfer?.types.some(type => type.toLowerCase() === 'files')) {
      dragOrigin = {
        x: e.clientX,
        y: e.clientY,
        source: { url: '', kind: 'image' },
        target: null,
      };
    }
    if (!dragOrigin || overlayHost) return; // 已显示或无起点不处理
    const externalFiles = !dragOrigin.target && dragOrigin.source.url === '';
    const dx = e.clientX - dragOrigin.x;
    const dy = e.clientY - dragOrigin.y;
    if (!externalFiles && Math.abs(dx) < SHOW_THRESHOLD && Math.abs(dy) < SHOW_THRESHOLD) return;
    dbg.log('dragdrop', 'dragover exceed threshold → show', { dx, dy });
    showOverlay(dragOrigin.source, dragOrigin.target, e.clientX, e.clientY, dx, dy);
  }

  function onDragEnd() {
    dbg.log('dragdrop', 'dragend → hideOverlay');
    dragOrigin = null;
    pointerOrigin = null;
    hideOverlay();
  }

  // drop 在 document 捕获阶段触发时,先让浮层节点完成自身 drop 处理,
  // 再清理全局状态,避免卸载组件导致 upload.files/upload.urls 丢失。
  function onDocumentDrop(e: DragEvent) {
    // 浮层内部 drop 由组件自己处理(诊断区或树节点);不要在 document 捕获阶段卸载它。
    if (overlayHost && e.composedPath().includes(overlayHost)) return;
    setTimeout(onDragEnd, 0);
  }

  /** 懒加载文件夹列表(dragstart 时触发,多次 dragstart 复用同一次请求) */
  function fetchFolders(): Promise<Folder[] | null> {
    if (!handlers.getFolders) { dbg.log('dragdrop', 'no getFolders handler'); return Promise.resolve(null); }
    if (!pendingFolders) {
      pendingFolders = handlers.getFolders().then(f => {
        const folders = Array.isArray(f) ? f : null;
        dbg.log('dragdrop', 'fetchFolders ok', { count: folders?.length ?? 0, valid: folders !== null });
        return folders;
      }).catch(e => {
        dbg.error('dragdrop', 'fetchFolders failed', e);
        return null;
      });
      // 下一次 dragstart 重新拉取
      setTimeout(() => { pendingFolders = null; }, 5000);
    }
    return pendingFolders;
  }

  /** 懒加载标签列表(与文件夹同策略) */
  function fetchTags(): Promise<Tag[] | null> {
    if (!handlers.getTags) return Promise.resolve(null);
    if (!pendingTags) {
      pendingTags = handlers.getTags().then(t => {
        const tags = Array.isArray(t) ? t : null;
        dbg.log('dragdrop', 'fetchTags ok', { count: tags?.length ?? 0, valid: tags !== null });
        return tags;
      }).catch(e => {
        dbg.error('dragdrop', 'fetchTags failed', e);
        return null;
      });
      setTimeout(() => { pendingTags = null; }, 5000);
    }
    return pendingTags;
  }

  function startAutoScroll(dir: -1 | 1) {
    stopAutoScroll();
    scrollTimer = setInterval(() => window.scrollBy(0, dir * SCROLL_STEP), 16);
  }
  function stopAutoScroll() {
    if (scrollTimer) { clearInterval(scrollTimer); scrollTimer = null; }
  }

  /** Folder/Tag 原始对象 → LibraryFlatItem(与扩展 useLibraryTree 的 adapt 一致,运行时字段相同) */
  function adaptFlat(raw: { id: number; title: string; parent_id?: number; color?: number; description?: string; icon?: string; sort_index?: number }): LibraryFlatItem {
    return {
      id: raw.id,
      title: raw.title,
      parent_id: typeof raw.parent_id === 'number' ? raw.parent_id : undefined,
      color: raw.color,
      description: raw.description,
      icon: raw.icon,
      sort_index: raw.sort_index,
    };
  }

  /** 浮层树数据服务:listFolders/listTags 走 handlers(未连接 → null,树显示空态);CRUD 透传可选 handlers */
  const treeServices: LibraryTreeServices = {
    async listFolders() {
      const list = await fetchFolders();
      return list?.map(adaptFlat) ?? null;
    },
    async listTags() {
      const list = await fetchTags();
      return list?.map(adaptFlat) ?? null;
    },
    async createNode(kind, libraryId, title, parentId) {
      if (handlers.createNode) return handlers.createNode(kind, libraryId, title, parentId);
      if (kind === 'folder' && handlers.createFolder) return handlers.createFolder(title);
      throw new Error('dragdrop: createNode 未注入');
    },
    async deleteNode(kind, libraryId, id, deleteFiles) {
      if (handlers.deleteNode) return handlers.deleteNode(kind, libraryId, id, deleteFiles);
      throw new Error('dragdrop: deleteNode 未注入');
    },
    updateNode: handlers.updateNode,
    updateSortIndex: handlers.updateSortIndex,
    moveNode: handlers.moveNode,
  };

  /** 浮层树上传服务:拖到节点释放 → 直接上传(direct);pick(右键「上传到此处」/工具栏) → 自定义上传对话框 */
  function makeUploadAdapter(source: DragSource): LibraryTreeUpload {
    return {
      files(files, target) {
        hideOverlay();
        for (const file of files) {
          handlers.onUpload({ file, sourceUrl: source.url, kind: source.kind, folderId: target?.folderId, tags: target?.tags });
        }
      },
      urls(urls, target) {
        hideOverlay();
        for (const url of urls) {
          handlers.onUpload({ url, kind: urlKind(url), folderId: target?.folderId, tags: target?.tags });
        }
      },
      pick() {
        hideOverlay();
        if (handlers.openCustomUpload) void handlers.openCustomUpload(source);
      },
    };
  }

  /** shadow host 上的页面级自动滚动(悬停视口顶/底);树内部滚动由组件自身 overflow 承担 */
  function attachAutoScroll(host: HTMLElement) {
    host.addEventListener('dragover', ev => {
      const y = ev.clientY;
      const vh = window.innerHeight;
      if (y < SCROLL_EDGE) startAutoScroll(-1);
      else if (y > vh - SCROLL_EDGE) startAutoScroll(1);
      else stopAutoScroll();
    });
    host.addEventListener('dragleave', ev => {
      // 仅当真正离开浮层才停(子元素切换也会触发 dragleave)
      if (ev.relatedTarget === null) stopAutoScroll();
    });
  }

  /** 异步列表填充后浮层高度增长,用最新高度重新钳制 top,防止内容超出视口底部 */
  function clampOverlayToViewport() {
    if (!overlayRoot) return;
    const top = parseFloat(overlayRoot.style.top);
    // 首次定位尚未完成时跳过(positionByDirection 会按最终尺寸计算)
    if (Number.isNaN(top)) return;
    overlayRoot.style.top = clampOverlayTop(top, overlayRoot.offsetHeight, window.innerHeight) + 'px';
  }

  /**
   * 把 overlay 定位到鼠标附近,方向沿拖拽方向延伸。
   * dx/dy 为自 dragstart 起的位移(用于判断主方向);越界时翻转到对侧。
   * 例:向右下拖 → 浮层出现在鼠标右下;向左上拖 → 左上。
   */
  function positionByDirection(x: number, y: number, dx: number, dy: number) {
    if (!overlayRoot) return;
    const el = overlayRoot;
    requestAnimationFrame(() => {
      if (overlayRoot !== el) return;
      const ow = el.offsetWidth;
      const oh = el.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const { left, top } = calculateOverlayPosition(x, y, dx, dy, ow, oh, vw, vh);
      el.style.left = left + 'px';
      el.style.top = top + 'px';
      el.classList.add('mira-ready');
      requestAnimationFrame(() => {
        if (overlayRoot !== el) return;
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const diagnostics = {
          connected: el.isConnected,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          zIndex: style.zIndex,
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        };
        if (
          !el.isConnected
          || style.display === 'none'
          || style.visibility === 'hidden'
          || rect.width === 0
          || rect.height === 0
        ) {
          dbg.error('dragdrop', 'overlay mounted but not visible', diagnostics);
          return;
        }
        dbg.info('dragdrop', 'overlay visible', diagnostics);
      });
    });
  }

  function showOverlay(source: DragSource, target: Element | null, x: number, y: number, dx: number, dy: number) {
    hideOverlay();
    dbg.info('dragdrop', 'showOverlay', { source, hasGetFolders: !!handlers.getFolders, hasGetTags: !!handlers.getTags, x, y, dx, dy });

    // 挂载在 Shadow DOM 内,隔离 Tailwind utilities / 主题变量与宿主页面
    const mount = document.createElement('div');
    mount.id = 'mira-dragdrop-host';
    document.documentElement.appendChild(mount);
    const shadow = mount.attachShadow({ mode: 'open' });
    const baseStyle = document.createElement('style');
    baseStyle.textContent = OVERLAY_BASE_CSS;
    shadow.appendChild(baseStyle);
    const cssUrl = typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? chrome.runtime.getURL(dragdropOverlayCssUrl.replace(/^\/+/, ''))
      : new URL(dragdropOverlayCssUrl, import.meta.url).href;
    // ShadowRoot 内的 <link> 在部分页面 CSP 下会被拦截;通过扩展上下文 fetch
    // 读取产物后写入 <style>,确保样式可用且仍不会泄漏到宿主文档。
    const shadowStyle = document.createElement('style');
    shadowStyle.dataset.miraDragdrop = 'tailwind';
    shadow.appendChild(shadowStyle);
    void fetch(cssUrl)
      .then(response => response.ok ? response.text() : Promise.reject(new Error(`CSS ${response.status}`)))
      .then(css => { shadowStyle.textContent = css; })
      .catch(error => {
        dbg.warn('dragdrop', 'shadow stylesheet fetch failed', { cssUrl, error });
      });

    vueApp = createApp(DragDropOverlay, {
      source,
      getLibraryId: handlers.getLibraryId ?? (async () => null),
      services: treeServices,
      upload: makeUploadAdapter(source),
      showCustomUpload: !!handlers.openCustomUpload,
      onUploadPayload: handlers.onUpload,
      onCustomUpload: () => {
        if (handlers.openCustomUpload) void handlers.openCustomUpload(source);
      },
      batchUrls: collectImagesUnder(target),
      onBatchImport: handlers.onBatchImport,
      onCopyUrls: handlers.onCopyUrls,
      onDropped: hideOverlay,
    });
    vueApp.mount(shadow);

    overlayHost = mount;
    overlayRoot = shadow.querySelector<HTMLElement>('.mira-overlay');
    // 树数据异步填充 → 高度变化 → 重钳制,防超出视口底部
    if (overlayRoot && resizeObserver) resizeObserver.observe(overlayRoot);
    attachAutoScroll(mount);
    positionByDirection(x, y, dx, dy);
  }

  function hideOverlay() {
    stopAutoScroll();
    resizeObserver?.disconnect();
    if (vueApp) {
      vueApp.unmount();
      vueApp = null;
    }
    if (overlayHost) {
      overlayHost.remove();
      overlayHost = null;
    }
    overlayRoot = null;
  }

  function detachListeners() {
    window.removeEventListener('pointerdown', onPointerDown, true);
    window.removeEventListener('pointerup', onPointerUp, true);
    document.removeEventListener('dragstart', onDragStart, true);
    document.removeEventListener('dragover', onDragOverDoc, true);
    document.removeEventListener('dragend', onDragEnd, true);
    document.removeEventListener('drop', onDocumentDrop, true);
    listenersAttached = false;
  }

  function attachListeners(force = false) {
    if (listenersAttached && !force) return;
    if (force) detachListeners();
    // pointerdown 放在 window 捕获阶段，尽量早于页面自己的拖拽拦截器。
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('dragstart', onDragStart, true);
    document.addEventListener('dragover', onDragOverDoc, true);
    document.addEventListener('dragend', onDragEnd, true);
    document.addEventListener('drop', onDocumentDrop, true);
    listenersAttached = true;
  }

  function health(): DragDropHealth {
    return {
      enabled,
      listenersAttached,
      documentConnected: document.documentElement.isConnected,
      baseStylePresent: !!document.getElementById('mira-overlay-base-style'),
      // 浮层 tailwind 样式随 crxjs content_scripts.css 注入,由浏览器保证存在
      dragStylePresent: true,
    };
  }

  function ensureReady() {
    if (destroyed) return;
    ensureOverlayStyles();
    // pageshow / visibilitychange 后重新绑定，覆盖页面冻结恢复和站点替换事件环境的情况。
    attachListeners(true);
  }

  function onPageResume() {
    if (!enabled || destroyed) return;
    dbg.info('dragdrop', 'page resumed, ensuring listeners', { type: 'pageshow' });
    ensureReady();
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') onPageResume();
  }

  ensureReady();
  window.addEventListener('pageshow', onPageResume);
  document.addEventListener('visibilitychange', onVisibilityChange);
  dbg.info('dragdrop', 'ready', health());
  const healthTimer = setInterval(() => {
    if (!enabled) return;
    const before = health();
    if (!before.baseStylePresent || !before.dragStylePresent || !before.listenersAttached) {
      dbg.warn('dragdrop', 'health check failed, repairing', before);
      ensureReady();
      dbg.info('dragdrop', 'health repaired', health());
    }
  }, HEALTH_CHECK_INTERVAL);

  const controller: DragDropController = {
    setEnabled(v) {
      if (destroyed) return;
      enabled = v;
      if (v) ensureReady();
      else { dragOrigin = null; pointerOrigin = null; hideOverlay(); }
      dbg.info('dragdrop', 'setEnabled', health());
    },
    health,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearInterval(healthTimer);
      hideOverlay();
      dragOrigin = null;
      pointerOrigin = null;
      window.removeEventListener('pageshow', onPageResume);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      detachListeners();
      if (controllerHost[CONTROLLER_KEY] === controller) delete controllerHost[CONTROLLER_KEY];
    },
  };
  controllerHost[CONTROLLER_KEY] = controller;
  return controller;
}
