import type { Folder } from 'mira-app-core/shared/sdk';
import { dbg } from '@/shared/debug';
import { urlKind } from '@/shared/drag-data';
import type { ResourceKind } from '@/shared/types';

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
}

export interface DragDropHandlers {
  onUpload: (payload: DragDropPayload) => void;
  /** 取当前素材库的文件夹列表(用于浮层右侧目录);可选,无则不显示目录区 */
  getFolders?: () => Promise<Folder[]>;
}

export interface DragDropController {
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

const POPOVER_Z = 2147483646; // 仅次于选区覆盖层
const SCROLL_EDGE = 48; // 距视口顶/底多少像素触发自动滚动
const SCROLL_STEP = 12; // 每帧滚动像素
const SHOW_THRESHOLD = 8; // 拖拽超过此距离(px)才显示浮层,过滤点击误触

export interface DragSource {
  url: string;
  kind: ResourceKind;
}

/** 解析页面内可拖拽的媒体或链接；链接包裹媒体时优先媒体本身。 */
export function resolveDragSource(target: Element | null): DragSource | null {
  const element = target?.closest('img, video, a[href]');
  if (!element) return null;

  if (element instanceof HTMLImageElement) {
    const url = element.currentSrc || element.src;
    return url ? { url, kind: 'image' } : null;
  }
  if (element instanceof HTMLVideoElement) {
    const url = element.currentSrc || element.src || element.querySelector('source')?.src;
    return url ? { url, kind: 'video' } : null;
  }

  const nestedMedia = element.querySelector('img, video');
  if (nestedMedia) {
    const mediaSource = resolveDragSource(nestedMedia);
    if (mediaSource) return mediaSource;
  }
  const url = (element as HTMLAnchorElement).href;
  return url ? { url, kind: urlKind(url) } : null;
}

export function createDragDrop(handlers: DragDropHandlers): DragDropController {
  let enabled = true;
  let overlay: HTMLDivElement | null = null;
  let scrollTimer: ReturnType<typeof setInterval> | null = null;
  let pendingFolders: Promise<Folder[]> | null = null;
  // 拖拽起点(dragstart 记录,dragover 据此判断位移与方向)
  let dragOrigin: { x: number; y: number; source: DragSource } | null = null;

  function onDragStart(e: DragEvent) {
    if (!enabled) { dbg.log('dragdrop', 'dragstart ignored (disabled)'); return; }
    const target = e.target instanceof Element ? e.target : null;
    const source = resolveDragSource(target);
    dbg.log('dragdrop', 'dragstart', { tag: target?.tagName, source, enabled, x: e.clientX, y: e.clientY });
    if (!source) return;
    // 只记录起点,不立即显示 —— 等鼠标移动超过阈值后按实际拖拽方向弹出
    dragOrigin = { x: e.clientX, y: e.clientY, source };
    void fetchFolders(); // 预热文件夹拉取,移动达到阈值时已就绪
  }

  /** document 级 dragover:判断位移,首次超过阈值时按拖拽方向显示浮层 */
  function onDragOverDoc(e: DragEvent) {
    if (!dragOrigin || overlay) return; // 已显示或无起点不处理
    const dx = e.clientX - dragOrigin.x;
    const dy = e.clientY - dragOrigin.y;
    if (Math.abs(dx) < SHOW_THRESHOLD && Math.abs(dy) < SHOW_THRESHOLD) return;
    dbg.log('dragdrop', 'dragover exceed threshold → show', { dx, dy });
    showOverlay(dragOrigin.source, e.clientX, e.clientY, dx, dy);
  }

  function onDragEnd() {
    dbg.log('dragdrop', 'dragend → hideOverlay');
    dragOrigin = null;
    hideOverlay();
  }

  /** 懒加载文件夹列表(dragstart 时触发,多次 dragstart 复用同一次请求) */
  function fetchFolders(): Promise<Folder[]> {
    if (!handlers.getFolders) { dbg.log('dragdrop', 'no getFolders handler'); return Promise.resolve([]); }
    if (!pendingFolders) {
      pendingFolders = handlers.getFolders().then(f => {
        dbg.log('dragdrop', 'fetchFolders ok', { count: f.length });
        return f;
      }).catch(e => {
        dbg.error('dragdrop', 'fetchFolders failed', e);
        return [] as Folder[];
      });
      // 下一次 dragstart 重新拉取
      setTimeout(() => { pendingFolders = null; }, 5000);
    }
    return pendingFolders;
  }

  function startAutoScroll(dir: -1 | 1) {
    stopAutoScroll();
    scrollTimer = setInterval(() => window.scrollBy(0, dir * SCROLL_STEP), 16);
  }
  function stopAutoScroll() {
    if (scrollTimer) { clearInterval(scrollTimer); scrollTimer = null; }
  }

  function makeDropZone(label: string, folderId: number | undefined, source: DragSource): HTMLDivElement {
    const zone = document.createElement('div');
    zone.className = 'mira-dropzone';
    zone.textContent = label;
    zone.addEventListener('dragover', ev => { ev.preventDefault(); zone.classList.add('mira-hover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('mira-hover'));
    zone.addEventListener('drop', ev => {
      ev.preventDefault();
      hideOverlay();
      const dtFile = ev.dataTransfer?.files?.[0];
      dbg.info('dragdrop', 'drop', { hasFile: !!dtFile, folderId, source });
      if (dtFile) {
        handlers.onUpload({ file: dtFile, sourceUrl: source.url, kind: source.kind, folderId });
        return;
      }
      handlers.onUpload({ url: source.url, kind: source.kind, folderId });
    });
    return zone;
  }

  /**
   * 把 overlay 定位到鼠标附近,方向沿拖拽方向延伸。
   * dx/dy 为自 dragstart 起的位移(用于判断主方向);越界时翻转到对侧。
   * 例:向右下拖 → 浮层出现在鼠标右下;向左上拖 → 左上。
   */
  function positionByDirection(x: number, y: number, dx: number, dy: number) {
    if (!overlay) return;
    const MARGIN = 12;
    requestAnimationFrame(() => {
      if (!overlay) return;
      const ow = overlay.offsetWidth;
      const oh = overlay.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // 主方向:|dx|>=|dy| 按水平,否则按垂直
      const horiz = Math.abs(dx) >= Math.abs(dy);
      let left: number, top: number;
      if (horiz) {
        // 水平为主:沿 x 方向延伸(右拖→右侧,左拖→左侧),垂直居中于鼠标
        left = dx >= 0 ? x + MARGIN : x - MARGIN - ow;
        top = y - oh / 2;
      } else {
        // 垂直为主:沿 y 方向延伸(下拖→下方,上拖→上方),水平居中于鼠标
        left = x - ow / 2;
        top = dy >= 0 ? y + MARGIN : y - MARGIN - oh;
      }
      // 越界翻转/钳制
      if (left + ow > vw - 8) left = Math.max(8, vw - ow - 8);
      if (left < 8) left = 8;
      if (top + oh > vh - 8) top = Math.max(8, vh - oh - 8);
      if (top < 8) top = 8;
      overlay.style.left = left + 'px';
      overlay.style.top = top + 'px';
      overlay.classList.add('mira-ready');
    });
  }

  function showOverlay(source: DragSource, x: number, y: number, dx: number, dy: number) {
    hideOverlay();
    dbg.info('dragdrop', 'showOverlay', { source, hasGetFolders: !!handlers.getFolders, x, y, dx, dy });
    overlay = document.createElement('div');
    overlay.className = 'mira-overlay';

    const header = document.createElement('div');
    header.className = 'mira-overlay-title';
    header.textContent = '拖到下方上传到 Mira';
    overlay.appendChild(header);

    const body = document.createElement('div');
    body.className = 'mira-overlay-body';

    // 左侧:不设文件夹(根区)
    const root = makeDropZone('📂 不设文件夹', undefined, source);
    root.classList.add('mira-root');
    body.appendChild(root);

    // 右侧:文件夹列表
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
      listScroll.removeChild(loading);
      if (!folders.length) {
        const empty = document.createElement('div');
        empty.className = 'mira-folder-item mira-empty';
        empty.textContent = '暂无文件夹';
        listScroll.appendChild(empty);
        return;
      }
      for (const f of folders) {
        const zone = makeDropZone('📁 ' + (f.title || `#${f.id}`), f.id, source);
        zone.classList.add('mira-folder-item');
        listScroll.appendChild(zone);
      }
    });

    body.appendChild(listWrap);
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

  // 注入样式(仅一次)
  ensureStyles();

  // 捕获阶段,确保先于页面处理
  document.addEventListener('dragstart', onDragStart, true);
  document.addEventListener('dragover', onDragOverDoc, true);
  document.addEventListener('dragend', onDragEnd, true);
  document.addEventListener('drop', onDragEnd, true);

  return {
    setEnabled(v) { enabled = v; if (!v) { dragOrigin = null; hideOverlay(); } },
    destroy() {
      hideOverlay();
      dragOrigin = null;
      document.removeEventListener('dragstart', onDragStart, true);
      document.removeEventListener('dragover', onDragOverDoc, true);
      document.removeEventListener('dragend', onDragEnd, true);
      document.removeEventListener('drop', onDragEnd, true);
    },
  };
}

let stylesInjected = false;
function ensureStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.id = 'mira-dragdrop-style';
  style.textContent = `
.mira-overlay {
  position: fixed; left: 0; top: 0;
  z-index: ${POPOVER_Z};
  width: min(440px, 92vw); max-height: 80vh;
  background: rgba(24,24,27,.96); color: #fafafa;
  border: 1px solid #3f3f46; border-radius: 12px;
  font: 13px/1.5 system-ui, -apple-system, sans-serif;
  box-shadow: 0 8px 32px rgba(0,0,0,.4);
  display: flex; flex-direction: column; overflow: hidden;
  user-select: none;
  visibility: hidden;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity .16s ease-out, transform .16s ease-out;
}
.mira-overlay.mira-ready { visibility: visible; opacity: 1; transform: translateY(0); }
.mira-overlay-title { padding: 10px 14px; font-weight: 600; border-bottom: 1px solid #3f3f46; }
.mira-overlay-body { display: flex; gap: 8px; padding: 12px; min-height: 0; }
.mira-dropzone {
  border: 2px dashed #52525b; border-radius: 8px;
  padding: 14px 10px; text-align: center; color: #a1a1aa;
  cursor: copy; transition: border-color .12s, background .12s, color .12s;
  flex-shrink: 0;
}
.mira-dropzone.mira-hover { border-color: #4ade80; background: rgba(74,222,128,.12); color: #fafafa; }
.mira-root { width: 130px; display: flex; align-items: center; justify-content: center; }
.mira-folder-list { flex: 1; display: flex; flex-direction: column; min-width: 0; border-left: 1px solid #3f3f46; padding-left: 8px; }
.mira-folder-list-title { font-size: 11px; color: #71717a; margin-bottom: 6px; text-transform: uppercase; }
.mira-folder-scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; max-height: 50vh; }
.mira-folder-item { width: 100%; box-sizing: border-box; }
.mira-folder-scroll::-webkit-scrollbar { width: 6px; }
.mira-folder-scroll::-webkit-scrollbar-thumb { background: #52525b; border-radius: 3px; }
.mira-loading, .mira-empty { border: none; color: #71717a; padding: 8px; }
`;
  document.documentElement.appendChild(style);
}
