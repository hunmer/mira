import { dbg } from '@/shared/debug';
import { OVERLAY_Z } from './overlay/styles';

/**
 * 页面图片 hover 操作按钮:
 * 鼠标悬停在图片上时,右上角显示 dots 按钮,点击弹出菜单(当前仅「导入图片」)。
 * 与 dragdrop 同一套 controller 模式(enabled 开关 / destroy 幂等)。
 */

export interface HoverButtonHandlers {
  /** 点击菜单「导入图片」时回调,参数为图片当前 URL */
  onImport: (url: string) => void;
}

export interface HoverButtonController {
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

const BTN_SIZE = 26; // dots 按钮边长(px)
const BTN_MARGIN = 6; // 与图片可视区域边缘的间距(px)
const MIN_VISIBLE = 80; // 图片可视宽/高低于此值不显示(过滤小图标/表情)
const MENU_WIDTH = 132;
const DONE_FEEDBACK_MS = 1500;
const CONTROLLER_KEY = '__miraHoverButtonController__';

/**
 * 计算 dots 按钮位置:贴图片可视区域右上角(图片部分滚出视口时取交集)。
 * 可视区域过小或完全出视口时返回 null(不显示)。
 */
export function calculateButtonPosition(
  rect: { top: number; left: number; right: number; bottom: number },
  viewportWidth: number,
  viewportHeight: number,
): { left: number; top: number } | null {
  const visibleLeft = Math.max(rect.left, 0);
  const visibleTop = Math.max(rect.top, 0);
  const visibleRight = Math.min(rect.right, viewportWidth);
  const visibleBottom = Math.min(rect.bottom, viewportHeight);
  if (visibleRight - visibleLeft < MIN_VISIBLE || visibleBottom - visibleTop < MIN_VISIBLE) return null;
  return {
    left: visibleRight - BTN_SIZE - BTN_MARGIN,
    top: visibleTop + BTN_MARGIN,
  };
}

const DOTS_SVG = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="8" cy="3" r="1.6"/><circle cx="8" cy="8" r="1.6"/><circle cx="8" cy="13" r="1.6"/></svg>`;
const CHECK_SVG = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4.5"/></svg>`;

export function createHoverButton(handlers: HoverButtonHandlers): HoverButtonController {
  const controllerHost = window as unknown as Record<string, HoverButtonController | undefined>;
  controllerHost[CONTROLLER_KEY]?.destroy();

  let enabled = true;
  let destroyed = false;
  let btn: HTMLButtonElement | null = null;
  let menu: HTMLDivElement | null = null;
  let currentImg: HTMLImageElement | null = null;
  let confirmTimer: ReturnType<typeof setTimeout> | null = null;

  function imageUrl(img: HTMLImageElement): string | null {
    return img.currentSrc || img.src || null;
  }

  function hideMenu() {
    menu?.remove();
    menu = null;
  }

  function hide() {
    hideMenu();
    if (confirmTimer) { clearTimeout(confirmTimer); confirmTimer = null; }
    btn?.remove();
    btn = null;
    currentImg = null;
  }

  function positionMenu() {
    if (!menu || !btn) return;
    const r = btn.getBoundingClientRect();
    menu.style.top = Math.min(r.bottom + 6, window.innerHeight - menu.offsetHeight - 8) + 'px';
    menu.style.left = Math.max(8, Math.min(r.right - menu.offsetWidth, window.innerWidth - menu.offsetWidth - 8)) + 'px';
  }

  /** 滚动/resize 后按图片最新 rect 重算;可视区域不足时隐藏 */
  function updatePosition() {
    if (!btn || !currentImg) return;
    const pos = calculateButtonPosition(currentImg.getBoundingClientRect(), window.innerWidth, window.innerHeight);
    if (!pos) { hide(); return; }
    btn.style.left = pos.left + 'px';
    btn.style.top = pos.top + 'px';
    if (menu) positionMenu();
  }

  function importCurrent() {
    if (!currentImg || !btn) return;
    const url = imageUrl(currentImg);
    hideMenu();
    if (!url) return;
    dbg.info('hoverbtn', 'import requested', { url });
    handlers.onImport(url);
    // 按钮短暂打勾反馈导入已发起
    btn.classList.add('mira-done');
    btn.innerHTML = CHECK_SVG;
    if (confirmTimer) clearTimeout(confirmTimer);
    confirmTimer = setTimeout(() => {
      confirmTimer = null;
      if (btn) { btn.classList.remove('mira-done'); btn.innerHTML = DOTS_SVG; }
    }, DONE_FEEDBACK_MS);
  }

  function toggleMenu() {
    if (menu) { hideMenu(); return; }
    if (!currentImg) return;
    menu = document.createElement('div');
    menu.className = 'mira-hovermenu';
    const item = document.createElement('button');
    item.className = 'mira-hovermenu-item';
    item.type = 'button';
    item.textContent = '📥 导入图片';
    item.addEventListener('click', ev => {
      ev.preventDefault();
      ev.stopPropagation();
      importCurrent();
    });
    menu.appendChild(item);
    document.documentElement.appendChild(menu);
    positionMenu();
  }

  function show(img: HTMLImageElement) {
    hide();
    currentImg = img;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mira-hoverbtn';
    btn.title = 'Mira';
    btn.innerHTML = DOTS_SVG;
    // 阻断按钮上的指针事件下沉,避免触发页面自身的拖拽/点击逻辑
    btn.addEventListener('pointerdown', ev => ev.stopPropagation());
    btn.addEventListener('click', ev => {
      ev.preventDefault();
      ev.stopPropagation();
      toggleMenu();
    });
    document.documentElement.appendChild(btn);
    updatePosition();
  }

  function onMouseOver(e: MouseEvent) {
    if (!enabled || destroyed) return;
    const target = e.target;
    if (btn && target === btn) return;
    if (menu && target instanceof Node && menu.contains(target)) return;
    if (target instanceof HTMLImageElement) {
      if (target === currentImg) return;
      if (imageUrl(target)) show(target);
      return;
    }
    // 移到图片以外的元素上 → 收起(悬停在按钮/菜单上时已提前 return)
    if (currentImg) hide();
  }

  function onScrollOrResize() {
    if (btn) updatePosition();
  }

  function onPointerDownDoc(e: PointerEvent) {
    if (!menu) return;
    const t = e.target;
    if (t instanceof Node && (menu.contains(t) || (btn && (t === btn || btn.contains(t))))) return;
    hideMenu();
  }

  ensureStyles();
  document.addEventListener('mouseover', onMouseOver, true);
  window.addEventListener('scroll', onScrollOrResize, true);
  window.addEventListener('resize', onScrollOrResize);
  document.addEventListener('pointerdown', onPointerDownDoc, true);
  dbg.info('hoverbtn', 'ready');

  const controller: HoverButtonController = {
    setEnabled(v) {
      if (destroyed) return;
      enabled = v;
      if (!v) hide();
      dbg.info('hoverbtn', 'setEnabled', { enabled });
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      hide();
      document.removeEventListener('mouseover', onMouseOver, true);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      document.removeEventListener('pointerdown', onPointerDownDoc, true);
      if (controllerHost[CONTROLLER_KEY] === controller) delete controllerHost[CONTROLLER_KEY];
    },
  };
  controllerHost[CONTROLLER_KEY] = controller;
  return controller;
}

function ensureStyles() {
  if (document.getElementById('mira-hoverbtn-style')) return;
  const style = document.createElement('style');
  style.id = 'mira-hoverbtn-style';
  style.textContent = `
.mira-hoverbtn {
  position: fixed; z-index: ${OVERLAY_Z};
  width: ${BTN_SIZE}px; height: ${BTN_SIZE}px; padding: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: 6px; border: 1px solid #3f3f46;
  background: rgba(24,24,27,.9); color: #d4d4d8;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,.35);
  transition: background .12s, color .12s, border-color .12s;
}
.mira-hoverbtn:hover { background: #3f3f46; color: #fafafa; }
.mira-hoverbtn.mira-done { border-color: #4ade80; color: #4ade80; }
.mira-hoverbtn svg { display: block; }
.mira-hovermenu {
  position: fixed; z-index: ${OVERLAY_Z};
  min-width: ${MENU_WIDTH}px; padding: 4px; box-sizing: border-box;
  background: rgba(24,24,27,.96); color: #fafafa;
  border: 1px solid #3f3f46; border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,.4);
  font: 13px/1.4 system-ui, -apple-system, sans-serif;
}
.mira-hovermenu-item {
  display: block; width: 100%; padding: 7px 10px;
  font: inherit; text-align: left; color: #fafafa;
  background: transparent; border: none; border-radius: 6px;
  cursor: pointer; white-space: nowrap;
}
.mira-hovermenu-item:hover { background: #3f3f46; }
`;
  document.documentElement.appendChild(style);
}
