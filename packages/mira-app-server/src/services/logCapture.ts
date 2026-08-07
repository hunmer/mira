/**
 * logCapture —— 拦截 console 输出灌入日志环形缓冲。
 *
 * 后端使用裸 `console.log` / `console.error` / `console.warn`，所有输出经
 * detached 进程的 stdio 重定向写入 `service.log`。为了让 SSE 日志端点能拿到
 * 这些日志，我们在服务器启动早期调用 `installLogCapture()` 一次，包装这三个
 * 方法：先推入环形缓冲，再调用原始实现（保留 `service.log` 行为不变）。
 *
 * 只能安装一次；重复调用安全（返回已有标志）。
 */
import { logRingBuffer, LogLevel } from './LogRingBuffer';

let installed = false;

/**
 * 安装 console 拦截。在进程启动早期调用一次即可。
 * 幂等：重复调用不会重复包装。
 */
export function installLogCapture(): void {
    if (installed) return;
    installed = true;

    const wrap = (level: LogLevel, original: (...args: unknown[]) => void) => {
        return (...args: unknown[]) => {
            try {
                logRingBuffer.push(level, args);
            } catch {
                // 拦截异常不得影响原始日志输出
            }
            original.apply(console, args);
        };
    };

    console.log = wrap('log', console.log.bind(console));
    console.error = wrap('error', console.error.bind(console));
    console.warn = wrap('warn', console.warn.bind(console));
}
