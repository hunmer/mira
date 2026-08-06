import type { Folder } from 'mira-app-core/shared/sdk';

export interface DragDropPayload {
  /** 已有 File(本地拖动文件) */
  file?: File;
  /** 或仅有 url(网页图片) */
  url?: string;
  kind: 'image' | 'video';
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

export function createDragDrop(handlers: DragDropHandlers): DragDropController {
  let enabled = true;
  let overlay: HTMLDivElement | null = null;
  let scrollTimer: ReturnType<typeof setInterval> | null = null;
  let pendingFolders: Promise<Folder[]> | null = null;

  function onDragStart(e: DragEvent) {
    if (!enabled) return;
    const target = e.target as HTMLElement;
    const isImg = target?.tagName === 'IMG';
    const isVideo = target?.tagName === 'VIDEO';
    if (!isImg && !isVideo) return;
    showOverlay(isVideo ? 'video' : 'image', target);
  }

  function onDragEnd() {
    hideOverlay();
  }

  /** 懒加载文件夹列表(dragstart 时触发,多次 dragstart 复用同一次请求) */
  function fetchFolders(): Promise<Folder[]> {
    if (!handlers.getFolders) return Promise.resolve([]);
    if (!pendingFolders) {
      pendingFolders = handlers.getFolders().catch(() => [] as Folder[]);
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

  function makeDropZone(label: string, folderId: number | undefined, kind: 'image' | 'video', target: HTMLElement): HTMLDivElement {
    const zone = document.createElement('div');
    zone.className = 'mira-dropzone';
    zone.textContent = label;
    zone.addEventListener('dragover', ev => { ev.preventDefault(); zone.classList.add('mira-hover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('mira-hover'));
    zone.addEventListener('drop', ev => {
      ev.preventDefault();
      hideOverlay();
      const dtFile = ev.dataTransfer?.files?.[0];
      if (dtFile) {
        handlers.onUpload({ file: dtFile, kind, folderId });
        return;
      }
      const url = (target as HTMLImageElement).currentSrc || (target as HTMLImageElement).src;
      if (url) handlers.onUpload({ url, kind, folderId });
    });
    return zone;
  }

  function showOverlay(kind: 'image' | 'video', target: HTMLElement) {
    hideOverlay();
    overlay = document.createElement('div');
    overlay.className = 'mira-overlay';

    const header = document.createElement('div');
    header.className = 'mira-overlay-title';
    header.textContent = '拖到下方上传到 Mira';
    overlay.appendChild(header);

    const body = document.createElement('div');
    body.className = 'mira-overlay-body';

    // 左侧:不设文件夹(根区)
    const root = makeDropZone('📂 不设文件夹', undefined, kind, target);
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
        const zone = makeDropZone('📁 ' + (f.title || `#${f.id}`), f.id, kind, target);
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
  document.addEventListener('dragend', onDragEnd, true);
  document.addEventListener('drop', onDragEnd, true);

  return {
    setEnabled(v) { enabled = v; if (!v) hideOverlay(); },
    destroy() {
      hideOverlay();
      document.removeEventListener('dragstart', onDragStart, true);
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
  position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%);
  z-index: ${POPOVER_Z};
  width: min(440px, 92vw); max-height: 80vh;
  background: rgba(24,24,27,.96); color: #fafafa;
  border: 1px solid #3f3f46; border-radius: 12px;
  font: 13px/1.5 system-ui, -apple-system, sans-serif;
  box-shadow: 0 8px 32px rgba(0,0,0,.4);
  display: flex; flex-direction: column; overflow: hidden;
  user-select: none;
}
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
