// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { extractUrls } from './import-dialog';

describe('extractUrls', () => {
  it('空文本返回空数组', () => {
    expect(extractUrls('')).toEqual([]);
    expect(extractUrls('   ')).toEqual([]);
  });

  it('提取单个 http(s) URL', () => {
    expect(extractUrls('看这张图 https://example.com/a.jpg 很好看'))
      .toEqual(['https://example.com/a.jpg']);
  });

  it('提取多个 URL 并保持顺序', () => {
    const text = 'a https://a.com/1.png b http://b.com/2.webp c https://c.com/3.gif';
    expect(extractUrls(text)).toEqual([
      'https://a.com/1.png',
      'http://b.com/2.webp',
      'https://c.com/3.gif',
    ]);
  });

  it('去重保序', () => {
    const text = 'https://x.com/a.jpg https://y.com/b.jpg https://x.com/a.jpg';
    expect(extractUrls(text)).toEqual([
      'https://x.com/a.jpg',
      'https://y.com/b.jpg',
    ]);
  });

  it('去掉末尾常见标点', () => {
    expect(extractUrls('see https://example.com/x.jpg.')).toEqual(['https://example.com/x.jpg']);
    expect(extractUrls('see (https://example.com/x.jpg),')).toEqual(['https://example.com/x.jpg']);
    expect(extractUrls('see https://example.com/x.jpg)')).toEqual(['https://example.com/x.jpg']);
  });

  it('非 URL 文本不提取', () => {
    expect(extractUrls('hello world foo bar')).toEqual([]);
    expect(extractUrls('/local/path.jpg')).toEqual([]);
  });
});
