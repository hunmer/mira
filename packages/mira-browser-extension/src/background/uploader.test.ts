import { describe, it, expect, vi } from 'vitest';
import { createUploader, MAX_CONCURRENCY } from './uploader';

function makeFile(name: string): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' });
}

describe('uploader', () => {
  it('MAX_CONCURRENCY 为 3', () => {
    expect(MAX_CONCURRENCY).toBe(3);
  });

  it('enqueue 返回 task id 且状态为 queued', () => {
    const u = createUploader({ upload: async () => ({ success: true, file: 'f1' }) });
    const id = u.enqueue({ file: makeFile('a.png'), libraryId: 'lib1', source: 'dragdrop' });
    const task = u.getQueue().find(t => t.id === id);
    expect(task).toBeDefined();
    expect(task!.status).toBe('queued');
  });

  it('顺序处理任务并标记 success', async () => {
    const upload = vi.fn(async () => ({ success: true, file: 'f1' }));
    const u = createUploader({ upload });
    u.enqueue({ file: makeFile('a.png'), libraryId: 'lib1', source: 'dragdrop' });
    u.enqueue({ file: makeFile('b.png'), libraryId: 'lib1', source: 'dragdrop' });
    await u.idle();
    expect(upload).toHaveBeenCalledTimes(2);
    expect(u.getQueue().every(t => t.status === 'success')).toBe(true);
  });

  it('upload 失败标记 failed 并记录 error', async () => {
    const u = createUploader({
      upload: async () => { throw new Error('network down'); },
    });
    u.enqueue({ file: makeFile('a.png'), libraryId: 'lib1', source: 'dragdrop' });
    await u.idle();
    const task = u.getQueue()[0];
    expect(task.status).toBe('failed');
    expect(task.error).toContain('network down');
  });

  it('cancelTask 中止上传', async () => {
    let resolveUpload: () => void;
    const upload = vi.fn(() => new Promise<any>(r => { resolveUpload = () => r({ success: true, file: 'f' }); }));
    const u = createUploader({ upload });
    const id = u.enqueue({ file: makeFile('a.png'), libraryId: 'lib1', source: 'dragdrop' });
    u.cancelTask(id);
    resolveUpload!();
    await u.idle();
    // 取消后任务应被移除或标记取消
    const task = u.getQueue().find(t => t.id === id);
    expect(task === undefined || task.status === 'failed').toBe(true);
  });

  it('onQueueChange 在状态变化时触发', async () => {
    const u = createUploader({ upload: async () => ({ success: true, file: 'f' }) });
    const changes: string[] = [];
    u.onQueueChange(tasks => changes.push(tasks.map(t => t.status).join(',')));
    u.enqueue({ file: makeFile('a.png'), libraryId: 'lib1', source: 'dragdrop' });
    await u.idle();
    expect(changes.length).toBeGreaterThan(0);
    expect(changes.some(c => c.includes('success'))).toBe(true);
  });
});
