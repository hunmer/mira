import { describe, expect, it } from 'vitest';
import { fallbackImageCandidates, pinterestOriginalUrl } from './imu';

describe('pinterestOriginalUrl', () => {
  it('把 Pinterest 尺寸路径转换为 originals', () => {
    expect(pinterestOriginalUrl('https://i.pinimg.com/236x/83/f2/19/image.jpg'))
      .toBe('https://i.pinimg.com/originals/83/f2/19/image.jpg');
  });

  it('不改动非 Pinterest 或已有 originals URL', () => {
    expect(pinterestOriginalUrl('https://example.com/236x/image.jpg')).toBeNull();
    expect(pinterestOriginalUrl('https://i.pinimg.com/originals/83/f2/19/image.jpg')).toBeNull();
  });

  it('maxurl 无结果时仍保留 Pinterest 原图兜底候选', () => {
    expect(fallbackImageCandidates('https://i.pinimg.com/236x/5a/eb/23/image.jpg'))
      .toEqual([
        'https://i.pinimg.com/originals/5a/eb/23/image.jpg',
        'https://i.pinimg.com/236x/5a/eb/23/image.jpg',
      ]);
  });
});
