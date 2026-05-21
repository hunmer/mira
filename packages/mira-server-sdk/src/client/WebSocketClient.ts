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
    send(data: string): void;
    close(): void;
    readyState: number;
}

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

        this.url = `ws://localhost:${port}?${params.toString()}`;
    }

    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const wsInstance = new WS(this.url) as WSInstance;
                this.ws = wsInstance;

                if (!this.ws) {
                    reject(new Error('Failed to create WebSocket instance'));
                    return;
                }

                this.ws.on('open', () => {
                    this._isConnected = true;
                    this.reconnectCount = 0;
                    this.emit('connected');
                    resolve();
                });

                this.ws.on('message', (data: any) => {
                    this.handleMessage(data);
                });

                this.ws.on('close', (code: number, reason: any) => {
                    this._isConnected = false;
                    const reasonStr = typeof reason === 'string' ? reason :
                        (reason && typeof reason.toString === 'function' ? reason.toString() : '');
                    this.emit('disconnected', { code, reason: reasonStr });

                    if (this.options.reconnect && this.reconnectCount < (this.options.maxReconnectAttempts || 10)) {
                        this.scheduleReconnect();
                    }
                });

                this.ws.on('error', (error: Error) => {
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
        try {
            const raw = typeof data === 'string' ? data :
                (data && typeof data.toString === 'function' ? data.toString() : String(data));
            const message = JSON.parse(raw) as WebSocketMessage;

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
