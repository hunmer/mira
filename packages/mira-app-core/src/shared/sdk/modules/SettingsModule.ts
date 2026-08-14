import { HttpClient } from '../client/HttpClient';
import { ServerSettings } from '../types';

/**
 * 服务器设置模块
 * 读取与更新服务端全局设置（更新需要 admin 权限）
 */
export class SettingsModule {
    constructor(private httpClient: HttpClient) { }

    /**
     * 获取服务器设置
     * @returns Promise<ServerSettings>
     */
    async get(): Promise<ServerSettings> {
        return await this.httpClient.get<ServerSettings>('/api/settings');
    }

    /**
     * 更新服务器设置（需要 admin 权限）
     * @param settings 需要更新的字段
     * @returns Promise<ServerSettings> 更新后的完整设置
     */
    async update(settings: Partial<ServerSettings>): Promise<ServerSettings> {
        return await this.httpClient.put<ServerSettings>('/api/settings', settings);
    }
}
