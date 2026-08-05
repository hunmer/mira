import { describe, it, expect } from 'vitest';
import { computeStitchSize, scaleRect } from './image-ops';

describe('image-ops', () => {
  it('computeStitchSize 高度 = 帧数 × 视口高度', () => {
    const size = computeStitchSize(['a', 'b', 'c'], 800);
    expect(size.height).toBe(2400);
  });

  it('scaleRect 按 dpr 缩放', () => {
    const r = scaleRect({ x: 10, y: 20, w: 100, h: 50, dpr: 2 });
    expect(r).toEqual({ sx: 20, sy: 40, sw: 200, sh: 100 });
  });
});
