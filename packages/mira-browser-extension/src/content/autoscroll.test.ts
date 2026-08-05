// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAutoScroller, MAX_SCROLL_FRAMES } from './autoscroll';

describe('autoscroll', () => {
  beforeEach(() => {
    // 模拟页面尺寸
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2400, configurable: true });
    let scrollY = 0;
    Object.defineProperty(window, 'scrollY', { get: () => scrollY, configurable: true });
    window.scrollBy = vi.fn((_x: number, dy: number) => { scrollY += dy; }) as unknown as typeof window.scrollBy;
    window.scrollTo = vi.fn((_x: number, y: number) => { scrollY = y; }) as unknown as typeof window.scrollTo;
  });

  it('MAX_SCROLL_FRAMES 为 50', () => {
    expect(MAX_SCROLL_FRAMES).toBe(50);
  });

  it('滚到底自动停止', async () => {
    const scroller = createAutoScroller();
    const arrives: number[] = [];
    await scroller.start({ step: 800, delay: 0, onArrive: y => { arrives.push(y); } });
    expect(arrives.length).toBeGreaterThan(0);
    // 2400 高度 / 800 步 = 3 次
    expect(arrives.length).toBeLessThanOrEqual(4);
  });

  it('AbortSignal 中断滚动', async () => {
    const controller = new AbortController();
    const scroller = createAutoScroller();
    const promise = scroller.start({ step: 800, delay: 0, signal: controller.signal });
    controller.abort();
    await expect(promise).resolves.toBeUndefined();
  });
});
