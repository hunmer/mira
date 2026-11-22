import { MiraServer } from '../MiraServer';

/**
 * 文件事件的 WebSocket 广播单一出口（收敛路由层原 broadcastPluginEvent +
 * broadcastLibraryEvent + sendToWebsocket 三连调用）。
 *
 * emitFileEvent 绝不修改调用方传入的 payload：plugin envelope 与 library
 * 事件的 data 均按各站点原有形状原样发送，仅把重复的信封组装收拢到一处。
 */
export interface EmitFileEventOptions {
    /** broadcastPluginEvent 的 message.action（如 'create' | 'update' | 'delete'） */
    action?: string;
    /** 追加进 plugin message 的字段（上传场景的 fields / payload） */
    message?: { fields?: unknown; payload?: unknown };
    /** plugin envelope 的 result 字段，默认复用 payload */
    pluginResult?: Record<string, any> | null;
    /** 追加到 plugin envelope 的额外字段（如 old_data） */
    pluginExtra?: Record<string, unknown>;
    /** 传 false 跳过 broadcastPluginEvent（默认发送） */
    pluginEvent?: boolean;
    /** broadcastLibraryEvent 的 data，默认复用 payload */
    libraryPayload?: Record<string, any>;
    /** 传 false 跳过 broadcastLibraryEvent（默认发送） */
    libraryEvent?: boolean;
    /** 定向回执给发起本次操作的 ws 客户端（file::uploaded 等） */
    client?: {
        clientId: string | null;
        event?: string;
        data: Record<string, any>;
    };
}

export function emitFileEvent(
    backend: MiraServer,
    libraryId: string,
    fileId: number | undefined,
    event: string,
    payload: Record<string, any>,
    options: EmitFileEventOptions = {},
): void {
    const ws = backend.webSocketServer;
    if (!ws) return;

    if (options.pluginEvent !== false) {
        ws.broadcastPluginEvent(event, {
            message: { type: 'file', action: options.action ?? '', ...(options.message ?? {}) },
            result: options.pluginResult ?? payload,
            libraryId,
            ...(fileId !== undefined ? { fileId } : {}),
            ...(options.pluginExtra ?? {}),
        });
    }

    if (options.libraryEvent !== false) {
        ws.broadcastLibraryEvent(libraryId, event, options.libraryPayload ?? payload);
    }

    const client = options.client;
    if (client?.clientId) {
        const target = ws.getWsClientById(libraryId, client.clientId);
        target && ws.sendToWebsocket(target, {
            eventName: client.event ?? event,
            data: client.data,
        });
    }
}
