import { ServerPluginManager, MiraWebsocketServer, ServerPlugin, ws } from 'mira-app-server';
import { ILibraryServerData } from 'mira-app-core/storage/sqlite';
import { MiraHttpServer } from 'mira-app-server/dist/server';
import { EventManager } from 'mira-app-core/dist';

interface WebhookConfig {
    title: string;
    events: string[];
    token: string;
}

interface N8nConfig {
    port: number;
    list: Record<string, WebhookConfig>;
}
class MiraN8N extends ServerPlugin {
    private readonly server: MiraWebsocketServer;
    private httpServer: MiraHttpServer;
    private dbService: ILibraryServerData;
    private eventManager?: EventManager;
    private wss?: ws.WebSocketServer;
    private eventIds: string[] = [];
    declare configs: N8nConfig;

    constructor({ pluginManager, server, dbService }: { pluginManager: ServerPluginManager, server: MiraWebsocketServer, dbService: ILibraryServerData }) {
        super('mira_n8n', pluginManager, dbService);
        this.server = server;
        this.dbService = dbService;
        this.httpServer = server.backend.getHttpServer();
        this.loadConfig({
            port: 7457,
            list: {
                1: {
                    title: 'test',
                    events: ['file::created'],
                    token: 'token1'
                }
            }
        });

        const libraryId = dbService.getLibraryId();
        this.httpServer.httpRouter.registerRounter(libraryId, '/n8n/list', 'get', async (_req: any, res: { json: (arg0: { success: boolean; data: Record<string, WebhookConfig>; }) => void; }) => {
            res.json({
                success: true,
                data: this.configs.list
            });
        });

        // 添加新的webhook配置
        this.httpServer.httpRouter.registerRounter(libraryId, '/n8n/list', 'post', async (req: { body: { title: any; events: any; token: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { success: boolean; error: string; }): void; new(): any; }; }; json: (arg0: { success: boolean; data: { title: string; events: string[]; token: string; id: string; }; }) => void; }) => {
            try {
                const { title, events, token } = req.body;
                if (!title || !events || !token) {
                    return res.status(400).json({
                        success: false,
                        error: 'Missing required fields: title, events, token'
                    });
                }

                const id = Date.now().toString();
                this.configs.list[id] = { title, events, token };
                this.saveConfig();

                // 重新绑定事件（清除旧的绑定并重新绑定所有事件）
                this.rebindEvents();

                res.json({
                    success: true,
                    data: { id, ...this.configs.list[id] }
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        });

        // 删除webhook配置
        this.httpServer.httpRouter.registerRounter(libraryId, '/n8n/list/:id', 'delete', async (req: { params: { id: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { success: boolean; error: string; }): void; new(): any; }; }; json: (arg0: { success: boolean; message: string; }) => void; }) => {
            try {
                const { id } = req.params;
                if (!this.configs.list[id]) {
                    return res.status(404).json({
                        success: false,
                        error: 'Webhook configuration not found'
                    });
                }

                delete this.configs.list[id];
                this.saveConfig();

                // 重新绑定事件
                this.rebindEvents();

                res.json({
                    success: true,
                    message: 'Webhook configuration deleted'
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        });

        // 根据list的events绑定事件
        const obj = this.httpServer.backend.libraries!.getLibrary(dbService.getLibraryId());
        if (obj) {
            this.eventManager = obj.eventManager as EventManager;

            // 绑定所有配置中的事件
            this.bindConfiguredEvents();
        }

        this.initWss();
        // console.log('mira_n8n plugin initialized');
    }

    private bindConfiguredEvents() {
        if (!this.eventManager) return;

        // 获取所有配置中的唯一事件列表
        const allEvents = new Set<string>();
        Object.values(this.configs.list).forEach(config => {
            config.events.forEach(event => allEvents.add(event));
        });

        // 为每个唯一事件绑定处理器
        allEvents.forEach(eventName => {
            const eventId = this.eventManager!.subscribe(eventName, this.eventHandler.bind(this), 100);
            this.eventIds.push(eventId);
            // console.log(`Bound event: ${eventName}`);
        });
    }

    private rebindEvents() {
        if (!this.eventManager) return;

        // 清除所有现有的事件绑定
        this.eventIds.forEach(eventId => {
            this.eventManager!.unsubscribe(eventId);
        });
        this.eventIds = [];

        // 重新绑定所有配置的事件
        this.bindConfiguredEvents();
    }

    initWss() {
        this.wss = new ws.WebSocketServer({ port: this.configs.port });

        this.wss.on('connection', (ws: ws.WebSocket, request: { url: any; headers: { host: any; }; }) => {
            const url = new URL(request.url ?? '', `ws://${request.headers.host}`);
            const token = url.searchParams.get('token');

            // console.log(`WebSocket connection attempt with token: ${token ? '***' : 'none'}`);

            // Token validation
            const validToken = this.validateToken(token);
            if (!validToken) {
                // console.log('WebSocket connection rejected: Invalid token');
                ws.close(1008, 'Invalid token');
                return;
            }

            // console.log(`WebSocket connected with valid token for config: ${validToken.config.title}`);

            // Store connection information
            (ws as any).tokenInfo = validToken;
            (ws as any).connectedAt = new Date().toISOString();

            // Send welcome message
            ws.send(JSON.stringify({
                eventName: 'connection_established',
                data: {
                    message: 'Connected to Mira WebSocket server',
                    config: {
                        title: validToken.config.title,
                        events: validToken.config.events
                    }
                },
                timestamp: new Date().toISOString(),
                source: 'mira_server'
            }));

            ws.on('message', (message: { toString: () => string; }) => {
                try {
                    const data = JSON.parse(message.toString());
                    // console.log('Received message from client:', data);

                    // Handle ping/pong for keepalive
                    if (data.type === 'ping') {
                        ws.send(JSON.stringify({
                            type: 'pong',
                            timestamp: new Date().toISOString()
                        }));
                    }
                } catch (error) {
                    // console.error('Invalid JSON message from client:', error);
                    ws.send(JSON.stringify({
                        eventName: 'error',
                        data: { message: 'Invalid JSON format' },
                        timestamp: new Date().toISOString(),
                        source: 'mira_server'
                    }));
                }
            });

            ws.on('close', (code: any, reason: any) => {
            // console.log(`WebSocket connection closed: ${code} - ${reason}`);
            });

            ws.on('error', (error: any) => {
            // console.error('WebSocket error:', error);
            });
        });

        // console.log(`Mira N8N WebSocket server listening on port ${this.configs.port}`);
    }

    private validateToken(token: string | null): { id: string, config: WebhookConfig } | null {
        if (!token) return null;

        // 在配置的list中查找匹配的token
        for (const [id, config] of Object.entries(this.configs.list)) {
            if (config.token === token) {
                return { id, config };
            }
        }
        return null;
    }

    private async eventHandler(event: any): Promise<boolean> {
        // console.log('Event triggered:', event);

        // Create standardized message format
        const message = {
            eventName: event.eventName || 'unknown',
            data: event.args || event.data || event,
            timestamp: new Date().toISOString(),
            source: 'mira_server',
            libraryId: this.dbService.getLibraryId()
        };

        // Send to all connected WebSocket clients
        if (this.wss) {
            this.wss.clients.forEach((ws: ws.WebSocket) => {
                if (ws.readyState === ws.OPEN) {
                    const tokenInfo = (ws as any).tokenInfo;
                    if (tokenInfo && this.shouldSendEvent(tokenInfo.config, event.eventName)) {
                        try {
                            ws.send(JSON.stringify(message));
                            // console.log(`Sent event ${event.eventName} to client with token ${tokenInfo.id}`);
                        } catch (error) {
                            // console.error('Error sending message to WebSocket client:', error);
                        }
                    }
                }
            });
        }

        return true;
    }

    private shouldSendEvent(config: WebhookConfig, eventName: string): boolean {
        // If no events specified, send all events
        if (!config.events || config.events.length === 0) {
            return true;
        }

        // Check if event matches any of the configured events
        return config.events.includes(eventName);
    }

    cleanup() {
        this.eventIds.forEach(eventId => {
            this.eventManager?.unsubscribe(eventId);
        });
        this.wss?.close();
    }

}


export function init(inst: any): MiraN8N {
    return new MiraN8N(inst);
}
