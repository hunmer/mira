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

  it('maxurl 无结果时按尺寸依次回退 Pinterest 候选', () => {
    expect(fallbackImageCandidates('https://i.pinimg.com/236x/5a/eb/23/image.jpg'))
      .toEqual([
        'https://i.pinimg.com/originals/5a/eb/23/image.jpg',
        'https://i.pinimg.com/1200x/5a/eb/23/image.jpg',
        'https://i.pinimg.com/736x/5a/eb/23/image.jpg',
        'https://i.pinimg.com/564x/5a/eb/23/image.jpg',
        'https://i.pinimg.com/474x/5a/eb/23/image.jpg',
        'https://i.pinimg.com/236x/5a/eb/23/image.jpg',
      ]);
  });

  it('originals 不可用时也生成其他 Pinterest 尺寸候选', () => {
    expect(fallbackImageCandidates('https://i.pinimg.com/originals/18/23/a4/image.jpg').slice(0, 3))
      .toEqual([
        'https://i.pinimg.com/originals/18/23/a4/image.jpg',
        'https://i.pinimg.com/1200x/18/23/a4/image.jpg',
        'https://i.pinimg.com/736x/18/23/a4/image.jpg',
      ]);
  });

  it('使用设置中的自定义规则替换 URL', () => {
    expect(pinterestOriginalUrl('https://img.example.com/thumb/abc.jpg', [{
      name: 'test',
      host: 'img\\.example\\.com',
      path: '^/thumb/(.+)$',
      replacement: '/original/$1',
    }])).toBe('https://img.example.com/original/abc.jpg');
  });
});
