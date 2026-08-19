// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { calculateButtonPosition, resolveHoverTarget } from './hover-button';

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

describe('resolveHoverTarget', () => {
  it('target 是 img 时直接命中,root 即 img 本身', () => {
    const img = document.createElement('img');
    img.src = 'https://cdn.example.com/photo.jpg';
    expect(resolveHoverTarget(img)).toEqual({ root: img, img });
  });

  it('无 src 的 img 不命中', () => {
    expect(resolveHoverTarget(document.createElement('img'))).toBeNull();
  });

  it('target 是含子 img 的容器(卡片/遮罩)时命中容器为 root', () => {
    const card = document.createElement('div');
    const img = document.createElement('img');
    img.src = 'https://cdn.example.com/photo.jpg';
    const mask = document.createElement('span'); // 图片上方的遮罩层
    card.append(img, mask);

    const hit = resolveHoverTarget(card);
    expect(hit).toEqual({ root: card, img });

    // hover 到遮罩层也能命中卡片
    expect(resolveHoverTarget(mask)?.root).toBe(card);
  });

  it('向上最多 3 层祖先内找子 img,超出不命中', () => {
    const img = document.createElement('img');
    img.src = 'https://cdn.example.com/photo.jpg';
    const depth3 = document.createElement('div');
    const depth2 = document.createElement('div');
    const depth1 = document.createElement('div');
    const target = document.createElement('span');
    depth3.append(img); // target 向上 3 层(depth1/depth2/depth3)才到 img
    depth1.append(target);
    depth2.append(depth1);
    depth3.append(depth2);

    expect(resolveHoverTarget(target)?.root).toBe(depth3);
  });

  it('不含 img 的普通元素不命中', () => {
    expect(resolveHoverTarget(document.createElement('div'))).toBeNull();
    expect(resolveHoverTarget(null)).toBeNull();
  });
});
