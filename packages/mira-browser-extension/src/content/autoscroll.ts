export const MAX_SCROLL_FRAMES = 50;

export interface AutoScrollOptions {
  /** 每次滚动像素 */
  step?: number;
  /** 滚动间隔(ms) */
  delay: number;
  /** 到位回调(截图模式用) */
  onArrive?: (y: number) => void | Promise<void>;
  /** 中断信号 */
  signal?: AbortSignal;
}

export interface AutoScroller {
  start(opts: AutoScrollOptions): Promise<void>;
  stop(): void;
}

export function createAutoScroller(): AutoScroller {
  let controller: AbortController | null = null;

  function waitForRepaint(): Promise<void> {
    return new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }

  async function start(opts: AutoScrollOptions): Promise<void> {
    controller = new AbortController();
    const signal = opts.signal ?? controller.signal;
    const step = opts.step ?? Math.floor(window.innerHeight * 0.9);

    for (let frame = 0; frame < MAX_SCROLL_FRAMES; frame++) {
      if (signal.aborted) return;
      const beforeY = window.scrollY;
      window.scrollBy(0, step);
      await waitForRepaint();
      if (opts.delay > 0) await new Promise(r => setTimeout(r, opts.delay));
      await opts.onArrive?.(window.scrollY);
      // 到底判定
      if (window.scrollY === beforeY) return;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1) return;
    }
  }

  function stop(): void {
    controller?.abort();
  }

  return { start, stop };
}
