import { ILibraryServerData } from 'mira-app-core/storage/sqlite';
import { MiraWebsocketServer } from './WebSocketServer';
import { PluginRouteDefinition } from './ServerPlugin';
import { MiraClient } from 'mira-app-core/shared/sdk';
import * as fs from 'fs';
import * as path from 'path';
import type { Request, Response } from 'express';
import type { ThumbnailGenerator } from './services/ThumbnailService';

export interface PluginConfig {
    name: string;
    enabled: boolean;
    path: string;
}

export interface HttpHookContext {
    libraryId: string;
    clientId?: string;
    method: string;
    path: string;
    req: Request;
    res: Response;
    fields?: Record<string, any>;
}

export type HttpHookHandler = (context: HttpHookContext) => boolean | void | Promise<boolean | void>;

export interface HttpHookDefinition {
    method?: string;
    path: string | RegExp;
    handler: HttpHookHandler;
}

export interface ServerFileFormatHandler {
    id: string;
    extensions?: string[];
    mimeTypes?: string[];
    thumbnailExtensions?: string[];
    process?: (filePath: string, context?: Record<string, any>) => any | Promise<any>;
    thumbnail?: (srcPath: string, destPath: string) => Promise<void>;
    getExtraFileList?: (filePath: string, context?: Record<string, any>) => string[] | Promise<string[]>;
    getExtraFile?: (filePath: string, fileName: string, context?: Record<string, any>) => string | Promise<string>;
}

export class ServerPluginManager {
    pluginsDir: string;
    public server: MiraWebsocketServer;
    private dbService: ILibraryServerData;
    private pluginsConfigPath: string;
    private loadedPlugins: Map<string, any> = new Map();
    private miraClient: MiraClient;
    private httpHooks: HttpHookDefinition[] = [];
    private fileFormatHandlers = new Map<string, { pluginName: string; handler: ServerFileFormatHandler }>();
    fields: Record<string, any>[] = [];

    constructor({ server, dbService, pluginsDir }: { server: MiraWebsocketServer, dbService: ILibraryServerData, pluginsDir?: string }) {
        this.pluginsDir = path.join(pluginsDir ?? __dirname, 'plugins');
        console.log({ pluginsDir: this.pluginsDir });
        this.server = server;
        this.dbService = dbService;
        this.pluginsConfigPath = path.join(this.pluginsDir, 'plugins.json');

        // 创建 MiraClient 实例用于插件
        const httpPort = this.server.backend.config.httpPort || 8081;
        const baseURL = `http://localhost:${httpPort}`;
        this.miraClient = new MiraClient(baseURL);
        console.log(`🔗 Created MiraClient for plugins with baseURL: ${baseURL}`);

        // Ensure plugins directory exists
        if (!fs.existsSync(this.pluginsDir)) {
            fs.mkdirSync(this.pluginsDir, { recursive: true });
        }

        // Initialize plugins.json if it doesn't exist
        if (!fs.existsSync(this.pluginsConfigPath)) {
            fs.writeFileSync(this.pluginsConfigPath, JSON.stringify([], null, 2));
        }
    }

    // getPluginDir
    getPluginDir(pluginName: string): string {
        const pluginConfig = this.getPluginConfig(pluginName);
        return path.join(this.pluginsDir, pluginConfig?.path ?? pluginName);
    }

    getPluginDistDir(pluginName: string): string {
        return path.join(this.getPluginDir(pluginName), 'dist');
    }

    private getPluginConfig(pluginName: string): PluginConfig | undefined {
        if (!fs.existsSync(this.pluginsConfigPath)) return undefined;

        try {
            const config: PluginConfig[] = JSON.parse(
                fs.readFileSync(this.pluginsConfigPath, 'utf-8')
            );
            return config.find(plugin => plugin.name === pluginName);
        } catch (error) {
            console.error(`Error reading plugin config for ${pluginName}:`, error);
            return undefined;
        }
    }

    async loadPlugins(reload: boolean = false): Promise<void> {
        const config: PluginConfig[] = JSON.parse(
            fs.readFileSync(this.pluginsConfigPath, 'utf-8')
        );
        console.log({ config })
        for (const pluginConfig of config) {
            if (pluginConfig.enabled) {
                await this.loadPlugin(pluginConfig, reload);
            }
        }
    }

    async loadPlugin(pluginConfig: PluginConfig, reload: boolean = false): Promise<void> {
        try {
            // 检查插件是否已经加载过
            if (!reload && this.loadedPlugins.has(pluginConfig.name)) {
                console.log(`Plugin ${pluginConfig.name} already loaded, skipping...`);
                return;
            }

            const pluginPath = path.join(this.pluginsDir, pluginConfig.path);

            // 如果是重新加载，清除require缓存
            if (reload || this.loadedPlugins.has(pluginConfig.name)) {
                delete require.cache[require.resolve(pluginPath)];
            }

            const pluginModule = require(pluginPath);

            if (typeof pluginModule.init === 'function') {
                const obj = await pluginModule.init({
                    pluginManager: this,
                    server: this.server,
                    dbService: this.dbService,
                    miraClient: this.miraClient,
                });
                this.loadedPlugins.set(pluginConfig.name, obj);
                console.log(`${reload ? 'Reloaded' : 'Loaded'} plugin: ${pluginConfig.name}`);
            } else {
                console.warn(`Plugin ${pluginConfig.name} does not have an init function, skipping...`);
            }
        } catch (err) {
            console.error(`Failed to load plugin ${pluginConfig.name}:`, err);
            // 如果加载失败，从已加载插件中移除
            this.loadedPlugins.delete(pluginConfig.name);
        }
    }

    registerFields(fields: Record<string, any>[]): void {
        for (const field of fields) {
            this.registerField(field);
        }
    }

    registerField(field: Record<string, any>): void {
        let { action, type, field: fieldName } = field;
        if (!fieldName || !action || !type) {
            throw new Error('Field registration error: action, type, and field are required');
        }
        this.fields.push(field);
    }

    registerHttpHook(hook: HttpHookDefinition): void {
        if (!hook.path || typeof hook.handler !== 'function') {
            throw new Error('HTTP hook registration error: path and handler are required');
        }
        this.httpHooks.push({
            ...hook,
            method: hook.method?.toUpperCase(),
        });
    }

    registerFileFormat(pluginName: string, handler: ServerFileFormatHandler): () => void {
        if (!handler.id || (!handler.extensions?.length && !handler.mimeTypes?.length)) {
            throw new Error('File format registration error: id and extensions or mimeTypes are required');
        }
        const key = `${pluginName}:${handler.id}`;
        const previous = this.fileFormatHandlers.get(key);
        if (previous?.handler.thumbnail) {
            this.server.backend.thumbnailService.unregisterGenerator(key);
        }
        this.fileFormatHandlers.set(key, { pluginName, handler });
        if (handler.thumbnail) {
            const generator: ThumbnailGenerator = {
                name: key,
                supportedExtensions: (handler.thumbnailExtensions || handler.extensions || []).map(ext => ext.replace(/^\./, '').toLowerCase()),
                generate: handler.thumbnail,
            };
            this.server.backend.thumbnailService.registerGenerator(generator);
        }
        return () => this.unregisterFileFormat(pluginName, handler.id);
    }

    unregisterFileFormat(pluginName: string, id: string): boolean {
        const key = `${pluginName}:${id}`;
        const entry = this.fileFormatHandlers.get(key);
        if (!entry) return false;
        if (entry.handler.thumbnail) this.server.backend.thumbnailService.unregisterGenerator(key);
        return this.fileFormatHandlers.delete(key);
    }

    getFileFormatHandlers(): ServerFileFormatHandler[] {
        return Array.from(this.fileFormatHandlers.values()).map(({ handler }) => ({ ...handler }));
    }

    async processFile(filePath: string, context: Record<string, any> = {}): Promise<any> {
        const extension = path.extname(filePath).toLowerCase().slice(1);
        const mimeType = String(context.mimeType || '').toLowerCase();
        const entry = Array.from(this.fileFormatHandlers.values()).find(({ handler }) =>
            handler.extensions?.some(ext => ext.replace(/^\./, '').toLowerCase() === extension) ||
            handler.mimeTypes?.some(mime => mime.toLowerCase() === mimeType)
        );
        return entry?.handler.process ? entry.handler.process(filePath, context) : undefined;
    }

    async getExtraFileList(filePath: string, context: Record<string, any> = {}): Promise<string[] | undefined> {
        const handler = this.getFileFormatHandler(filePath);
        return handler?.getExtraFileList?.(filePath, context);
    }

    async getExtraFile(filePath: string, fileName: string, context: Record<string, any> = {}): Promise<string | undefined> {
        const handler = this.getFileFormatHandler(filePath);
        return handler?.getExtraFile?.(filePath, fileName, context);
    }

    private getFileFormatHandler(filePath: string): ServerFileFormatHandler | undefined {
        const extension = path.extname(filePath).toLowerCase().slice(1);
        return Array.from(this.fileFormatHandlers.values()).find(({ handler }) =>
            handler.extensions?.some(ext => ext.replace(/^\./, '').toLowerCase() === extension)
        )?.handler;
    }

    async runHttpHooks(context: HttpHookContext): Promise<boolean> {
        for (const hook of this.httpHooks) {
            if (!this.matchesHttpHook(hook, context)) continue;

            const result = await hook.handler(context);
            if (result === false) return false;
        }
        return true;
    }

    private matchesHttpHook(hook: HttpHookDefinition, context: HttpHookContext): boolean {
        if (hook.method && hook.method !== context.method.toUpperCase()) return false;
        if (typeof hook.path === 'string') return hook.path === context.path;
        return hook.path.test(context.path);
    }

    getPlugin<T>(name: string): T | undefined {
        return this.loadedPlugins.get(name);
    }

    isPluginLoaded(name: string): boolean {
        return this.loadedPlugins.has(name);
    }

    unloadPlugin(name: string): boolean {
        if (this.loadedPlugins.has(name)) {
            // 尝试调用插件的清理函数（如果存在�?
            const plugin = this.loadedPlugins.get(name);
            if (plugin && typeof plugin.cleanup === 'function') {
                try {
                    plugin.cleanup();
                } catch (error) {
                    console.error(`Error cleaning up plugin ${name}:`, error);
                }
            }

            for (const [key, entry] of this.fileFormatHandlers) {
                if (entry.pluginName === name) this.unregisterFileFormat(name, key.slice(name.length + 1));
            }

            this.loadedPlugins.delete(name);
            console.log(`Unloaded plugin: ${name}`);
            return true;
        }
        return false;
    }

    async reloadPlugin(name: string): Promise<boolean> {
        const config: PluginConfig[] = JSON.parse(
            fs.readFileSync(this.pluginsConfigPath, 'utf-8')
        );

        const pluginConfig = config.find(p => p.name === name);
        if (!pluginConfig) {
            console.error(`Plugin config not found for: ${name}`);
            return false;
        }

        if (!pluginConfig.enabled) {
            console.log(`Plugin ${name} is disabled, skipping reload`);
            return false;
        }

        // 先卸载插�?
        this.unloadPlugin(name);

        // 重新加载插件
        await this.loadPlugin(pluginConfig, true);
        return this.isPluginLoaded(name);
    }

    getPluginsList(): any[] {
        const config: PluginConfig[] = JSON.parse(
            fs.readFileSync(this.pluginsConfigPath, 'utf-8')
        );

        return config.map(pluginConfig => {
            const pluginDir = this.getPluginDir(pluginConfig.name);
            let packageInfo = {};

            try {
                const packageJsonPath = path.join(pluginDir, 'package.json');
                if (fs.existsSync(packageJsonPath)) {
                    packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                }
            } catch (error) {
                console.error(`Error reading package.json for plugin ${pluginConfig.name}:`, error);
            }

            // 检查是否有图标文件
            let icon = null;
            const iconExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.ico'];
            for (const ext of iconExtensions) {
                const iconPath = path.join(pluginDir, `icon${ext}`);
                if (fs.existsSync(iconPath)) {
                    // 返回相对于插件目录的路径，前端可以通过API获取
                    icon = `/api/plugins/${pluginConfig.name}/icon${ext}`;
                    break;
                }
            }

            // 读取 package.json 中 mira 字段下的展示信息（title/icon/category/tags）
            const miraInfo = ((packageInfo as any).mira || {}) as {
                title?: string; icon?: string; category?: string; tags?: string[];
            };

            return {
                name: pluginConfig.name,
                enabled: pluginConfig.enabled,
                path: pluginConfig.path,
                ...packageInfo,
                status: pluginConfig.enabled ? 'active' : 'inactive',
                configurable: true,
                icon: icon || miraInfo.icon || (packageInfo as any).icon || null, // 优先用 icon 文件，其次 mira.icon，最后 package.json 顶层 icon
                title: miraInfo.title || (packageInfo as any).title || pluginConfig.name,
                category: miraInfo.category || (packageInfo as any).category || 'general',
                tags: miraInfo.tags || (packageInfo as any).tags || []
            };
        });
    }

    async addPlugin(config: PluginConfig): Promise<void> {
        const currentConfig: PluginConfig[] = JSON.parse(
            fs.readFileSync(this.pluginsConfigPath, 'utf-8')
        );

        const existingIndex = currentConfig.findIndex(p => p.name === config.name);
        if (existingIndex >= 0) {
            currentConfig[existingIndex] = config;
        } else {
            currentConfig.push(config);
        }

        fs.writeFileSync(this.pluginsConfigPath, JSON.stringify(currentConfig, null, 2));

        if (config.enabled) {
            await this.loadPlugin(config, true); // 使用 reload=true 确保新插件被加载
        }
    }

    /**
     * 获取所有已加载插件的路由定�?
     */
    getAllPluginRoutes(): PluginRouteDefinition[] {
        const allRoutes: PluginRouteDefinition[] = [];

        for (const [pluginName, plugin] of this.loadedPlugins) {
            try {
                // 检查插件是否有 getRoutes 方法
                if (plugin && typeof plugin.getRoutes === 'function') {
                    const routes = plugin.getRoutes();
                    if (Array.isArray(routes)) {
                        // 为每个路由添加插件名称标识，但不修改路径
                        const routesWithPluginInfo = routes.map(route => ({
                            ...route,
                            pluginName, // 添加插件名称，方便追�?
                        }));
                        allRoutes.push(...routesWithPluginInfo);
                    }
                }
            } catch (error) {
                console.error(`Error getting routes from plugin ${pluginName}:`, error);
            }
        }

        return allRoutes;
    }

    /**
     * 获取指定插件的路由定�?
     */
    getPluginRoutes(pluginName: string): PluginRouteDefinition[] {
        const plugin = this.loadedPlugins.get(pluginName);
        if (plugin && typeof plugin.getRoutes === 'function') {
            try {
                const routes = plugin.getRoutes();
                return Array.isArray(routes) ? routes : [];
            } catch (error) {
                console.error(`Error getting routes from plugin ${pluginName}:`, error);
                return [];
            }
        }
        return [];
    }

    /**
     * 手动注册插件实例（用于测试或特殊用途）
     */
    registerPluginInstance(pluginName: string, pluginInstance: any): void {
        this.loadedPlugins.set(pluginName, pluginInstance);
        console.log(`�?Manually registered plugin: ${pluginName}`);
    }
}
