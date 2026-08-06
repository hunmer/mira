export interface DragDropPayload {
  /** 已有 File(本地拖动文件) */
  file?: File;
  /** 或仅有 url(网页图片) */
  url?: string;
  kind: 'image' | 'video';
}

export interface DragDropHandlers {
  onUpload: (payload: DragDropPayload) => void;
}

export interface DragDropController {
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

const POPOVER_Z = 2147483646; // 仅次于选区覆盖层

export function createDragDrop(handlers: DragDropHandlers): DragDropController {
  let enabled = true;
  let popover: HTMLDivElement | null = null;

  function onDragStart(e: DragEvent) {
    if (!enabled) return;
    const target = e.target as HTMLElement;
    const isImg = target?.tagName === 'IMG';
    const isVideo = target?.tagName === 'VIDEO';
    if (!isImg && !isVideo) return;
    showPopover(e.clientX, e.clientY, isVideo ? 'video' : 'image', target);
  }

  function onDragEnd() {
    hidePopover();
  }

  function showPopover(x: number, y: number, kind: 'image' | 'video', target: HTMLElement) {
    hidePopover();
    popover = document.createElement('div');
    popover.style.cssText = `
      position: fixed; left: ${x + 12}px; top: ${y}px; z-index: ${POPOVER_Z};
      background: #1a1a1a; color: #fff; padding: 8px 14px; border-radius: 8px;
      font: 13px system-ui; box-shadow: 0 4px 12px rgba(0,0,0,.3);
      cursor: copy; user-select: none; display: flex; align-items: center; gap: 6px;
    `;
    popover.textContent = `⬆ 上传到 Mira`;
    popover.addEventListener('dragover', ev => ev.preventDefault());
    popover.addEventListener('drop', ev => {
      ev.preventDefault();
      hidePopover();
      // 优先取 dataTransfer 里的 File
      const dtFile = ev.dataTransfer?.files?.[0];
      if (dtFile) {
        handlers.onUpload({ file: dtFile, kind });
        return;
      }
      // 否则取元素 src
      const url = (target as HTMLImageElement).currentSrc || (target as HTMLImageElement).src;
      if (url) handlers.onUpload({ url, kind });
    });
    document.documentElement.appendChild(popover);
  }

  function hidePopover() {
    if (popover) {
      popover.remove();
      popover = null;
    }
  }

  // 捕获阶段,确保先于页面处理
  document.addEventListener('dragstart', onDragStart, true);
  document.addEventListener('dragend', onDragEnd, true);
  document.addEventListener('drop', onDragEnd, true);

  return {
    setEnabled(v) { enabled = v; if (!v) hidePopover(); },
    destroy() {
      hidePopover();
      document.removeEventListener('dragstart', onDragStart, true);
      document.removeEventListener('dragend', onDragEnd, true);
      document.removeEventListener('drop', onDragEnd, true);
    },
  };
}
