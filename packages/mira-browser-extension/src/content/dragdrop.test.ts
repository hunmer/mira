// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { folderEmptyMessage, resolveDragSource } from './dragdrop';
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
