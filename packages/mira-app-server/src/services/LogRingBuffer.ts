/**
 * LogRingBuffer —— 进程内的日志环形缓冲。
 *
 * 后端使用裸 `console.log` / `console.error`，没有日志库。为了让 SSE 日志端点
 * （`GET /api/logs/stream`）能向新连接的客户端回放「最近 100 条」历史日志，
 * 我们在进程内维护一个固定容量的环形缓冲：每条日志带时间戳与级别，订阅者可
 * 实时收到新增日志。
 *
 * 设计要点：
 * - 单例（`logRingBuffer`），全进程共享
 * - `push` 超容量时丢弃最旧条目（FIFO）
 * - `subscribe` 返回反订阅函数，便于 SSE 连接关闭时清理
 */
export type LogLevel = 'debug' | 'info' | 'error' | 'warn';

export interface LogEntry {
    /** ISO 时间戳 */
    timestamp: string;
    level: LogLevel;
    /** 单行日志文本（多行 console 入参已 join） */
    line: string;
}

export type LogSubscriber = (entry: LogEntry) => void;

export class LogRingBuffer {
    private buffer: LogEntry[] = [];
    private readonly subscribers = new Set<LogSubscriber>();

    constructor(private readonly capacity = 100) { }

    /** 追加一条日志并通知订阅者 */
    push(level: LogLevel, args: unknown[]): void {
        const line = args.map(arg => formatArg(arg)).join(' ');
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            line,
        };
        this.buffer.push(entry);
        if (this.buffer.length > this.capacity) {
            // 丢弃最旧条目，保持容量
            this.buffer.splice(0, this.buffer.length - this.capacity);
        }
        // 复制一份再遍历，避免订阅者中再触发 push 造成迭代异常
        for (const subscriber of [...this.subscribers]) {
            try {
                subscriber(entry);
            } catch {
                // 订阅者异常不应影响日志主流程
            }
        }
    }

    /** 返回当前缓冲区快照（按时间正序） */
    recent(): LogEntry[] {
        return [...this.buffer];
    }

    /** 订阅新增日志，返回反订阅函数 */
    subscribe(fn: LogSubscriber): () => void {
        this.subscribers.add(fn);
        return () => this.subscribers.delete(fn);
    }

    /** 当前条目数（测试 / 诊断用） */
    size(): number {
        return this.buffer.length;
    }
}

function formatArg(arg: unknown): string {
    if (arg instanceof Error) {
        return arg.stack || `${arg.name}: ${arg.message}`;
    }
    if (typeof arg === 'object' && arg !== null) {
        try {
            return JSON.stringify(arg);
        } catch {
            return String(arg);
        }
    }
    return String(arg);
}

/** 全进程共享单例 */
export const logRingBuffer = new LogRingBuffer(100);
