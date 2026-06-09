import * as fs from 'fs';
import * as path from 'path';
import { ServerPluginManager } from './ServerPluginManager';
import { ILibraryServerData } from 'mira-app-core/storage/sqlite';

export interface PluginRouteDefinition {
    name: string;
    group: string;
    path: string;
    component: string; // vue编译后的模板文件路径
    pluginName?: string; // 所属插件的名称
    meta: {
        roles?: string[]; // 需要的权限角色
        icon?: string;
        title: string;
        affixTab?: boolean;
        order?: number;
    };
    builder?: () => string; // eval code并返回组件ui的函数
}

export abstract class ServerPlugin {
    protected configs: Record<string, any> = {};
    protected readonly pluginDir: string;
    protected readonly pluginDataDir: string;
    protected routes: PluginRouteDefinition[] = [];

    constructor(protected readonly pluginName: string, pluginManager: ServerPluginManager, dbServer: ILibraryServerData) {
        this.pluginDir = pluginManager.getPluginDir(pluginName);
        this.pluginDataDir = path.join(this.pluginDir, 'data');
        this.ensureDirExists();
    }

    private ensureDirExists() {
        if (!fs.existsSync(this.pluginDataDir)) {
            fs.mkdirSync(this.pluginDataDir, { recursive: true });
        }
    }

    protected writeConfig(key: string, value: any) {
        this.configs[key] = value;
        this.saveConfig();
    }

    protected saveConfig() {
        return this.writeJson('config.json', this.configs);
    }

    protected readConfig(key: string): any {
        return this.configs[key];
    }

    protected loadConfig(defaultConfig: Record<string, any> = {}) {
        const config = this.readJson('config.json');
        this.configs = { ...defaultConfig, ...config || {} };
        if (config == null) {
            this.saveConfig();
        }
    }

    protected writeJson(filename: string, data: any) {
        const filePath = path.join(this.pluginDataDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    protected readJson(filename: string): any {
        const filePath = path.join(this.pluginDataDir, filename);
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
        return null;
    }

    /**
     * 注册插件路由
     * @param route 路由定义
     */
    protected registerRoute(route: PluginRouteDefinition): void {
        // 确保路径是唯一的
        const existingRoute = this.routes.find(r => r.path === route.path);
        if (existingRoute) {
            console.warn(`Plugin ${this.pluginName}: Route path ${route.path} already exists, overwriting...`);
            const index = this.routes.indexOf(existingRoute);
            this.routes[index] = route;
        } else {
            this.routes.push(route);
        }
        console.log(`Plugin ${this.pluginName}: Registered route ${route.path}`);
    }

    /**
     * 批量注册路由
     * @param routes 路由定义数组
     */
    protected registerRoutes(routes: PluginRouteDefinition[]): void {
        routes.forEach(route => this.registerRoute(route));
    }

    /**
     * 获取插件注册的所有路由
     */
    public getRoutes(): PluginRouteDefinition[] {
        return [...this.routes]; // 返回副本避免外部修改
    }

    /**
     * 移除指定路径的路由
     * @param path 路由路径
     */
    protected unregisterRoute(path: string): boolean {
        const index = this.routes.findIndex(r => r.path === path);
        if (index !== -1) {
            this.routes.splice(index, 1);
            console.log(`Plugin ${this.pluginName}: Unregistered route ${path}`);
            return true;
        }
        return false;
    }

    /**
     * 清空所有注册的路由
     */
    protected clearRoutes(): void {
        this.routes = [];
        console.log(`Plugin ${this.pluginName}: Cleared all routes`);
    }
}
