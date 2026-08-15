import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { EventArgs } from 'mira-app-core';
import { WebSocketRouter } from './routes/WebSocketRouter';
import { MiraServer } from '.';
import { canAccessLibrary } from './middleware/permission';

interface LibraryClient {
    [libraryId: string]: WebSocket[];
}

interface WSUserInfo {
    id: number;
    username: string;
    role: string;
}

interface ConnectedClient extends WebSocket {
    clientId?: string;
    libraryId?: string;
    user?: WSUserInfo;
    fields?: Record<string, any>;
    connectionTime?: string;
    lastActivity?: string;
    requestInfo?: {
        url?: string;
        headers: Record<string, any>;
        remoteAddress?: string;
    };
}

export class MiraWebsocketServer {
    port: number | undefined;
    libraryClients: LibraryClient = {};
    wss?: WSServer;
    backend: MiraServer;

    constructor(backend: MiraServer) {
        this.backend = backend;
    }

    async start(port: number): Promise<void> {
        this.port = port;
        this.wss = new WSServer({ port: this.port });
        this.wss.on('connection', async (ws: WebSocket, request) => {
            const urlString = request.url ?? '';
            const url = new URL(urlString, `ws://${request.headers.host}`);
            const clientId = url.searchParams.get('clientId');
            const libraryId = url.searchParams.get('libraryId');
            const token = url.searchParams.get('token');

            if (clientId == null || libraryId == null) {
                console.warn('[WebSocketServer] Missing clientId or libraryId, closing connection:', request.url);
                ws.close();
                return;
            }

            // 认证检查
            const settings = this.backend.settingsManager.getSettings();
            let user: WSUserInfo | undefined;

            if (settings.authRequired) {
                if (!token) {
                    console.warn(`[WebSocketServer] No token provided, closing: clientId=${clientId}`);
                    ws.close(4001, 'Authentication required');
                    return;
                }

                const authService = this.backend.httpServer?.authRouter.getAuthService();
                if (!authService) {
                    ws.close(1011, 'Server error');
                    return;
                }

                const validated = await authService.validateToken(token);
                if (!validated) {
                    console.warn(`[WebSocketServer] Invalid token, closing: clientId=${clientId}`);
                    ws.close(4001, 'Authentication failed');
                    return;
                }

                user = { id: validated.id, username: validated.username, role: validated.role };

                // 库权限检查
                const libConfig = this.backend.libraries?.getLibraryConfig(libraryId);
                if (!canAccessLibrary(libConfig, user.role)) {
                    console.warn(`[WebSocketServer] Access denied: user=${user.username} role=${user.role} library=${libraryId}`);
                    ws.close(4003, 'Access denied to library');
                    return;
                }
            }

            this.registerClient(ws, clientId, libraryId, {
                url: request.url,
                headers: request.headers,
                remoteAddress: request.socket.remoteAddress
            }, user);
            this.handleConnection(ws);
        });
    }

    broadcastToClients(eventName: string, eventData: Record<string, any>): void {
        const obj = this.backend.libraries!.getLibrary(eventData.libraryId);
        if (!obj) return;

        const eventManager = obj.eventManager;
        if (!eventManager) return;

        eventManager.broadcast(
            eventName,
            new EventArgs(eventName, eventData)
        );
    }

    getWsClientById(libraryId: string, clientId: string): WebSocket | undefined {
        const clients = this.libraryClients[libraryId];
        if (!clients) return undefined;

        return clients.find((client) => (client as ConnectedClient).clientId === clientId);
    }

    setClientFields(libraryId: string, clientId: string, fields: Record<string, any>): void {
        const client = this.getWsClientById(libraryId, clientId) as ConnectedClient | undefined;
        if (!client) return;

        client.fields = client.fields || {};
        for (const [key, value] of Object.entries(fields)) {
            if (value === null || value === undefined) {
                delete client.fields[key];
            } else {
                client.fields[key] = value;
            }
        }
    }

    getClientFields(libraryId: string, clientId?: string): Record<string, any> | undefined {
        if (!clientId) return undefined;

        const client = this.getWsClientById(libraryId, clientId) as ConnectedClient | undefined;
        return client?.fields;
    }

    showDialogToWeboscket(ws: WebSocket, data: Record<string, any>): void {
        this.sendToWebsocket(ws, {
            eventName: 'dialog',
            data: Object.assign({
                title: '提示',
                message: '',
                url: ''
            }, data)
        });
    }

    sendToWebsocket(ws: WebSocket, data: Record<string, any>): void {
      // console.log('Sending WebSocket message:', data);
        ws.send(JSON.stringify(data));
    }

    broadcastPluginEvent(eventName: string, data: Record<string, any>): Promise<boolean> {
        const libraryId = data?.libraryId ?? data?.message?.libraryId;
        const obj = this.backend.libraries!.getLibrary(libraryId);
        if (!obj) return Promise.resolve(false);

        const eventManager = obj.eventManager;
        if (!eventManager) return Promise.resolve(false);

        return eventManager.broadcast(
            eventName,
            new EventArgs(eventName, data)
        );
    }

    broadcastLibraryEvent(libraryId: string, eventName: string, data: Record<string, any>): void {
        const message = JSON.stringify({ eventName, data });
        const clients = this.libraryClients[libraryId] || [];

        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    async stop(): Promise<void> {
        this.backend.libraries!.clear();
        this.wss?.close();
    }

    private handleConnection(ws: WebSocket): void {
        ws.on('message', async (message: string) => {
            try {
                (ws as ConnectedClient).lastActivity = new Date().toISOString();
                const data = JSON.parse(message);
                await this.handleMessage(ws, data);
            } catch (e) {
                this.sendToWebsocket(ws, {
                    error: 'Invalid message format',
                    details: e instanceof Error ? e.message : String(e)
                });
            }
        });

        ws.on('close', () => {
            this.unregisterClient(ws);
        });
    }

    private async handleMessage(ws: WebSocket, row: Record<string, any>): Promise<void> {
        const client = ws as ConnectedClient;

        // 心跳响应：ping 直接回 pong，不走业务逻辑
        if (row.eventName === 'ping') {
            this.sendToWebsocket(ws, { eventName: 'pong' });
            return;
        }

        const payload = row.payload || {};
        const action = row.action;
        const requestId = row.requestId;
        const libraryId = row.libraryId;
        const data = payload.data || {};
        const recordType = payload.type;

        // 库权限检查：如果消息目标库和用户角色不匹配
        if (client.user && libraryId) {
            const libConfig = this.backend.libraries?.getLibraryConfig(libraryId);
            if (!canAccessLibrary(libConfig, client.user.role)) {
                this.sendToWebsocket(ws, {
                    status: 'error',
                    message: 'Access denied to library',
                    requestId
                });
                return;
            }
        }

        const exists = this.backend.libraries!.libraryExists(libraryId);

        if (!exists) {
            this.sendToWebsocket(ws, {
                status: 'error',
                msg: 'Library not found!'
            });
            return;
        }

        const obj = this.backend.libraries!.getLibrary(libraryId);
        if (!obj) {
            this.sendToWebsocket(ws, {
                status: 'error',
                msg: 'Library service not found'
            });
            return;
        }

        const handler = await WebSocketRouter.route(this, obj.libraryService, ws, {
            ...row,
            ...payload
        });

        if (handler) {
            await handler.handle();
            return;
        }

        this.sendToWebsocket(ws, {
            status: 'error',
            message: `Unsupported action: ${action} and record type: ${recordType}`,
            requestId
        });
    }

    private registerClient(
        ws: WebSocket,
        clientId: string,
        libraryId: string,
        requestInfo: ConnectedClient['requestInfo'],
        user?: WSUserInfo
    ): void {
        const now = new Date().toISOString();

        Object.assign(ws, {
            clientId,
            libraryId,
            user,
            connectionTime: now,
            lastActivity: now,
            requestInfo
        });

        this.libraryClients[libraryId] = this.libraryClients[libraryId] || [];

        const duplicateIndex = this.libraryClients[libraryId].findIndex(
            client => (client as ConnectedClient).clientId === clientId
        );
        if (duplicateIndex !== -1) {
            this.libraryClients[libraryId].splice(duplicateIndex, 1);
        }

        this.libraryClients[libraryId].push(ws);
            `[WebSocketServer] Registered client ${clientId} for library ${libraryId}. ` +
            `libraryConnections=${this.libraryClients[libraryId].length}, totalConnections=${this.getTotalConnectionCount()}`
        );
    }

    private unregisterClient(ws: WebSocket): void {
        Object.keys(this.libraryClients).forEach(libraryId => {
            const index = this.libraryClients[libraryId].findIndex(client => client === ws);
            if (index === -1) return;

            const clientId = (ws as ConnectedClient).clientId || 'unknown';
            this.libraryClients[libraryId].splice(index, 1);

            if (this.libraryClients[libraryId].length === 0) {
                delete this.libraryClients[libraryId];
            }

                `[WebSocketServer] Unregistered client ${clientId} from library ${libraryId}. ` +
                `totalConnections=${this.getTotalConnectionCount()}`
            );
        });
    }

    private getTotalConnectionCount(): number {
        return Object.values(this.libraryClients).reduce((sum, clients) => sum + clients.length, 0);
    }
}
