import { describe, expect, it } from 'vitest';
import { pinterestOriginalUrl } from './imu';

describe('pinterestOriginalUrl', () => {
  it('把 Pinterest 尺寸路径转换为 originals', () => {
    expect(pinterestOriginalUrl('https://i.pinimg.com/236x/83/f2/19/image.jpg'))
      .toBe('https://i.pinimg.com/originals/83/f2/19/image.jpg');
  });

  it('不改动非 Pinterest 或已有 originals URL', () => {
    expect(pinterestOriginalUrl('https://example.com/236x/image.jpg')).toBeNull();
    expect(pinterestOriginalUrl('https://i.pinimg.com/originals/83/f2/19/image.jpg')).toBeNull();
  });
});
