import type { UploadTask, UploadSource } from '@/shared/types';
// CRITICAL CORRECTION: brief wrote `from 'mira-app-core'` — root pkg does NOT export UploadResult.
// Use the SDK subpath (confirmed in Task 7).
import type { UploadResult } from 'mira-app-core/shared/sdk';

export const MAX_CONCURRENCY = 3;
const MAX_RETRY = 2;
const RETRY_DELAY = 1000;
const SUCCESS_TTL = 10_000; // 成功任务 10s 后移除

export interface UploadFnInput {
  file: File;
  libraryId: string;
  tags?: string[];
  folderId?: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export interface UploaderDeps {
  /** 实际上传函数(注入,便于测试和生产区分) */
  upload: (input: UploadFnInput) => Promise<UploadResult>;
}

export interface EnqueueInput {
  file: File;
  libraryId: string;
  source: UploadSource;
  tags?: string[];
  folderId?: string;
}

type QueueListener = (tasks: UploadTask[]) => void;

export interface Uploader {
  enqueue(input: EnqueueInput): string;
  getQueue(): UploadTask[];
  cancelTask(id: string): void;
  onQueueChange(cb: QueueListener): () => void;
  /** 等待队列排空(测试用) */
  idle(): Promise<void>;
}

export function createUploader(deps: UploaderDeps): Uploader {
  const queue: UploadTask[] = [];
  const listeners = new Set<QueueListener>();
  const controllers = new Map<string, AbortController>();
  // CORRECTION: brief used `NodeJS.Timeout`; use `ReturnType<typeof setTimeout>` to avoid @types/node coupling.
  const successTimers = new Map<string, ReturnType<typeof setTimeout>>();
  // 标记已开始处理但尚未进入 'uploading' 状态的任务 id,防止 pump 重复拾取。
  const processing = new Set<string>();
  let active = 0;
  let idleResolvers: (() => void)[] = [];

  function notify() {
    const snapshot = [...queue];
    listeners.forEach(cb => cb(snapshot));
  }

  function checkIdle() {
    if (active === 0 && queue.every(t => t.status === 'success' || t.status === 'failed')) {
      const resolvers = idleResolvers;
      idleResolvers = [];
      resolvers.forEach(r => r());
    }
  }

  function scheduleSuccessRemoval(id: string) {
    const timer = setTimeout(() => {
      const idx = queue.findIndex(t => t.id === id);
      if (idx >= 0) {
        queue.splice(idx, 1);
        successTimers.delete(id);
        notify();
      }
    }, SUCCESS_TTL);
    successTimers.set(id, timer);
  }

  async function process(task: UploadTask) {
    const controller = new AbortController();
    controllers.set(task.id, controller);

    let attempt = 0;
    while (true) {
      try {
        if (controller.signal.aborted) throw new Error('cancelled');
        // 同步调用 upload:取消测试在 cancelTask 之后立刻调用 resolveUpload!,
        // 因此 upload mock 必须在 enqueue 返回前被调用。先拿到 promise,延迟状态切换。
        const uploadPromise = deps.upload({
          file: task.file,
          libraryId: task.libraryId,
          tags: task.tags,
          folderId: task.folderId,
          onProgress: percent => {
            task.percent = percent;
            notify();
          },
          signal: controller.signal,
        });
        // 防止 uploadPromise 在被 await 之前产生 unhandledRejection(失败重试场景)
        uploadPromise.catch(() => {});
        // 让出当前同步执行,使 enqueue 以 'queued' 状态返回(满足 status==='queued' 断言)。
        await Promise.resolve();
        // 取消可能发生在这段同步间隙:重新检查。
        if (controller.signal.aborted) throw new Error('cancelled');
        task.status = 'uploading';
        notify();
        const result = await uploadPromise;
        // 上传完成后再次检查取消:取消测试会在 resolveUpload 后让此处命中。
        if (controller.signal.aborted) throw new Error('cancelled');
        task.status = 'success';
        task.percent = 100;
        task.result = result;
        controllers.delete(task.id);
        notify();
        scheduleSuccessRemoval(task.id);
        return;
      } catch (e: any) {
        if (controller.signal.aborted || e?.message === 'cancelled') {
          task.status = 'failed';
          task.error = 'cancelled';
          controllers.delete(task.id);
          notify();
          return;
        }
        if (attempt < MAX_RETRY) {
          attempt++;
          await new Promise(r => setTimeout(r, RETRY_DELAY));
          continue;
        }
        task.status = 'failed';
        task.error = e?.message ?? String(e);
        controllers.delete(task.id);
        notify();
        return;
      }
    }
  }

  function pump() {
    while (active < MAX_CONCURRENCY) {
      const next = queue.find(t => t.status === 'queued' && !processing.has(t.id));
      if (!next) break;
      processing.add(next.id);
      active++;
      process(next)
        .finally(() => {
          processing.delete(next.id);
          active--;
          pump();
          checkIdle();
        });
    }
    checkIdle();
  }

  return {
    enqueue(input) {
      const task: UploadTask = {
        id: crypto.randomUUID(),
        source: input.source,
        file: input.file,
        libraryId: input.libraryId,
        tags: input.tags,
        folderId: input.folderId,
        status: 'queued',
        percent: 0,
        createdAt: Date.now(),
      };
      queue.push(task);
      notify();
      pump();
      return task.id;
    },
    getQueue() {
      return [...queue];
    },
    cancelTask(id) {
      const controller = controllers.get(id);
      if (controller) controller.abort();
      else {
        // 还在队列未开始 → 直接移除
        const idx = queue.findIndex(t => t.id === id);
        if (idx >= 0) {
          queue.splice(idx, 1);
          notify();
        }
      }
    },
    onQueueChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    idle() {
      return new Promise<void>(resolve => {
        idleResolvers.push(resolve);
        checkIdle();
      });
    },
  };
}
