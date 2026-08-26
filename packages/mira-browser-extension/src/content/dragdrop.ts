import type { Folder, Tag } from 'mira-app-core/shared/sdk';
import { dbg } from '@/shared/debug';
import { parseDrop, urlKind } from '@/shared/drag-data';
import type { ResourceKind } from '@/shared/types';
import { ensureOverlayStyles, OVERLAY_Z } from './overlay/styles';

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
  /** 拖到标签 chip 上释放时携带的标签(tag id) */
  tags?: string[];
}

export interface DragDropHandlers {
  onUpload: (payload: DragDropPayload) => void;
  /** “自定义上传”落点由侧边栏内部完整表单接管。 */
  openCustomUpload?: (source: DragSource) => void | Promise<void>;
  /** 取当前素材库的文件夹列表;未连接素材库时返回 null */
  getFolders?: () => Promise<Folder[] | null>;
  /** 取当前素材库的标签列表(用于浮层右侧标签 drop zones);未连接素材库时返回 null */
  getTags?: () => Promise<Tag[] | null>;
  /**
   * 新建文件夹(在拖拽浮层「➕ 新建文件夹」drop zone 中触发)。
   * 返回新文件夹 id;失败返回 null(由调用方静默或提示)。
   */
  createFolder?: (title: string) => Promise<number | null>;
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

const POPOVER_Z = OVERLAY_Z; // 仅次于选区覆盖层
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
  let overlay: HTMLDivElement | null = null;
  let scrollTimer: ReturnType<typeof setInterval> | null = null;
  let pendingFolders: Promise<Folder[] | null> | null = null;
  let pendingTags: Promise<Tag[] | null> | null = null;
  let listenersAttached = false;
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
    if (!dragOrigin && pointerOrigin) {
      dragOrigin = pointerOrigin;
      dbg.warn('dragdrop', 'dragstart missed, recovered from pointer candidate', { source: dragOrigin.source });
    }
    if (!dragOrigin || overlay) return; // 已显示或无起点不处理
    const dx = e.clientX - dragOrigin.x;
    const dy = e.clientY - dragOrigin.y;
    if (Math.abs(dx) < SHOW_THRESHOLD && Math.abs(dy) < SHOW_THRESHOLD) return;
    dbg.log('dragdrop', 'dragover exceed threshold → show', { dx, dy });
    showOverlay(dragOrigin.source, dragOrigin.target, e.clientX, e.clientY, dx, dy);
  }

  function onDragEnd() {
    dbg.log('dragdrop', 'dragend → hideOverlay');
    dragOrigin = null;
    pointerOrigin = null;
    hideOverlay();
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

  function makeDropZone(
    label: string,
    folderId: number | undefined,
    source: DragSource,
    tags?: string[],
  ): HTMLDivElement {
    const zone = document.createElement('div');
    zone.className = 'mira-dropzone';
    zone.textContent = label;
    zone.addEventListener('dragover', ev => { ev.preventDefault(); zone.classList.add('mira-hover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('mira-hover'));
    zone.addEventListener('drop', ev => {
      ev.preventDefault();
      hideOverlay();
      const dtFile = ev.dataTransfer?.files?.[0];
      dbg.info('dragdrop', 'drop', { hasFile: !!dtFile, folderId, tags, source });
      if (dtFile) {
        handlers.onUpload({ file: dtFile, sourceUrl: source.url, kind: source.kind, folderId, tags });
        return;
      }
      handlers.onUpload({ url: source.url, kind: source.kind, folderId, tags });
    });
    return zone;
  }

  /**
   * 动作型 drop zone(批量导入/批量复制 url):释放即执行 action,
   * 不走 onUpload,与 makeDropZone 的文件夹/标签上传语义区分。
   */
  function makeActionZone(label: string, action: () => void): HTMLDivElement {
    const zone = document.createElement('div');
    zone.className = 'mira-dropzone mira-action-zone';
    zone.textContent = label;
    zone.addEventListener('dragover', ev => { ev.preventDefault(); zone.classList.add('mira-hover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('mira-hover'));
    zone.addEventListener('drop', ev => {
      ev.preventDefault();
      zone.classList.remove('mira-hover');
      hideOverlay();
      action();
    });
    return zone;
  }

  /**
   * 「➕ 新建文件夹」drop zone:接住拖拽后,把 overlay 内容替换为内联输入框,
   * 用户输入文件夹名称 → 调 handlers.createFolder → 用返回的新 id 调 onUpload。
   * 任意环节取消(ESC / 点取消) → 关闭浮层。
   */
  function makeCustomUploadZone(source: DragSource): HTMLDivElement {
    const zone = document.createElement('div');
    zone.className = 'mira-dropzone';
    zone.textContent = '➕ 新建文件夹';
    zone.addEventListener('dragover', ev => { ev.preventDefault(); zone.classList.add('mira-hover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('mira-hover'));
    zone.addEventListener('drop', ev => {
      ev.preventDefault();
      zone.classList.remove('mira-hover');
      hideOverlay();
      if (handlers.openCustomUpload) {
        void handlers.openCustomUpload(source);
      } else {
        showCreateFolderPrompt(source, ev.dataTransfer?.files?.[0]);
      }
    });
    return zone;
  }

  /**
   * 内联输入:在 overlay 内渲染一个轻量表单收集新文件夹名称。
   * dtFile 来自拖拽的本地文件(若有),提交后连同 source 一起 onUpload。
   */
  function showCreateFolderPrompt(source: DragSource, dtFile?: File) {
    const dlg = document.createElement('div');
    dlg.className = 'mira-overlay mira-ready';
    dlg.style.width = '300px';

    const title = document.createElement('div');
    title.className = 'mira-overlay-title';
    title.textContent = '新建文件夹并上传';
    dlg.appendChild(title);

    // [新建文件夹弹窗 body]
    // 这里只承载文件夹名称输入、错误提示和确认/取消按钮；
    // 不要在这里加入拖拽浮层的根区、文件夹/标签列表或连接空态逻辑。
    const body = document.createElement('div');
    body.className = 'mira-overlay-body';

    body.style.flexDirection = 'column';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '文件夹名称';
    input.value = '新建文件夹';
    body.appendChild(input);

    const err = document.createElement('div');
    err.className = 'mira-error';
    err.style.minHeight = '16px';
    body.appendChild(err);

    const ops = document.createElement('div');
    ops.style.display = 'flex';
    ops.style.gap = '8px';
    ops.style.justifyContent = 'flex-end';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    const okBtn = document.createElement('button');
    okBtn.className = 'mira-primary';
    okBtn.textContent = '创建并上传';
    ops.appendChild(cancelBtn);
    ops.appendChild(okBtn);
    body.appendChild(ops);

    dlg.appendChild(body);
    document.documentElement.appendChild(dlg);
    overlay = dlg;
    input.focus();
    input.select();

    let busy = false;
    function close() {
      if (overlay === dlg) { dlg.remove(); overlay = null; }
    }
    async function submit() {
      if (busy) return;
      const name = input.value.trim();
      if (!name) { err.textContent = '请输入文件夹名称'; return; }
      if (!handlers.createFolder) { err.textContent = '无法创建文件夹'; return; }
      busy = true;
      okBtn.disabled = true;
      okBtn.textContent = '创建中…';
      err.textContent = '';
      try {
        const id = await handlers.createFolder(name);
        if (id == null) { err.textContent = '创建失败'; busy = false; okBtn.disabled = false; okBtn.textContent = '创建并上传'; return; }
        // 创建成功:上传(本地 file 走 UPLOAD_FILES 路径;仅 url 走 url 路径)
        if (dtFile) {
          handlers.onUpload({ file: dtFile, sourceUrl: source.url, kind: source.kind, folderId: id });
        } else {
          handlers.onUpload({ url: source.url, kind: source.kind, folderId: id });
        }
        close();
      } catch (e: any) {
        err.textContent = e?.message ?? '创建失败';
        busy = false;
        okBtn.disabled = false;
        okBtn.textContent = '创建并上传';
      }
    }
    okBtn.addEventListener('click', submit);
    cancelBtn.addEventListener('click', close);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
  }

  /** 异步列表填充后浮层高度增长,用最新高度重新钳制 top,防止内容超出视口底部 */
  function clampOverlayToViewport() {
    if (!overlay) return;
    const top = parseFloat(overlay.style.top);
    // 首次定位尚未完成时跳过(positionByDirection 会按最终尺寸计算)
    if (Number.isNaN(top)) return;
    overlay.style.top = clampOverlayTop(top, overlay.offsetHeight, window.innerHeight) + 'px';
  }

  /**
   * 把 overlay 定位到鼠标附近,方向沿拖拽方向延伸。
   * dx/dy 为自 dragstart 起的位移(用于判断主方向);越界时翻转到对侧。
   * 例:向右下拖 → 浮层出现在鼠标右下;向左上拖 → 左上。
   */
  function positionByDirection(x: number, y: number, dx: number, dy: number) {
    if (!overlay) return;
    requestAnimationFrame(() => {
      if (!overlay) return;
      const ow = overlay.offsetWidth;
      const oh = overlay.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const { left, top } = calculateOverlayPosition(x, y, dx, dy, ow, oh, vw, vh);
      overlay.style.left = left + 'px';
      overlay.style.top = top + 'px';
      overlay.classList.add('mira-ready');
      requestAnimationFrame(() => {
        if (!overlay) return;
        const style = getComputedStyle(overlay);
        const rect = overlay.getBoundingClientRect();
        const diagnostics = {
          connected: overlay.isConnected,
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
          !overlay.isConnected
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
    overlay = document.createElement('div');
    overlay.className = 'mira-overlay mira-dragdrop';

    const header = document.createElement('div');
    header.className = 'mira-overlay-title';
    header.textContent = '拖到下方上传到 Mira';
    overlay.appendChild(header);

    // [当前目标拖拽浮层 body]
    // 这里承载根目录、文件夹/标签 drop zone；连接错误时由 showUnavailableState
    // 将本 body 替换为“拖拽到此处侧边栏打开窗口”的中心空态。
    // 与上方 showCreateFolderPrompt() 内的“新建文件夹弹窗 body”完全不同。
    const body = document.createElement('div');
    body.className = 'mira-overlay-body';

    let connectionError = false;
    function showUnavailableState() {
      if (body.parentNode !== overlay) return;
      header.textContent = folderEmptyMessage(null);
      body.className = 'mira-overlay-body mira-empty-state';
      body.replaceChildren();
      const empty = document.createElement('div');
      // 未连接到素材库时仍保留拖拽入口：释放文件后打开侧边栏完成自定义上传。
      empty.className = 'mira-empty-state-dropzone';
      empty.textContent = '未连接到素材库，将文件拖拽到此处打开侧边栏';
      empty.addEventListener('dragover', event => {
        event.preventDefault();
        empty.classList.add('mira-hover');
      });
      empty.addEventListener('dragleave', () => empty.classList.remove('mira-hover'));
      empty.addEventListener('drop', event => {
        event.preventDefault();
        empty.classList.remove('mira-hover');
        hideOverlay();
        if (handlers.openCustomUpload) {
          void handlers.openCustomUpload(source);
        } else {
          showCreateFolderPrompt(source, event.dataTransfer?.files?.[0]);
        }
      });
      body.appendChild(empty);
    }

    // 顶部 drop zones:「不设文件夹(根区)」+「新建文件夹」各占一半
    const topRow = document.createElement('div');
    topRow.className = 'mira-top-zones';
    const root = makeDropZone('📂 不设文件夹', undefined, source);
    root.classList.add('mira-root');
    topRow.appendChild(root);

    // 「➕ 新建文件夹」:拖到此 zone → 不立即上传,改为弹内联输入框收集名称 → 创建 → 上传
    if (handlers.createFolder) {
      const newZone = makeCustomUploadZone(source);
      newZone.textContent = '⚙ 自定义上传';
      newZone.classList.add('mira-root', 'mira-custom-upload');
      topRow.appendChild(newZone);
    }
    body.appendChild(topRow);

    // 拖拽源元素下有多张图片时,追加「批量导入 / 批量复制url」动作区
    const batchUrls = collectImagesUnder(target);
    if (batchUrls.length >= 2 && (handlers.onBatchImport || handlers.onCopyUrls)) {
      dbg.info('dragdrop', 'batch actions available', { count: batchUrls.length });
      const batchRow = document.createElement('div');
      batchRow.className = 'mira-batch-zones';
      if (handlers.onBatchImport) {
        batchRow.appendChild(makeActionZone(`🖼 批量导入(${batchUrls.length})`, () => handlers.onBatchImport!(batchUrls)));
      }
      if (handlers.onCopyUrls) {
        batchRow.appendChild(makeActionZone('🔗 批量复制url', () => handlers.onCopyUrls!(batchUrls)));
      }
      body.appendChild(batchRow);
    }

    // 下方两栏:左文件夹列表 | 右标签列表
    const cols = document.createElement('div');
    cols.className = 'mira-cols';

    // 左栏:文件夹列表
    const listWrap = document.createElement('div');
    listWrap.className = 'mira-folder-list';
    const listTitle = document.createElement('div');
    listTitle.className = 'mira-folder-list-title';
    listTitle.textContent = '文件夹';
    listWrap.appendChild(listTitle);
    const listScroll = document.createElement('div');
    listScroll.className = 'mira-folder-scroll';
    listWrap.appendChild(listScroll);

    // 占位:加载中
    const loading = document.createElement('div');
    loading.className = 'mira-folder-item mira-loading';
    loading.textContent = '加载中…';
    listScroll.appendChild(loading);

    // 异步填充文件夹
    fetchFolders().then(folders => {
      connectionError = folders === null;
      if (connectionError) showUnavailableState();
      if (loading.parentNode === listScroll) listScroll.removeChild(loading);
      if (!Array.isArray(folders) || folders.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'mira-folder-item mira-empty';
        empty.textContent = folderEmptyMessage(Array.isArray(folders) ? folders : null);
        listScroll.appendChild(empty);
        return;
      }
      for (const f of folders) {
        const zone = makeDropZone('📁 ' + (f.title || `#${f.id}`), f.id, source);
        zone.classList.add('mira-folder-item');
        listScroll.appendChild(zone);
      }
      clampOverlayToViewport();
    });
    cols.appendChild(listWrap);

    // 右栏:标签列表(drop 即上传到根区并打上该标签)
    if (handlers.getTags) {
      const tagWrap = document.createElement('div');
      tagWrap.className = 'mira-tag-list';
      const tagTitle = document.createElement('div');
      tagTitle.className = 'mira-folder-list-title';
      tagTitle.textContent = '标签(拖到标签上释放)';
      tagWrap.appendChild(tagTitle);
      const tagScroll = document.createElement('div');
      tagScroll.className = 'mira-tag-scroll';
      tagWrap.appendChild(tagScroll);

      const tagLoading = document.createElement('div');
      tagLoading.className = 'mira-folder-item mira-loading';
      tagLoading.textContent = '加载中…';
      tagScroll.appendChild(tagLoading);

      fetchTags().then(tags => {
        connectionError = connectionError || tags === null;
        if (connectionError) showUnavailableState();
        if (tagLoading.parentNode === tagScroll) tagScroll.removeChild(tagLoading);
        if (!Array.isArray(tags) || tags.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'mira-folder-item mira-empty';
          empty.textContent = Array.isArray(tags) ? '暂无标签' : '未连接素材库';
          tagScroll.appendChild(empty);
          return;
        }
        for (const t of tags) {
          // tags 传 tag id(与客户端直传一致,服务器按 id 存 FileData.tags)
          const zone = makeDropZone('#' + t.title, undefined, source, [String(t.id)]);
          zone.classList.add('mira-tag-chip');
          zone.title = '释放即上传并打上该标签';
          tagScroll.appendChild(zone);
        }
        clampOverlayToViewport();
      });
      cols.appendChild(tagWrap);
    }

    body.appendChild(cols);
    overlay.appendChild(body);

    // hover 顶部/底部 → 自动滚动页面;悬停列表内部顶/底 → 滚动列表
    overlay.addEventListener('dragover', ev => {
      const y = ev.clientY;
      const vh = window.innerHeight;
      if (y < SCROLL_EDGE) startAutoScroll(-1);
      else if (y > vh - SCROLL_EDGE) startAutoScroll(1);
      else {
        // 列表内部边缘
        const r = listScroll.getBoundingClientRect();
        const ly = y - r.top;
        if (ly < SCROLL_EDGE && listScroll.scrollTop > 0) scrollList(-1, listScroll);
        else if (ly > r.height - SCROLL_EDGE && listScroll.scrollTop + r.height < listScroll.scrollHeight) scrollList(1, listScroll);
        else stopAutoScroll();
      }
    });
    overlay.addEventListener('dragleave', ev => {
      // 仅当真正离开 overlay 才停(子元素切换也会触发 dragleave)
      if (ev.relatedTarget === null) stopAutoScroll();
    });

    document.documentElement.appendChild(overlay);
    positionByDirection(x, y, dx, dy);
  }

  /** 滚动文件夹列表(独立于页面滚动) */
  function scrollList(dir: -1 | 1, el: HTMLElement) {
    stopAutoScroll();
    scrollTimer = setInterval(() => { el.scrollTop += dir * SCROLL_STEP; }, 16);
  }

  function hideOverlay() {
    stopAutoScroll();
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  function detachListeners() {
    window.removeEventListener('pointerdown', onPointerDown, true);
    window.removeEventListener('pointerup', onPointerUp, true);
    document.removeEventListener('dragstart', onDragStart, true);
    document.removeEventListener('dragover', onDragOverDoc, true);
    document.removeEventListener('dragend', onDragEnd, true);
    document.removeEventListener('drop', onDragEnd, true);
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
    document.addEventListener('drop', onDragEnd, true);
    listenersAttached = true;
  }

  function health(): DragDropHealth {
    return {
      enabled,
      listenersAttached,
      documentConnected: document.documentElement.isConnected,
      baseStylePresent: !!document.getElementById('mira-overlay-base-style'),
      dragStylePresent: !!document.getElementById('mira-dragdrop-style'),
    };
  }

  function ensureReady() {
    if (destroyed) return;
    ensureOverlayStyles();
    ensureStyles();
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

let stylesInjected = false;
function ensureStyles() {
  if (document.getElementById('mira-dragdrop-style')) {
    stylesInjected = true;
    return;
  }
  stylesInjected = true;
  // 仅注入 dragdrop 专属布局样式;基础样式由 ensureOverlayStyles 注入。
  const style = document.createElement('style');
  style.id = 'mira-dragdrop-style';
  style.textContent = `
.mira-dragdrop .mira-overlay-body { flex-direction: column; }
.mira-dragdrop .mira-overlay-body.mira-empty-state { min-height: 120px; align-items: center; justify-content: center; color: #71717a; text-align: center; }
.mira-empty-state-dropzone { width: 100%; box-sizing: border-box; padding: 28px 16px; border: 2px dashed #52525b; border-radius: 8px; cursor: copy; transition: border-color .12s, background .12s, color .12s; }
.mira-empty-state-dropzone.mira-hover { border-color: #4ade80; background: rgba(74,222,128,.12); color: #fafafa; }
.mira-top-zones { display: flex; gap: 8px; }
.mira-top-zones .mira-dropzone { flex: 1; width: auto; }
.mira-batch-zones { display: flex; gap: 8px; }
.mira-batch-zones .mira-dropzone { flex: 1; width: auto; padding: 10px 8px; font-size: 12px; }
.mira-custom-upload { border-style: dotted; color: #71717a; }
.mira-custom-upload.mira-hover { color: #fafafa; }
.mira-cols { display: flex; gap: 8px; min-height: 0; flex: 1; }
.mira-tag-list { flex: 1; display: flex; flex-direction: column; min-width: 0; border-left: 1px solid #3f3f46; padding-left: 8px; }
.mira-tag-scroll { flex: 1; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 6px; align-content: flex-start; max-height: 50vh; }
.mira-tag-chip { padding: 4px 10px; border-radius: 9999px; font-size: 12px; }
`;
  document.documentElement.appendChild(style);
}
