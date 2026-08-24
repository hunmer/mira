import { Router, Request, Response } from 'express';
import { MiraServer } from '../MiraServer';
import { WebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ZipArchive } from 'archiver';

export interface DeviceInfo {
    clientId: string;
    libraryId: string;
    connectionTime: string;
    lastActivity: string;
    requestInfo: {
        url?: string;
        headers: any;
        remoteAddress?: string;
    };
    status: 'connected' | 'disconnected';
    userAgent?: string;
    ipAddress?: string;
}

/** 设备间分享票据：免 token 下载，短期有效 + 限次 */
interface ShareTicket {
    ticketId: string;
    libraryId: string;
    entries: Array<{ absPath: string; relPath: string; name: string }>;
    zipName: string;
    createdAt: number;
    expiresAt: number;
    maxUses: number;
    uses: number;
}

const SHARE_TICKET_TTL_MS = 30 * 60 * 1000; // 30 分钟
const SHARE_TICKET_MAX_USES = 20;
// 惰性清理即可：量级小，每次创建时顺手扫一遍过期项
function createTicketStore() {
    const store = new Map<string, ShareTicket>();
    return {
        create(ticket: ShareTicket): void {
            const now = Date.now();
            for (const [id, t] of store) {
                if (t.expiresAt <= now || t.uses >= t.maxUses) store.delete(id);
            }
            store.set(ticket.ticketId, ticket);
        },
        consume(ticketId: string): ShareTicket | null {
            const ticket = store.get(ticketId);
            if (!ticket) return null;
            if (ticket.expiresAt <= Date.now() || ticket.uses >= ticket.maxUses) {
                store.delete(ticketId);
                return null;
            }
            ticket.uses++;
            if (ticket.uses >= ticket.maxUses) store.delete(ticketId);
            return ticket;
        },
    };
}

export class DeviceRoutes {
    private router: Router;
    private backend: MiraServer;
    private shareTickets = createTicketStore();

    constructor(backend: MiraServer) {
        this.backend = backend;
        this.router = Router();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        // 获取所有素材库的设备连接信息
        this.router.get('/', this.getAllDevices.bind(this));

        // 获取特定素材库的设备连接信息
        this.router.get('/library/:libraryId', this.getLibraryDevices.bind(this));

        // 广播消息（指定设备或全部）
        this.router.post('/broadcast', this.broadcastMessage.bind(this));

        // 断开特定设备连接
        this.router.post('/disconnect', this.disconnectDevice.bind(this));
        this.router.post('/:clientId/disconnect', this.disconnectDeviceByClientId.bind(this));

        // 向特定设备发送消息
        this.router.post('/send-message', this.sendMessageToDevice.bind(this));
        this.router.post('/:clientId/message', this.sendMessageToDeviceByClientId.bind(this));
        this.router.post('/:clientId/test', this.sendTestMessageToDevice.bind(this));
        this.router.get('/:clientId/messages', this.getDeviceMessages.bind(this));

        // 设备间分享：创建一次性下载票据 / 凭票据免认证下载
        this.router.post('/share-tickets', this.createShareTicket.bind(this));
        this.router.get('/share/:ticketId', this.downloadByShareTicket.bind(this));

        // 获取设备统计信息
        this.router.get('/stats', this.getDeviceStats.bind(this));
    }

    /**
     * 创建分享票据。发送方（已认证）把待分享文件解析成库内绝对路径，
     * 接收方之后凭 ticketId 免 token 下载（票据本身即短期凭证）。
     */
    private async createShareTicket(req: Request, res: Response): Promise<void> {
        try {
            const { libraryId, files } = req.body as {
                libraryId: string;
                files: Array<{ path?: string; name?: string }>;
            };

            if (!libraryId || !Array.isArray(files) || files.length === 0) {
                res.status(400).json({ success: false, error: 'libraryId and files are required' });
                return;
            }

            const lib = this.backend.libraries?.getLibrary(libraryId);
            const basePath = lib?.libraryService?.config?.customFields?.path || lib?.libraryService?.config?.path;
            if (!basePath) {
                res.status(400).json({ success: false, error: 'Invalid libraryId' });
                return;
            }
            const resolvedBase = path.resolve(basePath);

            const entries: ShareTicket['entries'] = [];
            for (const file of files) {
                if (!file?.path) continue;
                const full = path.resolve(path.join(resolvedBase, file.path));
                // 严格校验路径穿越（与 /api/fs/download 一致）
                if (!full.startsWith(resolvedBase) || !fs.existsSync(full)) continue;
                const stat = await fs.promises.stat(full);
                if (!stat.isFile()) continue;
                entries.push({
                    absPath: full,
                    relPath: path.relative(resolvedBase, full),
                    name: file.name || path.basename(full),
                });
            }

            if (entries.length === 0) {
                res.status(400).json({ success: false, error: 'No valid files to share' });
                return;
            }

            const ticket: ShareTicket = {
                ticketId: crypto.randomBytes(24).toString('hex'),
                libraryId,
                entries,
                zipName: `mira-share-${Date.now()}.zip`,
                createdAt: Date.now(),
                expiresAt: Date.now() + SHARE_TICKET_TTL_MS,
                maxUses: SHARE_TICKET_MAX_USES,
                uses: 0,
            };
            this.shareTickets.create(ticket);

            res.json({
                success: true,
                data: {
                    ticketId: ticket.ticketId,
                    // 相对路径，调用方（SDK URL builder / 客户端）负责拼 baseURL
                    downloadUrl: `/api/devices/share/${ticket.ticketId}`,
                    fileCount: entries.length,
                    expiresAt: new Date(ticket.expiresAt).toISOString(),
                },
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Failed to create share ticket:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create share ticket',
                details: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * 凭票据下载：票据有效即可（免 Authorization），单文件直接流式返回，多文件 ZIP 打包。
     * 与 /api/fs/download 的打包行为保持一致。
     */
    private async downloadByShareTicket(req: Request, res: Response): Promise<void> {
        try {
            const ticket = this.shareTickets.consume(req.params.ticketId);
            if (!ticket) {
                res.status(410).json({ success: false, error: 'Share ticket expired or not found' });
                return;
            }

            // 票据创建时已校验过文件存在，这里防御性复查（文件可能已被删除）
            const valid = ticket.entries.filter(e => fs.existsSync(e.absPath));
            if (valid.length === 0) {
                res.status(404).json({ success: false, error: 'Shared files no longer exist' });
                return;
            }

            if (valid.length === 1) {
                const filePath = valid[0].absPath;
                const stat = await fs.promises.stat(filePath);
                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Length', stat.size);
                res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(valid[0].name)}`);
                fs.createReadStream(filePath).on('error', (err: Error) => {
                    if (!res.headersSent) res.status(500).json({ error: err.message });
                }).pipe(res);
                return;
            }

            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(ticket.zipName)}`);
            const archive = new ZipArchive({ zlib: { level: 5 } });
            archive.on('error', (err: Error) => {
                if (!res.headersSent) res.status(500).json({ error: err.message });
                else res.end();
            });
            archive.pipe(res);
            for (const entry of valid) {
                archive.file(entry.absPath, { name: entry.relPath });
            }
            archive.finalize();
        } catch (error) {
            console.error('Failed to download by share ticket:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to download',
                    details: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }

    private async broadcastMessage(req: Request, res: Response): Promise<void> {
        try {
            const { message, title, clientIds } = req.body;

            if (!message) {
                res.status(400).json({ success: false, error: 'message is required' });
                return;
            }

            const webSocketServer = this.backend.getWebSocketServer();
            if (!webSocketServer) {
                res.status(500).json({ success: false, error: 'WebSocket server not available' });
                return;
            }

            const payload = {
                eventName: 'notification',
                data: {
                    title: title || 'Administrator',
                    body: message,
                    timestamp: new Date().toISOString(),
                    from: 'administrator',
                },
            };

            let sentCount = 0;

            if (clientIds && Array.isArray(clientIds) && clientIds.length > 0) {
                // 发送给指定设备
                for (const clientId of clientIds) {
                    const found = this.findDeviceClient(clientId);
                    if (found && found.client.readyState === WebSocket.OPEN) {
                        webSocketServer.sendToWebsocket(found.client, payload);
                        sentCount++;
                    }
                }
            } else {
                // 发送给所有设备
                for (const clients of Object.values(webSocketServer.libraryClients)) {
                    for (const client of clients) {
                        if (client.readyState === WebSocket.OPEN) {
                            webSocketServer.sendToWebsocket(client, payload);
                            sentCount++;
                        }
                    }
                }
            }

            res.json({
                success: true,
                data: { sentCount },
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Failed to broadcast message:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to broadcast message',
                details: error instanceof Error ? error.message : String(error),
            });
        }
    }

    private async getAllDevices(req: Request, res: Response): Promise<void> {
        try {
            const webSocketServer = this.backend.getWebSocketServer();
            if (!webSocketServer) {
                res.status(500).json({
                    success: false,
                    error: 'WebSocket server not available'
                });
                return;
            }

            const devices: Record<string, DeviceInfo[]> = {};
            const libraryClients = webSocketServer.libraryClients;
            for (const [libraryId, clients] of Object.entries(libraryClients)) {
                devices[libraryId] = clients.map(client => this.extractDeviceInfo(client, libraryId));
            }

            res.json({
                success: true,
                data: devices,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to get all devices:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve device information',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    private async getLibraryDevices(req: Request, res: Response): Promise<void> {
        try {
            const { libraryId } = req.params;
            const webSocketServer = this.backend.getWebSocketServer();

            if (!webSocketServer) {
                res.status(500).json({
                    success: false,
                    error: 'WebSocket server not available'
                });
                return;
            }

            // 检查素材库是否存在
            if (!this.backend.libraries!.libraryExists(libraryId)) {
                res.status(404).json({
                    success: false,
                    error: 'Library not found',
                    libraryId
                });
                return;
            }

            const clients = webSocketServer.libraryClients[libraryId] || [];
            const devices = clients.map(client => this.extractDeviceInfo(client, libraryId));

            res.json({
                success: true,
                data: devices,
                libraryId,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to get library devices:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve library devices',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    private async disconnectDevice(req: Request, res: Response): Promise<void> {
        try {
            const { libraryId, clientId } = req.body;

            if (!libraryId || !clientId) {
                res.status(400).json({
                    success: false,
                    error: 'libraryId and clientId are required'
                });
                return;
            }

            const webSocketServer = this.backend.getWebSocketServer();
            if (!webSocketServer) {
                res.status(500).json({
                    success: false,
                    error: 'WebSocket server not available'
                });
                return;
            }

            const client = webSocketServer.getWsClientById(libraryId, clientId);
            if (!client) {
                res.status(404).json({
                    success: false,
                    error: 'Device not found',
                    libraryId,
                    clientId
                });
                return;
            }

            // 发送断开连接消息给客户端
            webSocketServer.sendToWebsocket(client, {
                eventName: 'admin_disconnect',
                data: {
                    message: 'Connection terminated by administrator',
                    timestamp: new Date().toISOString()
                }
            });

            // 关闭连接
            client.close(1000, 'Disconnected by administrator');

            res.json({
                success: true,
                message: 'Device disconnected successfully',
                libraryId,
                clientId,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to disconnect device:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to disconnect device',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    private async disconnectDeviceByClientId(req: Request, res: Response): Promise<void> {
        const resolved = this.findDeviceClient(req.params.clientId);
        if (!resolved) {
            res.status(404).json({
                success: false,
                error: 'Device not found',
                clientId: req.params.clientId
            });
            return;
        }

        req.body = {
            ...req.body,
            libraryId: resolved.libraryId,
            clientId: req.params.clientId
        };
        await this.disconnectDevice(req, res);
    }

    private async sendMessageToDevice(req: Request, res: Response): Promise<void> {
        try {
            const { libraryId, clientId, message } = req.body;

            if (!libraryId || !clientId || !message) {
                res.status(400).json({
                    success: false,
                    error: 'libraryId, clientId and message are required'
                });
                return;
            }

            const webSocketServer = this.backend.getWebSocketServer();
            if (!webSocketServer) {
                res.status(500).json({
                    success: false,
                    error: 'WebSocket server not available'
                });
                return;
            }

            const client = webSocketServer.getWsClientById(libraryId, clientId);
            if (!client) {
                res.status(404).json({
                    success: false,
                    error: 'Device not found',
                    libraryId,
                    clientId
                });
                return;
            }

            webSocketServer.sendToWebsocket(client, {
                eventName: 'admin_message',
                data: {
                    message,
                    timestamp: new Date().toISOString(),
                    from: 'administrator'
                }
            });

            res.json({
                success: true,
                message: 'Message sent successfully',
                libraryId,
                clientId,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to send message to device:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send message to device',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    private async sendMessageToDeviceByClientId(req: Request, res: Response): Promise<void> {
        const resolved = this.findDeviceClient(req.params.clientId);
        if (!resolved) {
            res.status(404).json({
                success: false,
                error: 'Device not found',
                clientId: req.params.clientId
            });
            return;
        }

        req.body = {
            ...req.body,
            libraryId: resolved.libraryId,
            clientId: req.params.clientId,
            message: req.body?.message ?? req.body?.content
        };
        await this.sendMessageToDevice(req, res);
    }

    private async sendTestMessageToDevice(req: Request, res: Response): Promise<void> {
        const resolved = this.findDeviceClient(req.params.clientId);
        if (!resolved) {
            res.status(404).json({
                success: false,
                error: 'Device not found',
                clientId: req.params.clientId
            });
            return;
        }

        req.body = {
            ...req.body,
            libraryId: resolved.libraryId,
            clientId: req.params.clientId,
            message: {
                type: 'test',
                content: 'Test message from administrator',
                timestamp: new Date().toISOString()
            }
        };
        await this.sendMessageToDevice(req, res);
    }

    private async getDeviceMessages(req: Request, res: Response): Promise<void> {
        const resolved = this.findDeviceClient(req.params.clientId);
        if (!resolved) {
            res.status(404).json({
                success: false,
                error: 'Device not found',
                clientId: req.params.clientId
            });
            return;
        }

        res.json({
            success: true,
            data: [],
            clientId: req.params.clientId,
            libraryId: resolved.libraryId,
            timestamp: new Date().toISOString()
        });
    }

    private async getDeviceStats(req: Request, res: Response): Promise<void> {
        try {
            const webSocketServer = this.backend.getWebSocketServer();
            if (!webSocketServer) {
                res.status(500).json({
                    success: false,
                    error: 'WebSocket server not available'
                });
                return;
            }

            const libraryClients = webSocketServer.libraryClients;
            const stats = {
                totalLibraries: Object.keys(libraryClients).length,
                totalConnections: 0,
                libraryStats: {} as Record<string, { connectionCount: number; activeConnections: number }>
            };

            for (const [libraryId, clients] of Object.entries(libraryClients)) {
                const activeConnections = clients.filter(client => client.readyState === WebSocket.OPEN).length;
                stats.libraryStats[libraryId] = {
                    connectionCount: clients.length,
                    activeConnections
                };
                stats.totalConnections += clients.length;
            }

            res.json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to get device stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve device statistics',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    private extractDeviceInfo(client: WebSocket, libraryId: string): DeviceInfo {
        const clientData = client as any;
        const userAgent = clientData.requestInfo?.headers?.['user-agent'] || 'Unknown';
        const ipAddress = clientData.requestInfo?.remoteAddress || 'Unknown';

        return {
            clientId: clientData.clientId || 'Unknown',
            libraryId,
            connectionTime: clientData.connectionTime || new Date().toISOString(),
            lastActivity: clientData.lastActivity || new Date().toISOString(),
            requestInfo: clientData.requestInfo || {},
            status: client.readyState === WebSocket.OPEN ? 'connected' : 'disconnected',
            userAgent,
            ipAddress
        };
    }

    private findDeviceClient(clientId: string): { libraryId: string; client: WebSocket } | null {
        const webSocketServer = this.backend.getWebSocketServer();
        if (!webSocketServer) return null;

        for (const [libraryId, clients] of Object.entries(webSocketServer.libraryClients)) {
            const client = clients.find(item => (item as any).clientId === clientId);
            if (client) {
                return { libraryId, client };
            }
        }

        return null;
    }

    public getRouter(): Router {
        return this.router;
    }
}
