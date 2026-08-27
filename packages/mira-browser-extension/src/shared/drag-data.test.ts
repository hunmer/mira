import { describe, it, expect, vi } from 'vitest';
import { parseDrop, canAcceptDrop, urlKind } from './drag-data';

/** 构造一个最小 DragEvent,带指定的 types / files / getData 映射 */
function makeEvent(opts: {
  types?: string[];
  files?: File[];
  data?: Record<string, string>;
}): DragEvent {
  const dt = {
    types: opts.types ?? [],
    files: opts.files ?? [],
    getData: (mime: string) => (opts.data ?? {})[mime] ?? '',
  } as unknown as DataTransfer;
  return { dataTransfer: dt, preventDefault: () => {} } as unknown as DragEvent;
}

describe('canAcceptDrop', () => {
  it('Files / uri-list / text-html / text-plain 任一存在即 true', () => {
    expect(canAcceptDrop({ types: ['Files'] } as any)).toBe(true);
    expect(canAcceptDrop({ types: ['text/uri-list'] } as any)).toBe(true);
    expect(canAcceptDrop({ types: ['text/html'] } as any)).toBe(true);
    expect(canAcceptDrop({ types: ['text/plain'] } as any)).toBe(true);
  });
  it('无相关 type 为 false', () => {
    expect(canAcceptDrop({ types: ['text/other'] } as any)).toBe(false);
    expect(canAcceptDrop(null)).toBe(false);
  });
  it('兼容浏览器 HTML/URL 自定义 MIME', () => {
    expect(canAcceptDrop({ types: ['text/x-moz-url'] } as any)).toBe(true);
    expect(canAcceptDrop({ types: ['application/x-moz-nativeimage'] } as any)).toBe(true);
  });
});

describe('parseDrop', () => {
  it('本地文件:返回 files,urls 为空', () => {
    const f = new File(['x'], 'a.png', { type: 'image/png' });
    const { files, urls, hasContent } = parseDrop(makeEvent({ types: ['Files'], files: [f] }));
    expect(files).toHaveLength(1);
    expect(urls).toHaveLength(0);
    expect(hasContent).toBe(true);
  });

  it('text/uri-list:解析出 http(s) 链接,# 注释行忽略', () => {
    const { urls } = parseDrop(
      makeEvent({
        types: ['text/uri-list', 'text/plain'],
        data: {
          'text/uri-list': '# comment\nhttps://a.com/x.png\nhttp://b.com/y.jpg',
          'text/plain': 'https://a.com/x.png',
        },
      }),
    );
    expect(urls.sort()).toEqual(['http://b.com/y.jpg', 'https://a.com/x.png']);
  });

  it('text/html:图片被链接包裹时只提取图片,不上传外层页面', () => {
    const { urls } = parseDrop(
      makeEvent({
        types: ['text/uri-list', 'text/html', 'text/plain'],
        data: {
          'text/uri-list': 'https://site.com/page',
          'text/html':
            '<a href="https://site.com/page"><img src="https://cdn.site.com/img.webp"></a>',
          'text/plain': 'https://site.com/page',
        },
      }),
    );
    expect(urls).toEqual(['https://cdn.site.com/img.webp']);
  });

  it('text/html:提取 Pinterest 常见 data-src 和 srcset 中的多张图片', () => {
    const { urls } = parseDrop(
      makeEvent({
        types: ['text/html'],
        data: {
          'text/html': '<div><img data-src="https://cdn.site.com/a.jpg"><img srcset="https://cdn.site.com/b.jpg 1x, https://cdn.site.com/b@2x.jpg 2x"></div>',
        },
      }),
    );
    expect(urls).toEqual([
      'https://cdn.site.com/a.jpg',
      'https://cdn.site.com/b@2x.jpg',
    ]);
  });

  it('Pinterest payload 优先,避免同一图片的 HTML/srcset 候选重复上传', () => {
    const { urls } = parseDrop(makeEvent({
      types: ['application/x-pinterest-closeup-image', 'text/html'],
      data: {
        'application/x-pinterest-closeup-image': JSON.stringify({ previewImageUrl: 'https://i.pinimg.com/736x/pin.jpg' }),
        'text/html': '<img src="https://i.pinimg.com/236x/pin.jpg" srcset="https://i.pinimg.com/474x/pin.jpg 1x, https://i.pinimg.com/736x/pin.jpg 2x">',
      },
    }));
    expect(urls).toEqual(['https://i.pinimg.com/736x/pin.jpg']);
  });

  it('text/plain 裸链接也被识别', () => {
    const { urls } = parseDrop(
      makeEvent({
        types: ['text/plain'],
        data: { 'text/plain': 'https://example.com/photo.gif' },
      }),
    );
    expect(urls).toEqual(['https://example.com/photo.gif']);
  });

  it('Pinterest 专用 MIME:从 JSON previewImageUrl 提取图片', () => {
    const { urls } = parseDrop(makeEvent({
      types: ['application/x-pinterest-closeup-image', 'chromium/x-drag-id'],
      data: {
        'application/x-pinterest-closeup-image': JSON.stringify({ previewImageUrl: 'https://i.pinimg.com/736x/a.jpg' }),
      },
    }));
    expect(urls).toEqual(['https://i.pinimg.com/736x/a.jpg']);
    expect(canAcceptDrop({ types: ['application/x-pinterest-closeup-image'] } as any)).toBe(true);
  });

  it('非 url 的纯文本被忽略', () => {
    const { urls, hasContent } = parseDrop(
      makeEvent({ types: ['text/plain'], data: { 'text/plain': 'just some words' } }),
    );
    expect(urls).toHaveLength(0);
    expect(hasContent).toBe(false);
  });

  it('过滤危险协议(javascript: 等)', () => {
    const { urls } = parseDrop(
      makeEvent({
        types: ['text/uri-list'],
        data: { 'text/uri-list': 'javascript:alert(1)\nhttps://ok.com/a.png' },
      }),
    );
    expect(urls).toEqual(['https://ok.com/a.png']);
  });

  it('data:image base64 被接受', () => {
    const { urls } = parseDrop(
      makeEvent({
        types: ['text/plain'],
        data: { 'text/plain': 'data:image/png;base64,iVBORw0K' },
      }),
    );
    expect(urls).toEqual(['data:image/png;base64,iVBORw0K']);
  });

  it('无 dataTransfer 时返回空且 hasContent=false', () => {
    const { files, urls, hasContent } = parseDrop({} as DragEvent);
    expect(files).toHaveLength(0);
    expect(urls).toHaveLength(0);
    expect(hasContent).toBe(false);
  });
});

describe('urlKind', () => {
  it('按扩展名判定', () => {
    expect(urlKind('https://a.com/x.png')).toBe('image');
    expect(urlKind('https://a.com/x.JPG?w=1')).toBe('image');
    expect(urlKind('https://a.com/x.mp3')).toBe('audio');
    expect(urlKind('https://a.com/x.mp4?t=2')).toBe('video');
  });
  it('data:image 前缀判为 image', () => {
    expect(urlKind('data:image/webp;base64,xxx')).toBe('image');
  });
  it('无法判定时默认 image(网页拖图最常见)', () => {
    expect(urlKind('https://a.com/noext')).toBe('image');
  });
});

// 安静 dbg.log(parseDrop 内部调用),避免测试输出噪音
vi.spyOn(console, 'log').mockImplementation(() => {});
