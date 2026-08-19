// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { calculateButtonPosition } from './hover-button';

describe('calculateButtonPosition', () => {
  it('完整可见的图片:按钮贴右上角', () => {
    const pos = calculateButtonPosition({ top: 100, left: 50, right: 450, bottom: 400 }, 1280, 800);
    expect(pos).toEqual({ left: 450 - 26 - 6, top: 100 + 6 });
  });

  it('图片部分滚出视口顶部:取可视交集的右上角', () => {
    const pos = calculateButtonPosition({ top: -200, left: 50, right: 450, bottom: 400 }, 1280, 800);
    expect(pos).toEqual({ left: 450 - 26 - 6, top: 6 });
  });

  it('图片部分滚出视口右侧:按钮不超出视口', () => {
    const pos = calculateButtonPosition({ top: 100, left: 1200, right: 1400, bottom: 400 }, 1280, 800);
    expect(pos?.left).toBe(1280 - 26 - 6);
  });

  it('可视区域过小(小图标/表情)不显示', () => {
    expect(calculateButtonPosition({ top: 0, left: 0, right: 40, bottom: 40 }, 1280, 800)).toBeNull();
  });

  it('完全滚出视口不显示', () => {
    expect(calculateButtonPosition({ top: -500, left: 0, right: 400, bottom: -100 }, 1280, 800)).toBeNull();
    expect(calculateButtonPosition({ top: 1000, left: 0, right: 400, bottom: 1400 }, 1280, 800)).toBeNull();
  });
});
