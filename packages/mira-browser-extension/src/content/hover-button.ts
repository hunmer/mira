import { dbg } from '@/shared/debug';
import { OVERLAY_Z } from './overlay/styles';

/**
 * 页面图片 hover 操作按钮:
 * 鼠标悬停在图片(或包含子 img 的卡片容器/遮罩层)上时,其右上角显示 dots 按钮,
 * 点击弹出菜单:「导入图片」「复制 URL」「在新标签打开大图」。
 * 与 dragdrop 同一套 controller 模式(enabled 开关 / destroy 幂等)。
 */

export interface HoverButtonHandlers {
  /** 菜单「导入图片」:导入图片到素材库(由调用方实现,含高清升级) */
  importImage: (url: string) => void;
  /** 菜单「在新标签打开大图」:由调用方负责 maxurl 升级并开新标签 */
  openLarge: (url: string) => void;
}

export interface HoverButtonController {
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

const BTN_SIZE = 26; // dots 按钮边长(px)
const BTN_MARGIN = 6; // 与定位区域可视边缘的间距(px)
const MIN_VISIBLE = 80; // 可视宽/高低于此值不显示(过滤小图标/表情)
const MENU_WIDTH = 168;
const DONE_FEEDBACK_MS = 1500;
const CONTROLLER_KEY = '__miraHoverButtonController__';
/** hover 目标不是 img 时,向上最多找几层祖先中的子 img(卡片/遮罩场景) */
const MAX_ANCESTOR_DEPTH = 3;
/** 祖先容器可视面积超过视口该比例视为页面级容器,不显示按钮 */
const MAX_VIEWPORT_COVER = 0.9;

/**
 * hover 命中结果:root 为 dots 的定位元素(通常是 img 本身或包含 img 的容器),
 * img 为实际图片(取 URL 用)。
 */
export interface HoverTarget {
  root: Element;
  img: HTMLImageElement;
}

function hasSrc(img: HTMLImageElement): boolean {
  return !!(img.currentSrc || img.src);
}

/**
 * 解析 hover 命中:
 * - target 是 img → 直接命中;
 * - target 不是 img(卡片容器、图片上方的遮罩/caption 等)→ 向上最多
 *   MAX_ANCESTOR_DEPTH 层找包含子 img 的祖先容器,dots 定位到该容器;
 * - 命中的祖先覆盖几乎整个视口时视为页面级容器,放弃(避免整页 hover 都弹按钮)。
 */
export function resolveHoverTarget(target: Element | null): HoverTarget | null {
  if (!target) return null;
  if (target instanceof HTMLImageElement) {
    return hasSrc(target) ? { root: target, img: target } : null;
  }
  let el: Element | null = target;
  let depth = 0;
  while (el && depth <= MAX_ANCESTOR_DEPTH) {
    const img = el.querySelector('img');
    if (img && hasSrc(img)) {
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth || 1;
      const vh = window.innerHeight || 1;
      const visibleW = Math.max(0, Math.min(rect.right, vw) - Math.max(rect.left, 0));
      const visibleH = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
      if ((visibleW * visibleH) / (vw * vh) > MAX_VIEWPORT_COVER) return null;
      return { root: el, img };
    }
    el = el.parentElement;
    depth++;
  }
  return null;
}

/**
 * 计算 dots 按钮位置:贴定位元素可视区域右上角(部分滚出视口时取交集)。
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

/** 复制文本到剪贴板;clipboard API 不可用(http 页面等)时回退 execCommand */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
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
  let currentTarget: HoverTarget | null = null;
  let confirmTimer: ReturnType<typeof setTimeout> | null = null;

  function imageUrl(): string | null {
    const img = currentTarget?.img;
    return img ? (img.currentSrc || img.src || null) : null;
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
    currentTarget = null;
  }

  function positionMenu() {
    if (!menu || !btn) return;
    const r = btn.getBoundingClientRect();
    menu.style.top = Math.min(r.bottom + 6, window.innerHeight - menu.offsetHeight - 8) + 'px';
    menu.style.left = Math.max(8, Math.min(r.right - menu.offsetWidth, window.innerWidth - menu.offsetWidth - 8)) + 'px';
  }

  /** 滚动/resize 后按定位元素最新 rect 重算;可视区域不足时隐藏 */
  function updatePosition() {
    if (!btn || !currentTarget) return;
    const pos = calculateButtonPosition(currentTarget.root.getBoundingClientRect(), window.innerWidth, window.innerHeight);
    if (!pos) { hide(); return; }
    btn.style.left = pos.left + 'px';
    btn.style.top = pos.top + 'px';
    if (menu) positionMenu();
  }

  /** 菜单关闭后按钮短暂打勾,反馈动作已发起 */
  function showDoneFeedback() {
    if (!btn) return;
    btn.classList.add('mira-done');
    btn.innerHTML = CHECK_SVG;
    if (confirmTimer) clearTimeout(confirmTimer);
    confirmTimer = setTimeout(() => {
      confirmTimer = null;
      if (btn) { btn.classList.remove('mira-done'); btn.innerHTML = DOTS_SVG; }
    }, DONE_FEEDBACK_MS);
  }

  function currentUrlOrFeedback(): string | null {
    const url = imageUrl();
    hideMenu();
    if (!url) return null;
    return url;
  }

  async function onImportClick() {
    const url = currentUrlOrFeedback();
    if (!url) return;
    dbg.info('hoverbtn', 'import requested', { url });
    handlers.importImage(url);
    showDoneFeedback();
  }

  async function onCopyClick() {
    const url = currentUrlOrFeedback();
    if (!url) return;
    const ok = await copyText(url);
    dbg.info('hoverbtn', 'copy url', { url, ok });
    showDoneFeedback();
  }

  function onOpenLargeClick() {
    const url = currentUrlOrFeedback();
    if (!url) return;
    dbg.info('hoverbtn', 'open large requested', { url });
    handlers.openLarge(url);
    showDoneFeedback();
  }

  function makeMenuItem(label: string, onClick: () => void): HTMLButtonElement {
    const item = document.createElement('button');
    item.className = 'mira-hovermenu-item';
    item.type = 'button';
    item.textContent = label;
    item.addEventListener('click', ev => {
      ev.preventDefault();
      ev.stopPropagation();
      onClick();
    });
    return item;
  }

  function toggleMenu() {
    if (menu) { hideMenu(); return; }
    if (!currentTarget) return;
    menu = document.createElement('div');
    menu.className = 'mira-hovermenu';
    menu.append(
      makeMenuItem('📥 导入图片', () => void onImportClick()),
      makeMenuItem('🔗 复制 URL', () => void onCopyClick()),
      makeMenuItem('🖼️ 在新标签打开大图', onOpenLargeClick),
    );
    document.documentElement.appendChild(menu);
    positionMenu();
  }

  function show(target: HoverTarget) {
    hide();
    currentTarget = target;
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
    const hit = target instanceof Element ? resolveHoverTarget(target) : null;
    if (hit) {
      // 命中区域与当前区域相同或互为祖先/后代(img ↔ 其卡片容器)时保持不动,避免按钮跳动
      const cur = currentTarget?.root;
      if (cur && (hit.root === cur || cur.contains(hit.root) || hit.root.contains(cur))) return;
      show(hit);
      return;
    }
    // 移到命中区域以外的元素上 → 收起(悬停在按钮/菜单上时已提前 return)
    if (currentTarget) hide();
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
