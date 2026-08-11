import { describe, expect, it } from 'vitest';
import { resourceFilename } from './resource-filename';

describe('resourceFilename', () => {
  it('用响应 MIME 给无扩展名的图片 URL 补后缀', () => {
    expect(resourceFilename(
      'https://img1.baidu.com/it/u=2699302193,3496976053&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=806',
      'image/jpeg',
    )).toBe('u=2699302193,3496976053&fm=253&fmt=auto&app=138&f=JPEG.jpg');
  });

  it('保留 URL 已有的扩展名', () => {
    expect(resourceFilename('https://example.com/photo.webp?size=large', 'image/jpeg')).toBe('photo.webp');
  });
});
