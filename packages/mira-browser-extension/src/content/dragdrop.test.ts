// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateOverlayPosition, clampOverlayTop, collectImagesUnder, createDragDrop, folderEmptyMessage, resolveDragSource } from './dragdrop';
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

describe('collectImagesUnder', () => {
  function makeImg(src: string): HTMLImageElement {
    const img = document.createElement('img');
    img.src = src;
    return img;
  }

  it('target 为媒体元素本身时返回空(单图操作不提供批量)', () => {
    const img = makeImg('https://example.com/a.jpg');
    expect(collectImagesUnder(img)).toEqual([]);
    expect(collectImagesUnder(null)).toEqual([]);
  });

  it('收集容器下的多张图片并去重', () => {
    const container = document.createElement('div');
    container.append(
      makeImg('https://example.com/a.jpg'),
      makeImg('https://example.com/a.jpg'), // 重复
      makeImg('https://example.com/b.jpg'),
    );
    expect(collectImagesUnder(container)).toEqual(['https://example.com/a.jpg', 'https://example.com/b.jpg']);
  });

  it('容器内只有一张图时向上查找最近的含多图祖先', () => {
    const grid = document.createElement('div');
    const card = document.createElement('div');
    const mask = document.createElement('span');
    card.append(makeImg('https://example.com/a.jpg'), mask);
    grid.append(card, makeImg('https://example.com/b.jpg'));
    expect(collectImagesUnder(card)).toEqual(['https://example.com/a.jpg', 'https://example.com/b.jpg']);
    expect(collectImagesUnder(mask)).toEqual(['https://example.com/a.jpg', 'https://example.com/b.jpg']);
  });

  it('过滤 data: URL;全部无效时返回空', () => {
    const container = document.createElement('div');
    container.append(makeImg('data:image/png;base64,xxx'), makeImg('data:image/gif;base64,yyy'));
    expect(collectImagesUnder(container)).toEqual([]);
  });

  it('限制最大收集数量', () => {
    const container = document.createElement('div');
    for (let i = 0; i < 5; i++) container.appendChild(makeImg(`https://example.com/${i}.jpg`));
    expect(collectImagesUnder(container, { limit: 3 })).toHaveLength(3);
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
  // 浮层挂载在 #mira-dragdrop-host 的 Shadow DOM 内,查询需穿透 shadow root
  function overlayRoot(): ShadowRoot | null {
    return document.getElementById('mira-dragdrop-host')?.shadowRoot ?? null;
  }
  function overlayQuery<T extends HTMLElement>(selector: string): T | null {
    return overlayRoot()?.querySelector(selector) as T | null ?? null;
  }
  function overlayQueryAll<T extends HTMLElement>(selector: string): T[] {
    return Array.from(overlayRoot()?.querySelectorAll(selector) ?? []) as T[];
  }

  afterEach(() => {
    vi.restoreAllMocks();
    (window as any).__miraDragDropController__?.destroy();
    document.querySelectorAll('#mira-dragdrop-host, #mira-overlay-base-style, #mira-dragdrop-style').forEach(el => el.remove());
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

  it('pageshow 后恢复监听可用(浮层样式已随 bundle 内嵌 shadow,不再依赖 document 样式节点)', () => {
    const controller = createDragDrop({ onUpload: vi.fn() });
    document.getElementById('mira-overlay-base-style')?.remove();

    window.dispatchEvent(new Event('pageshow'));

    expect(controller.health()).toMatchObject({
      enabled: true,
      listenersAttached: true,
      baseStylePresent: true,
      dragStylePresent: true,
    });
  });

  it('禁用后接收其他网站图片的 dragover 不显示浮层', () => {
    const controller = createDragDrop({ onUpload: vi.fn() });
    controller.setEnabled(false);
    const event = new Event('dragover', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clientX', { value: 100 });
    Object.defineProperty(event, 'clientY', { value: 100 });
    Object.defineProperty(event, 'dataTransfer', { value: { types: ['Files'], dropEffect: 'none' } });

    document.dispatchEvent(event);

    expect(document.getElementById('mira-dragdrop-host')).toBeNull();
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
      getLibraryId: async () => 'lib-1',
      createFolder: async () => 42,
      openCustomUpload,
    });
    const img = document.createElement('img');
    img.src = 'https://example.com/image.jpg';
    document.body.appendChild(img);

    img.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 10, clientY: 10 }));
    img.dispatchEvent(new MouseEvent('dragstart', { bubbles: true, clientX: 10, clientY: 10 }));
    document.dispatchEvent(new MouseEvent('dragover', { bubbles: true, clientX: 100, clientY: 10 }));
    const customUpload = overlayQuery<HTMLElement>('.mira-custom-upload');
    expect(customUpload?.textContent).toContain('自定义上传');
    customUpload?.dispatchEvent(new MouseEvent('drop', { bubbles: true }));
    expect(openCustomUpload).toHaveBeenCalledOnce();
    expect(openCustomUpload).toHaveBeenCalledWith({ url: img.src, kind: 'image' }, undefined);
    expect(overlayQuery('.mira-overlay input')).toBeNull();
    img.remove();
  });

  it('普通拖拽仍显示网页目标浮层', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
    createDragDrop({ onUpload: vi.fn(), getLibraryId: async () => 'lib-1' });
    const img = document.createElement('img');
    img.src = 'https://example.com/image.jpg';
    document.body.appendChild(img);

    img.dispatchEvent(new MouseEvent('dragstart', { bubbles: true, clientX: 10, clientY: 10 }));
    document.dispatchEvent(new MouseEvent('dragover', { bubbles: true, clientX: 100, clientY: 10 }));

    expect(overlayQuery('.mira-dragdrop')).not.toBeNull();
    img.remove();
  });

  it('拖拽含多图的容器时显示批量操作区,释放后触发批量回调', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
    const onBatchImport = vi.fn();
    const onCopyUrls = vi.fn();
    createDragDrop({ onUpload: vi.fn(), getLibraryId: async () => 'lib-1', onBatchImport, onCopyUrls });
    const container = document.createElement('div');
    const imgA = document.createElement('img');
    imgA.src = 'https://example.com/a.jpg';
    const imgB = document.createElement('img');
    imgB.src = 'https://example.com/b.jpg';
    container.append(imgA, imgB);
    document.body.appendChild(container);

    container.dispatchEvent(new MouseEvent('dragstart', { bubbles: true, clientX: 10, clientY: 10 }));
    document.dispatchEvent(new MouseEvent('dragover', { bubbles: true, clientX: 100, clientY: 10 }));

    const zones = overlayQueryAll<HTMLElement>('.mira-batch-zones .mira-dropzone');
    expect(zones.length).toBe(2);
    expect(zones[0].textContent).toContain('批量导入(2)');
    zones[0].dispatchEvent(new MouseEvent('drop', { bubbles: true }));
    expect(onBatchImport).toHaveBeenCalledOnce();
    expect(onBatchImport).toHaveBeenCalledWith(['https://example.com/a.jpg', 'https://example.com/b.jpg']);

    // 再次拖拽,释放到「批量复制url」
    container.dispatchEvent(new MouseEvent('dragstart', { bubbles: true, clientX: 10, clientY: 10 }));
    document.dispatchEvent(new MouseEvent('dragover', { bubbles: true, clientX: 100, clientY: 10 }));
    const copyZone = overlayQuery<HTMLElement>('.mira-batch-zones .mira-dropzone:nth-child(2)');
    expect(copyZone?.textContent).toContain('批量复制url');
    copyZone?.dispatchEvent(new MouseEvent('drop', { bubbles: true }));
    expect(onCopyUrls).toHaveBeenCalledOnce();
    expect(onCopyUrls).toHaveBeenCalledWith(['https://example.com/a.jpg', 'https://example.com/b.jpg']);
    container.remove();
  });

  it('拖拽单张图片时不显示批量操作区', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
    createDragDrop({ onUpload: vi.fn(), getLibraryId: async () => 'lib-1', onBatchImport: vi.fn(), onCopyUrls: vi.fn() });
    const img = document.createElement('img');
    img.src = 'https://example.com/image.jpg';
    document.body.appendChild(img);

    img.dispatchEvent(new MouseEvent('dragstart', { bubbles: true, clientX: 10, clientY: 10 }));
    document.dispatchEvent(new MouseEvent('dragover', { bubbles: true, clientX: 100, clientY: 10 }));

    expect(overlayQuery('.mira-dragdrop')).not.toBeNull();
    expect(overlayQuery('.mira-batch-zones')).toBeNull();
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
    // fetchFolders/组件 onMounted 探测是微任务链;用宏任务清空整个微任务队列,不依赖链路深度
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(overlayQuery('.mira-overlay-header')?.textContent).toBe('未连接素材库');
    const empty = overlayQuery<HTMLElement>('.mira-empty-state-dropzone');
    expect(empty?.textContent).toBe('未连接到素材库，将文件拖拽到此处打开侧边栏');
    empty?.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    expect(openCustomUpload).toHaveBeenCalledWith({ url: img.src, kind: 'image' }, undefined);
    img.remove();
  });
});
