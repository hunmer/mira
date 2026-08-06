export interface SelectionRect {
  x: number;
  y: number;
  w: number;
  h: number;
  dpr: number;
}

const OVERLAY_Z = 2147483647; // 最高

/**
 * 注入全屏遮罩 + 选框,用户拖拽框选,返回 rect
 * @returns rect,或 null(用户按 Esc 取消)
 */
export function drawSelection(): Promise<SelectionRect | null> {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: ${OVERLAY_Z};
      background: rgba(0,0,0,.4); cursor: crosshair;
    `;
    const box = document.createElement('div');
    box.style.cssText = `
      position: absolute; border: 2px dashed #4ade80;
      background: rgba(74,222,128,.1); pointer-events: none;
    `;
    overlay.appendChild(box);
    document.documentElement.appendChild(overlay);

    let startX = 0, startY = 0, dragging = false;

    function cleanup() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    }
    document.addEventListener('keydown', onKey);

    overlay.addEventListener('mousedown', (e: MouseEvent) => {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      box.style.left = startX + 'px';
      box.style.top = startY + 'px';
      box.style.width = '0px';
      box.style.height = '0px';
    });

    overlay.addEventListener('mousemove', (e: MouseEvent) => {
      if (!dragging) return;
      const x = Math.min(e.clientX, startX);
      const y = Math.min(e.clientY, startY);
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);
      box.style.left = x + 'px';
      box.style.top = y + 'px';
      box.style.width = w + 'px';
      box.style.height = h + 'px';
    });

    overlay.addEventListener('mouseup', (e: MouseEvent) => {
      if (!dragging) return;
      dragging = false;
      const x = Math.min(e.clientX, startX);
      const y = Math.min(e.clientY, startY);
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);
      cleanup();
      if (w < 4 || h < 4) {
        resolve(null); // 误点
        return;
      }
      resolve({ x, y, w, h, dpr: window.devicePixelRatio || 1 });
    });
  });
}
