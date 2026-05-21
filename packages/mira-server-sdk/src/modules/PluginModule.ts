import { HttpClient } from '../client/HttpClient';
import {
    Plugin,
    PluginsByLibrary,
    InstallPluginRequest,
    BaseResponse,
} from '../types';

/**
 * 插件模块
 * 处理插件的安装、启用、禁用、卸载等操作
 */
export class PluginModule {
    constructor(private httpClient: HttpClient) { }

    /**
     * 获取所有插件列表
     * @returns Promise<Plugin[]>
     */
    async getAll(): Promise<Plugin[]> {
        return await this.httpClient.get<Plugin[]>('/api/plugins');
    }

    /**
     * 按素材库分组获取插件列表
     * @returns Promise<PluginsByLibrary[]>
     */
    async getByLibrary(): Promise<PluginsByLibrary[]> {
        return await this.httpClient.get<PluginsByLibrary[]>('/api/plugins/by-library');
    }

    /**
     * 根据ID获取单个插件
     * @param id 插件ID
     * @returns Promise<Plugin>
     */
    async getById(id: string): Promise<Plugin> {
        const plugins = await this.getAll();
        const plugin = plugins.find(p => p.id === id);
        if (!plugin) {
            throw new Error(`Plugin with id ${id} not found`);
        }
        return plugin;
    }

    /**
     * 安装插件
     * @param pluginData 插件安装数据
     * @returns Promise<BaseResponse>
     */
    async install(pluginData: InstallPluginRequest): Promise<BaseResponse> {
        return await this.httpClient.post<BaseResponse>('/api/plugins/install', pluginData);
    }

    /**
     * 启用插件
     * @param id 插件ID
     * @returns Promise<BaseResponse>
     */
    async enable(id: string): Promise<BaseResponse> {
        return await this.httpClient.post<BaseResponse>(`/api/plugins/${id}/enable`);
    }

    /**
     * 禁用插件
     * @param id 插件ID
     * @returns Promise<BaseResponse>
     */
    async disable(id: string): Promise<BaseResponse> {
        return await this.httpClient.post<BaseResponse>(`/api/plugins/${id}/disable`);
    }

    /**
     * 卸载插件
     * @param id 插件ID
     * @returns Promise<BaseResponse>
     */
    async uninstall(id: string): Promise<BaseResponse> {
        return await this.httpClient.delete<BaseResponse>(`/api/plugins/${id}`);
    }

    /**
     * 安装最新版本的插件
     * @param name 插件名称
     * @param libraryId 素材库ID
     * @returns Promise<BaseResponse>
     */
    async installLatest(name: string, libraryId: string): Promise<BaseResponse> {
        return await this.install({
            name,
            version: 'latest',
            libraryId,
        });
    }

    /**
     * 安装指定版本的插件
     * @param name 插件名称
     * @param version 版本号
     * @param libraryId 素材库ID
     * @returns Promise<BaseResponse>
     */
    async installVersion(name: string, version: string, libraryId: string): Promise<BaseResponse> {
        return await this.install({
            name,
            version,
            libraryId,
        });
    }

    /**
     * 获取活跃的插件列表
     * @returns Promise<Plugin[]>
     */
    async getActive(): Promise<Plugin[]> {
        const plugins = await this.getAll();
        return plugins.filter(plugin => plugin.status === 'active');
    }

    /**
     * 获取非活跃的插件列表
     * @returns Promise<Plugin[]>
     */
    async getInactive(): Promise<Plugin[]> {
        const plugins = await this.getAll();
        return plugins.filter(plugin => plugin.status === 'inactive');
    }

    /**
     * 根据素材库ID获取插件列表
     * @param libraryId 素材库ID
     * @returns Promise<Plugin[]>
     */
    async getByLibraryId(libraryId: string): Promise<Plugin[]> {
        const plugins = await this.getAll();
        return plugins.filter(plugin => plugin.libraryId === libraryId);
    }

    /**
     * 根据分类获取插件列表
     * @param category 分类
     * @returns Promise<Plugin[]>
     */
    async getByCategory(category: string): Promise<Plugin[]> {
        const plugins = await this.getAll();
        return plugins.filter(plugin => plugin.category === category);
    }

    /**
     * 根据标签获取插件列表
     * @param tag 标签
     * @returns Promise<Plugin[]>
     */
    async getByTag(tag: string): Promise<Plugin[]> {
        const plugins = await this.getAll();
        return plugins.filter(plugin => plugin.tags.includes(tag));
    }

    /**
     * 搜索插件
     * @param query 搜索关键词
     * @returns Promise<Plugin[]>
     */
    async search(query: string): Promise<Plugin[]> {
        const plugins = await this.getAll();
        const lowerQuery = query.toLowerCase();

        return plugins.filter(plugin =>
            plugin.name.toLowerCase().includes(lowerQuery) ||
            plugin.description.toLowerCase().includes(lowerQuery) ||
            plugin.pluginName.toLowerCase().includes(lowerQuery) ||
            plugin.author.toLowerCase().includes(lowerQuery) ||
            plugin.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
    }

    /**
     * 批量启用插件
     * @param ids 插件ID数组
     * @returns Promise<BaseResponse[]>
     */
    async enableMultiple(ids: string[]): Promise<BaseResponse[]> {
        return await Promise.all(ids.map(id => this.enable(id)));
    }

    /**
     * 批量禁用插件
     * @param ids 插件ID数组
     * @returns Promise<BaseResponse[]>
     */
    async disableMultiple(ids: string[]): Promise<BaseResponse[]> {
        return await Promise.all(ids.map(id => this.disable(id)));
    }
}
