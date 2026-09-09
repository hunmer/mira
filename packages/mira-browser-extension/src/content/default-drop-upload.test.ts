// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { defaultDropUpload, parseDrop } from 'mira-plugin-ui/library';
import type { LibraryTreeUpload } from 'mira-plugin-ui/library';

describe('defaultDropUpload', () => {
  it('树组件解析拖拽 HTML 时解码 URL 中的 &amp;', () => {
    const dataTransfer = {
      types: ['text/html'],
      files: [],
      getData: (type: string) => type === 'text/html'
        ? '<img src="https://img1.baidu.com/it/u=1&amp;fmt=auto&amp;w=800">'
        : '',
    } as unknown as DataTransfer;

    const result = parseDrop({ dataTransfer } as DragEvent);

    expect(result.urls).toEqual(['https://img1.baidu.com/it/u=1&fmt=auto&w=800']);
  });

  it('网页拖拽同时含 File 和 URL 时只上传已有 File', () => {
    const upload: LibraryTreeUpload = {
      files: vi.fn(),
      urls: vi.fn(),
    };
    const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });

    defaultDropUpload(upload, [file], ['https://example.com/photo.jpg']);

    expect(upload.files).toHaveBeenCalledWith([file], undefined);
    expect(upload.urls).not.toHaveBeenCalled();
  });

  it('没有 File 时仍按 URL 上传', () => {
    const upload: LibraryTreeUpload = {
      files: vi.fn(),
      urls: vi.fn(),
    };

    defaultDropUpload(upload, [], ['https://example.com/photo.jpg']);

    expect(upload.files).not.toHaveBeenCalled();
    expect(upload.urls).toHaveBeenCalledWith(['https://example.com/photo.jpg'], undefined);
  });
});
