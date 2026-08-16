/**
 * procm room 集成 —— 可选初始化。
 *
 * 由 procm 托管启动（注入 PROCM_ROOM_ID / PROCM_WS_URL）时创建房间客户端并
 * 输出结构化日志帧；直接运行（无环境变量）时全部 API 退化为 no-op，行为不变。
 */
import type { JsonValue, Logger, ProcmClient } from '@hunmer/procm-mcp-sdk';
import { logRingBuffer } from './LogRingBuffer';

export type ProcmLoggerLike = Pick<Logger, 'debug' | 'info' | 'warn' | 'error'>;

export const BACKEND_READY_TOPIC = 'backend:ready';

let procmClient: ProcmClient | null = null;
let procmLogger: ProcmLoggerLike = createNoopLogger();

function createNoopLogger(): ProcmLoggerLike {
    return {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
    };
}

// procm 从进程 stdout/stderr 文件解析日志帧；直接写原始流，
// 避免帧进入 logCapture 的 SSE 环形缓冲。
const rawConsole = {
    debug: (text: string) => writeLine(process.stdout, text),
    info: (text: string) => writeLine(process.stdout, text),
    warn: (text: string) => writeLine(process.stderr, text),
    error: (text: string) => writeLine(process.stderr, text),
};

function writeLine(stream: NodeJS.WriteStream, text: string): void {
    try {
        stream.write(`${text}\n`);
    } catch {
        // 日志写入失败不得影响业务
    }
}

export async function initProcm(): Promise<void> {
    if (procmClient) return;
    if (process.env.NODE_ENV !== 'development') return;
    const { createProcmClient, setupLogger } = await import('@hunmer/procm-mcp-sdk');
    const loggerOptions = {
        clientName: 'mira-app-server',
        captureConsole: true,
    };
    if (!process.env.PROCM_ROOM_ID || !process.env.PROCM_WS_URL) {
        procmLogger = setupLogger({
            ...loggerOptions,
            onLog: (entry) => logRingBuffer.push(entry.level, [entry.message, entry.data]),
        });
        return;
    }
    try {
        procmClient = createProcmClient({ clientName: 'mira-app-server' });
    } catch (error) {
        console.warn('procm client init failed:', error);
        return;
    }
    procmLogger = setupLogger({
        client: procmClient,
        console: rawConsole,
        ...loggerOptions,
        onLog: (entry) => logRingBuffer.push(entry.level, [entry.message, entry.data]),
    });
    procmLogger.info('procm room enabled', { roomId: procmClient.roomId });
}

export function getProcmClient(): ProcmClient | null {
    return procmClient;
}

export function getProcmLogger(): ProcmLoggerLike {
    return procmLogger;
}

/**
 * 发布后端就绪状态（retain），供前端/诊断脚本 waitFor('backend:ready')。
 * 仅在客户端连上后发送一次。
 */
export function publishBackendReady(payload: JsonValue): void {
    const client = procmClient;
    if (!client) return;
    const off = client.onState((state) => {
        if (state !== 'open') return;
        off();
        try {
            client.publish(BACKEND_READY_TOPIC, payload, { retain: true });
            procmLogger.info('backend ready published', payload);
        } catch {
            // 未连接时跳过
        }
    });
}

export function closeProcm(): void {
    procmClient?.close();
    procmClient = null;
    procmLogger = createNoopLogger();
}
