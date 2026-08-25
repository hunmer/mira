import { WebSocketOptions, WebSocketMessage, WebSocketEventCallback } from '../types';

// 运行时检测：浏览器用原生 WebSocket，Node.js 用 ws
type WSConstructor = new (url: string, protocols?: any) => any;

let WS: WSConstructor;
let isBrowser = typeof window !== 'undefined' && typeof (window as any).WebSocket !== 'undefined';

if (isBrowser) {
    WS = (window as any).WebSocket;
} else {
    // Node.js 环境：延迟 require，避免浏览器打包时报错
    try {
        WS = require('ws');
    } catch {
        // 如果 ws 不可用，提供一个占位，运行时会抛错
        WS = class {
            constructor() { throw new Error('ws module not available'); }
        } as any;
    }
}

interface WSInstance {
    on(event: string, listener: (...args: any[]) => void): void;
    send(data: string | ArrayBufferView | ArrayBuffer): void;
    close(): void;
    readyState: number;
    binaryType?: string;
}

// Node ws 用 EventEmitter 的 .on；浏览器原生 WebSocket 只有 addEventListener（回调参数是 Event 对象），统一适配
const attachListener = (ws: any, event: string, listener: (...args: any[]) => void): void => {
    if (typeof ws.on === 'function') {
        ws.on(event, listener);
    } else if (typeof ws.addEventListener === 'function') {
        ws.addEventListener(event, (e: any) => {
            if (event === 'message') return listener(e.data);
            if (event === 'close') return listener(e.code, e.reason || '');
            if (event === 'error') return listener(e.error || new Error('WebSocket error'));
            listener();
        });
    }
};

const WS_OPEN = 1;

/**
 * 轻量 EventEmitter，不依赖 Node.js events 模块
 */
class SimpleEmitter {
    private _listeners: Map<string, Function[]> = new Map();

    on(event: string, fn: Function): this {
        if (!this._listeners.has(event)) this._listeners.set(event, []);
        this._listeners.get(event)!.push(fn);
        return this;
    }

    off(event: string, fn: Function): this {
        const list = this._listeners.get(event);
        if (list) {
            const idx = list.indexOf(fn);
            if (idx !== -1) list.splice(idx, 1);
        }
        return this;
    }

    emit(event: string, ...args: any[]): boolean {
        const list = this._listeners.get(event);
        if (!list || list.length === 0) return false;
        for (const fn of list.slice()) fn(...args);
        return true;
    }

    removeAllListeners(event?: string): this {
        if (event) this._listeners.delete(event);
        else this._listeners.clear();
        return this;
    }
}

/**
 * Mira WebSocket Client
 * 提供WebSocket连接功能，支持事件监听和消息发送
 * 兼容浏览器原生 WebSocket 和 Node.js ws 模块
 */
export class WebSocketClient extends SimpleEmitter {
    private ws?: WSInstance;
    private url: string;
    private options: WebSocketOptions;
    private _isConnected: boolean = false;
    private reconnectCount: number = 0;
    private eventCallbacks: Map<string, WebSocketEventCallback[]> = new Map();
    private dataCallback?: (data: any) => void;
    private reconnectTimer?: ReturnType<typeof setTimeout>;

    constructor(port: number, options: WebSocketOptions = {}) {
        super();

        this.options = {
            reconnect: true,
            reconnectInterval: 5000,
            maxReconnectAttempts: 10,
            ...options
        };

        const params = new URLSearchParams();
        if (this.options.clientId) params.append('clientId', this.options.clientId);
        if (this.options.libraryId) params.append('libraryId', this.options.libraryId);
        if (this.options.token) params.append('token', this.options.token);

        if (this.options.url) {
            // 显式完整地址：追加鉴权参数后使用（跨设备场景不能假设 localhost）
            const base = this.options.url.replace(/\/+$/, '').replace(/\?.*$/, '');
            this.url = `${base}?${params.toString()}`;
        } else {
            const host = this.options.host || 'localhost';
            this.url = `ws://${host}:${port}?${params.toString()}`;
        }
    }

    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const wsInstance = new WS(this.url) as WSInstance;
                this.ws = wsInstance;
                // 二进制帧按 ArrayBuffer 交付（默认 Blob 不便逐字节解析）
                try { this.ws.binaryType = 'arraybuffer'; } catch { /* Node ws 无此属性 */ }

                if (!this.ws) {
                    reject(new Error('Failed to create WebSocket instance'));
                    return;
                }

                attachListener(this.ws, 'open', () => {
                    this._isConnected = true;
                    this.reconnectCount = 0;
                    this.emit('connected');
                    resolve();
                });

                attachListener(this.ws, 'message', (data: any) => {
                    this.handleMessage(data);
                });

                attachListener(this.ws, 'close', (code: number, reason: any) => {
                    this._isConnected = false;
                    const reasonStr = typeof reason === 'string' ? reason :
                        (reason && typeof reason.toString === 'function' ? reason.toString() : '');
                    this.emit('disconnected', { code, reason: reasonStr });

                    if (this.options.reconnect && this.reconnectCount < (this.options.maxReconnectAttempts || 10)) {
                        this.scheduleReconnect();
                    }
                });

                attachListener(this.ws, 'error', (error: Error) => {
                    this.emit('error', error);
                    if (!this._isConnected) reject(error);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    stop(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }
        if (this.ws) {
            this.options.reconnect = false;
            this.ws.close();
            this.ws = undefined;
        }
        this._isConnected = false;
    }

    bind(eventName: string, callback: WebSocketEventCallback): void {
        if (!this.eventCallbacks.has(eventName)) this.eventCallbacks.set(eventName, []);
        this.eventCallbacks.get(eventName)!.push(callback);
    }

    unbind(eventName: string, callback?: WebSocketEventCallback): void {
        if (!this.eventCallbacks.has(eventName)) return;
        const callbacks = this.eventCallbacks.get(eventName)!;
        if (callback) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) callbacks.splice(index, 1);
        } else {
            this.eventCallbacks.set(eventName, []);
        }
    }

    onData(callback: (data: any) => void): void {
        this.dataCallback = callback;
    }

    send(message: WebSocketMessage): void {
        if (!this._isConnected || !this.ws) {
            throw new Error('WebSocket is not connected');
        }
        this.ws.send(JSON.stringify(message));
    }

    /**
     * 发送二进制帧（设备间端到端文件传输用，server 按帧头目标 clientId 转发）。
     * 浏览器端传 ArrayBuffer / TypedArray 均可。
     */
    sendBinary(data: ArrayBuffer | ArrayBufferView): void {
        if (!this._isConnected || !this.ws) {
            throw new Error('WebSocket is not connected');
        }
        this.ws.send(data as any);
    }

    /** 当前连接的待发送缓冲字节数（浏览器实现可用；发送端流控用，不可得时返回 0） */
    get bufferedAmount(): number {
        const amount = (this.ws as any)?.bufferedAmount;
        return typeof amount === 'number' ? amount : 0;
    }

    sendPluginMessage(action: string, data: Record<string, any>, requestId?: string): void {
        this.send({
            eventName: 'plugin',
            action,
            requestId: requestId || this.generateRequestId(),
            libraryId: this.options.libraryId,
            payload: { type: 'plugin', data },
            data
        });
    }

    isConnectedStatus(): boolean {
        return this._isConnected && this.ws?.readyState === WS_OPEN;
    }

    private handleMessage(data: any): void {
        // 二进制帧（设备间文件传输）：不参与 JSON 解析，直接以 binary 事件分发
        if (typeof data !== 'string') {
            this.emit('binary', data);
            return;
        }
        try {
            const message = JSON.parse(data) as WebSocketMessage;

            if (this.dataCallback) {
                try { this.dataCallback(message); } catch (e) { console.error('Error in data callback:', e); }
            }

            if (message.eventName && this.eventCallbacks.has(message.eventName)) {
                for (const cb of this.eventCallbacks.get(message.eventName)!.slice()) {
                    try { cb(message.data || message); } catch (e) { console.error(`Error in event callback for ${message.eventName}:`, e); }
                }
            }

            this.emit('message', message);
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
            this.emit('error', new Error('Failed to parse message'));
        }
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectCount++;
        console.log(`Attempting to reconnect (${this.reconnectCount}/${this.options.maxReconnectAttempts})...`);
        this.reconnectTimer = setTimeout(() => {
            this.start().catch(e => console.error('Reconnection failed:', e));
        }, this.options.reconnectInterval);
    }

    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
