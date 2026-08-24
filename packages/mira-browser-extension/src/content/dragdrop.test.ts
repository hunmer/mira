// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateOverlayPosition, clampOverlayTop, createDragDrop, folderEmptyMessage, resolveDragSource } from './dragdrop';
import type { DragDropHandlers } from './dragdrop';

describe('resolveDragSource', () => {
  it('识别普通链接并按 URL 推断类型', () => {
    const a = document.createElement('a');
    a.href = 'https://example.com/video.mp4';
    expect(resolveDragSource(a)).toEqual({ url: a.href, kind: 'video' });
  });

  it('链接包裹图片时优先导入图片而不是页面 href', () => {
    const a = document.createElement('a');
    a.href = 'https://example.com/page';
    const img = document.createElement('img');
    img.src = 'https://cdn.example.com/photo.jpg';
    a.appendChild(img);

    expect(resolveDragSource(img)).toEqual({ url: img.src, kind: 'image' });
    expect(resolveDragSource(a)).toEqual({ url: img.src, kind: 'image' });
  });

  it('识别可拖拽容器内的图片', () => {
    const container = document.createElement('div');
    container.draggable = true;
    const overlay = document.createElement('span');
    const img = document.createElement('img');
    img.src = 'https://i.pinimg.com/originals/photo.jpg';
    container.append(img, overlay);

    expect(resolveDragSource(overlay)).toEqual({ url: img.src, kind: 'image' });
  });

  it('非媒体元素不显示 Popover', () => {
    expect(resolveDragSource(document.createElement('div'))).toBeNull();
  });

  it('未连接素材库时显示对应空状态', () => {
    expect(folderEmptyMessage(null)).toBe('未连接素材库');
    expect(folderEmptyMessage([])).toBe('暂无文件夹');
  });
});

describe('DragDropHandlers.createFolder', () => {
  it('接口接受可选 createFolder(用于「新建文件夹」drop zone)', () => {
    // 仅类型层面验证:接口已扩展,允许 createFolder 可选
    const handlers: DragDropHandlers = {
      onUpload: () => {},
      getFolders: async () => [],
      createFolder: async title => title ? 42 : null,
    };
    expect(typeof handlers.createFolder).toBe('function');
  });

  it('createFolder 省略时仍合法(向后兼容)', () => {
    const handlers: DragDropHandlers = { onUpload: () => {} };
    expect(handlers.createFolder).toBeUndefined();
  });
});

describe('calculateOverlayPosition', () => {
  it('向右拖动但右侧空间不足时翻转到左侧', () => {
    expect(calculateOverlayPosition(900, 400, 100, 10, 300, 200, 1000, 800)).toEqual({
      left: 588,
      top: 300,
    });
  });

  it('向下拖动但下方空间不足时翻转到上方', () => {
    expect(calculateOverlayPosition(500, 700, 10, 100, 300, 240, 1000, 800)).toEqual({
      left: 350,
      top: 448,
    });
  });

  it('两侧都放不下时仍将浮层钳制在视口内', () => {
    expect(calculateOverlayPosition(100, 100, -100, 0, 300, 200, 320, 240)).toEqual({
      left: 8,
      top: 8,
    });
  });
});

describe('clampOverlayTop', () => {
  it('浮层高度增长后按 视口高度-浮层高度 重算 top', () => {
    // 首次定位时浮层 240px、top=552;列表填充后长高到 400px → 需上移到 800-400-8
    expect(clampOverlayTop(552, 400, 800)).toBe(392);
  });

  it('未超出底部时保持原 top 不变', () => {
    expect(clampOverlayTop(100, 240, 800)).toBe(100);
  });

  it('浮层高度超过视口时退到顶部边缘', () => {
    expect(clampOverlayTop(500, 900, 800)).toBe(8);
  });
});

describe('createDragDrop lifecycle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    (window as any).__miraDragDropController__?.destroy();
    document.querySelectorAll('.mira-overlay, #mira-overlay-base-style, #mira-dragdrop-style').forEach(el => el.remove());
  });

  it('重复初始化时销毁旧 controller，只保留最新实例', () => {
    const first = createDragDrop({ onUpload: vi.fn() });
    const destroy = vi.spyOn(first, 'destroy');

    const second = createDragDrop({ onUpload: vi.fn() });

    expect(destroy).toHaveBeenCalledOnce();
    expect((window as any).__miraDragDropController__).toBe(second);
    expect(first.health().listenersAttached).toBe(false);
    expect(second.health().listenersAttached).toBe(true);
  });

  it('pageshow 后恢复被移除的样式并保持监听可用', () => {
    const controller = createDragDrop({ onUpload: vi.fn() });
    document.getElementById('mira-overlay-base-style')?.remove();
    document.getElementById('mira-dragdrop-style')?.remove();

    window.dispatchEvent(new Event('pageshow'));

    expect(controller.health()).toMatchObject({
      enabled: true,
      listenersAttached: true,
      baseStylePresent: true,
      dragStylePresent: true,
    });
  });

  it('拖到自定义上传后由侧边栏完整表单接管', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
    const openCustomUpload = vi.fn();
    createDragDrop({
      onUpload: vi.fn(),
      getFolders: async () => [],
      createFolder: async () => 42,
      openCustomUpload,
    });
    const img = document.createElement('img');
    img.src = 'https://example.com/image.jpg';
    document.body.appendChild(img);

    img.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 10, clientY: 10 }));
    img.dispatchEvent(new MouseEvent('dragstart', { bubbles: true, clientX: 10, clientY: 10 }));
    document.dispatchEvent(new MouseEvent('dragover', { bubbles: true, clientX: 100, clientY: 10 }));
    const customUpload = document.querySelector<HTMLElement>('.mira-custom-upload');
    expect(customUpload?.textContent).toContain('自定义上传');
    customUpload?.dispatchEvent(new MouseEvent('drop', { bubbles: true }));
    expect(openCustomUpload).toHaveBeenCalledOnce();
    expect(openCustomUpload).toHaveBeenCalledWith({ url: img.src, kind: 'image' });
    expect(document.querySelector('.mira-overlay input')).toBeNull();
    img.remove();
  });

  it('普通拖拽仍显示网页目标浮层', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
    createDragDrop({ onUpload: vi.fn() });
    const img = document.createElement('img');
    img.src = 'https://example.com/image.jpg';
    document.body.appendChild(img);

    img.dispatchEvent(new MouseEvent('dragstart', { bubbles: true, clientX: 10, clientY: 10 }));
    document.dispatchEvent(new MouseEvent('dragover', { bubbles: true, clientX: 100, clientY: 10 }));

    expect(document.querySelector('.mira-dragdrop')).not.toBeNull();
    img.remove();
  });

  it('未连接服务器或素材库时标题显示空状态', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
    const openCustomUpload = vi.fn();
    createDragDrop({ onUpload: vi.fn(), getFolders: async () => null, openCustomUpload });
    const img = document.createElement('img');
    img.src = 'https://example.com/image.jpg';
    document.body.appendChild(img);

    img.dispatchEvent(new MouseEvent('dragstart', { bubbles: true, clientX: 10, clientY: 10 }));
    document.dispatchEvent(new MouseEvent('dragover', { bubbles: true, clientX: 100, clientY: 10 }));
    // fetchFolders 内部是 .then().catch() 链,resolve 依赖多层微任务;
    // 用宏任务清空整个微任务队列,不依赖链路深度
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(document.querySelector('.mira-overlay-title')?.textContent).toBe('未连接素材库');
    const empty = document.querySelector<HTMLElement>('.mira-empty-state-dropzone');
    expect(empty?.textContent).toBe('未连接到素材库，将文件拖拽到此处打开侧边栏');
    empty?.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    expect(openCustomUpload).toHaveBeenCalledWith({ url: img.src, kind: 'image' });
    img.remove();
  });
});
