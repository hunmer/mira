import { ILibraryServerData } from 'mira-storage-sqlite';
import { MiraWebsocketServer } from './WebSocketServer';
import { PluginRouteDefinition } from './ServerPlugin';
import { MiraClient } from 'mira-server-sdk';
import * as fs from 'fs';
import * as path from 'path';

export interface PluginConfig {
    name: string;
    enabled: boolean;
    path: string;
}

export class ServerPluginManager {
    pluginsDir: string;
    public server: MiraWebsocketServer;
    private dbService: ILibraryServerData;
    private pluginsConfigPath: string;
    private loadedPlugins: Map<string, any> = new Map();
    private miraClient: MiraClient;
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
        return path.join(this.pluginsDir, pluginName);
    }

    getPluginDistDir(pluginName: string): string {
        return path.join(this.pluginsDir, 'node_modules', pluginName, 'dist');
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

    getPlugin<T>(name: string): T | undefined {
        return this.loadedPlugins.get(name);
    }

    isPluginLoaded(name: string): boolean {
        return this.loadedPlugins.has(name);
    }

    unloadPlugin(name: string): boolean {
        if (this.loadedPlugins.has(name)) {
            // 尝试调用插件的清理函数（如果存在）
            const plugin = this.loadedPlugins.get(name);
            if (plugin && typeof plugin.cleanup === 'function') {
                try {
                    plugin.cleanup();
                } catch (error) {
                    console.error(`Error cleaning up plugin ${name}:`, error);
                }
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

        // 先卸载插件
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

            return {
                name: pluginConfig.name,
                enabled: pluginConfig.enabled,
                path: pluginConfig.path,
                ...packageInfo,
                status: pluginConfig.enabled ? 'active' : 'inactive',
                configurable: true,
                icon: icon || (packageInfo as any).icon || null, // 支持package.json中的icon字段
                category: (packageInfo as any).category || 'general', // 添加分类
                tags: (packageInfo as any).tags || [] // 添加标签
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
     * 获取所有已加载插件的路由定义
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
                            pluginName, // 添加插件名称，方便追踪
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
     * 获取指定插件的路由定义
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
        console.log(`✅ Manually registered plugin: ${pluginName}`);
    }
}