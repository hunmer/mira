import { describe, expect, it } from 'vitest';
import { runConcurrent } from './concurrency';

describe('runConcurrent', () => {
  it('并发数不超过限制且处理全部任务', async () => {
    let active = 0;
    let maxActive = 0;
    const done: number[] = [];
    await runConcurrent([1, 2, 3, 4, 5], 3, async item => {
      active++;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      done.push(item);
      active--;
    });
    expect(maxActive).toBe(3);
    expect(done.sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
