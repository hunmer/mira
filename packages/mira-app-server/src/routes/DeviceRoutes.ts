import { Router, Request, Response } from 'express';
import { MiraServer } from '../MiraServer';
import { WebSocket } from 'ws';

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

export class DeviceRoutes {
    private router: Router;
    private backend: MiraServer;

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

        // 断开特定设备连接
        this.router.post('/disconnect', this.disconnectDevice.bind(this));

        // 向特定设备发送消息
        this.router.post('/send-message', this.sendMessageToDevice.bind(this));

        // 获取设备统计信息
        this.router.get('/stats', this.getDeviceStats.bind(this));
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
            console.log('[DeviceRoutes] libraryClients keys:', Object.keys(libraryClients), 'total connections:', Object.values(libraryClients).reduce((sum, c) => sum + c.length, 0));

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

    public getRouter(): Router {
        return this.router;
    }
}
