import { HttpClient } from '../client/HttpClient';
import {
    Device,
    DevicesResponse,
    DeviceStatsResponse,
    DisconnectDeviceRequest,
    SendMessageRequest,
    BaseResponse,
    ShareTicketRequest,
    ShareTicketResponse,
} from '../types';

/**
 * 设备模块
 * 处理设备连接管理、状态查询和消息发送
 */
export class DeviceModule {
    constructor(private httpClient: HttpClient) { }

    /**
     * 创建设备间分享票据
     * 接收方凭 ticketId 通过 downloadUrl（GET /api/devices/share/:ticketId）免 token 下载，
     * 票据限时（默认 30 分钟）且限次，由服务端内存管理。
     * @param request 分享请求（libraryId + 库内相对路径文件列表）
     * @returns Promise<ShareTicketResponse>
     */
    async createShareTicket(request: ShareTicketRequest): Promise<ShareTicketResponse> {
        return await this.httpClient.post<ShareTicketResponse>('/api/devices/share-tickets', request);
    }

    /**
     * 获取所有设备连接信息
     * @returns Promise<DevicesResponse>
     */
    async getAll(): Promise<DevicesResponse> {
        return await this.httpClient.get<DevicesResponse>('/api/devices');
    }

    /**
     * 获取指定素材库的设备连接信息
     * @param libraryId 素材库ID
     * @returns Promise<Device[]>
     */
    async getByLibrary(libraryId: string): Promise<Device[]> {
        return await this.httpClient.get<Device[]>(`/api/devices/library/${libraryId}`);
    }

    /**
     * 断开设备连接
     * @param clientId 客户端ID
     * @param libraryId 素材库ID
     * @returns Promise<BaseResponse>
     */
    async disconnect(clientId: string, libraryId: string): Promise<BaseResponse> {
        const request: DisconnectDeviceRequest = { clientId, libraryId };
        return await this.httpClient.post<BaseResponse>('/api/devices/disconnect', request);
    }

    /**
     * 按客户端 ID 断开设备连接（路径参数版，dashboard 使用）
     * @param clientId 客户端ID
     */
    async disconnectById(clientId: string): Promise<BaseResponse> {
        return await this.httpClient.post<BaseResponse>(`/api/devices/${encodeURIComponent(clientId)}/disconnect`);
    }

    /**
     * 向设备广播消息
     * @param message 消息内容
     * @param title 可选标题
     * @param clientIds 可选，限定接收的客户端；不传则广播全部
     */
    async broadcast(message: string, title?: string, clientIds?: string[]): Promise<BaseResponse> {
        return await this.httpClient.post<BaseResponse>('/api/devices/broadcast', {
            message,
            ...(title !== undefined && { title }),
            ...(clientIds !== undefined && { clientIds }),
        });
    }

    /**
     * 向设备发送消息
     * @param clientId 客户端ID
     * @param libraryId 素材库ID
     * @param message 消息内容
     * @returns Promise<BaseResponse>
     */
    async sendMessage(clientId: string, libraryId: string, message: any): Promise<BaseResponse> {
        const request: SendMessageRequest = { clientId, libraryId, message };
        return await this.httpClient.post<BaseResponse>('/api/devices/send-message', request);
    }

    /**
     * 获取设备统计信息
     * @returns Promise<DeviceStatsResponse>
     */
    async getStats(): Promise<DeviceStatsResponse> {
        return await this.httpClient.get<DeviceStatsResponse>('/api/devices/stats');
    }

    /**
     * 获取所有已连接的设备
     * @returns Promise<Device[]>
     */
    async getConnectedDevices(): Promise<Device[]> {
        const response = await this.getAll();
        const allDevices: Device[] = [];

        Object.values(response.data).forEach(devices => {
            allDevices.push(...devices.filter(device => device.status === 'connected'));
        });

        return allDevices;
    }

    /**
     * 获取所有已断开的设备
     * @returns Promise<Device[]>
     */
    async getDisconnectedDevices(): Promise<Device[]> {
        const response = await this.getAll();
        const allDevices: Device[] = [];

        Object.values(response.data).forEach(devices => {
            allDevices.push(...devices.filter(device => device.status === 'disconnected'));
        });

        return allDevices;
    }

    /**
     * 根据客户端ID查找设备
     * @param clientId 客户端ID
     * @returns Promise<Device | null>
     */
    async findByClientId(clientId: string): Promise<Device | null> {
        const response = await this.getAll();

        for (const devices of Object.values(response.data)) {
            const device = devices.find(d => d.clientId === clientId);
            if (device) {
                return device;
            }
        }

        return null;
    }

    /**
     * 获取指定素材库的连接设备数量
     * @param libraryId 素材库ID
     * @returns Promise<number>
     */
    async getLibraryConnectionCount(libraryId: string): Promise<number> {
        const devices = await this.getByLibrary(libraryId);
        return devices.filter(device => device.status === 'connected').length;
    }

    /**
     * 批量断开设备连接
     * @param connections 连接信息数组
     * @returns Promise<BaseResponse[]>
     */
    async disconnectMultiple(connections: Array<{ clientId: string; libraryId: string }>): Promise<BaseResponse[]> {
        return await Promise.all(
            connections.map(conn => this.disconnect(conn.clientId, conn.libraryId))
        );
    }

    /**
     * 断开素材库的所有设备连接
     * @param libraryId 素材库ID
     * @returns Promise<BaseResponse[]>
     */
    async disconnectAllInLibrary(libraryId: string): Promise<BaseResponse[]> {
        const devices = await this.getByLibrary(libraryId);
        const connectedDevices = devices.filter(device => device.status === 'connected');

        return await Promise.all(
            connectedDevices.map(device => this.disconnect(device.clientId, device.libraryId))
        );
    }

    /**
     * 向素材库的所有设备广播消息
     * @param libraryId 素材库ID
     * @param message 消息内容
     * @returns Promise<BaseResponse[]>
     */
    async broadcastToLibrary(libraryId: string, message: any): Promise<BaseResponse[]> {
        const devices = await this.getByLibrary(libraryId);
        const connectedDevices = devices.filter(device => device.status === 'connected');

        return await Promise.all(
            connectedDevices.map(device =>
                this.sendMessage(device.clientId, device.libraryId, message)
            )
        );
    }

    /**
     * 向所有连接的设备广播消息
     * @param message 消息内容
     * @returns Promise<BaseResponse[]>
     */
    async broadcastToAll(message: any): Promise<BaseResponse[]> {
        const connectedDevices = await this.getConnectedDevices();

        return await Promise.all(
            connectedDevices.map(device =>
                this.sendMessage(device.clientId, device.libraryId, message)
            )
        );
    }

    /**
     * 获取设备的连接时长（分钟）
     * @param device 设备信息
     * @returns number
     */
    getConnectionDuration(device: Device): number {
        const connectionTime = new Date(device.connectionTime);
        const now = new Date();
        return Math.floor((now.getTime() - connectionTime.getTime()) / (1000 * 60));
    }

    /**
     * 获取设备的最后活动时间（分钟前）
     * @param device 设备信息
     * @returns number
     */
    getLastActivityMinutes(device: Device): number {
        const lastActivity = new Date(device.lastActivity);
        const now = new Date();
        return Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60));
    }

    /**
     * 检查设备是否在线
     * @param device 设备信息
     * @param timeoutMinutes 超时时间（分钟）
     * @returns boolean
     */
    isDeviceOnline(device: Device, timeoutMinutes: number = 5): boolean {
        return device.status === 'connected' &&
            this.getLastActivityMinutes(device) <= timeoutMinutes;
    }
}
