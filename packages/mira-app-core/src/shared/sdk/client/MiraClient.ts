import { HttpClient } from './HttpClient';
import { WebSocketClient } from './WebSocketClient';
import { AuthModule } from '../modules/AuthModule';
import { UserModule } from '../modules/UserModule';
import { LibraryModule } from '../modules/LibraryModule';
import { PluginModule } from '../modules/PluginModule';
import { FileModule } from '../modules/FileModule';
import { DatabaseModule } from '../modules/DatabaseModule';
import { DeviceModule } from '../modules/DeviceModule';
import { SystemModule } from '../modules/SystemModule';
import { TagModule } from '../modules/TagModule';
import { FolderModule } from '../modules/FolderModule';
import { CookieSiteModule } from '../modules/CookieSiteModule';
import { ClientConfig, WebSocketOptions } from '../types';

/**
 * Mira Client - 主客户端类
 * 提供链式调用接口，统一管理所有模块
 * 
 * @example
 * ```typescript
 * // 基本用法
 * const client = new MiraClient('http://localhost:8081');
 * 
 * // 链式调用登录并获取用户信息
 * await client.auth().login('username', 'password');
 * const userInfo = await client.user().getInfo();
 * 
 * // 管理素材库
 * const libraries = await client.libraries().getAll();
 * await client.libraries().start('library-id');
 * 
 * // 文件上传
 * const uploadResult = await client.files().uploadFile(file, 'library-id');
 * ```
 */
export class MiraClient {
    private httpClient: HttpClient;
    private _auth: AuthModule;
    private _user: UserModule;
    private _libraries: LibraryModule;
    private _plugins: PluginModule;
    private _files: FileModule;
    private _database: DatabaseModule;
    private _devices: DeviceModule;
    private _system: SystemModule;
    private _tags: TagModule;
    private _folders: FolderModule;
    private _cookieSites: CookieSiteModule;

    constructor(baseURL: string, config?: Partial<ClientConfig>) {
        const clientConfig: ClientConfig = {
            baseURL,
            timeout: 10000 * 6,
            ...config,
        };

        this.httpClient = new HttpClient(clientConfig);

        // 初始化所有模块
        this._auth = new AuthModule(this.httpClient);
        this._user = new UserModule(this.httpClient);
        this._libraries = new LibraryModule(this.httpClient);
        this._plugins = new PluginModule(this.httpClient);
        this._files = new FileModule(this.httpClient);
        this._database = new DatabaseModule(this.httpClient);
        this._devices = new DeviceModule(this.httpClient);
        this._system = new SystemModule(this.httpClient);
        this._tags = new TagModule(this.httpClient);
        this._folders = new FolderModule(this.httpClient);
        this._cookieSites = new CookieSiteModule(this.httpClient);
    }

    /**
     * 获取认证模块
     * @returns AuthModule
     */
    auth(): AuthModule {
        return this._auth;
    }

    /**
     * 获取用户模块
     * @returns UserModule
     */
    user(): UserModule {
        return this._user;
    }

    /**
     * 获取素材库模块
     * @returns LibraryModule
     */
    libraries(): LibraryModule {
        return this._libraries;
    }

    /**
     * 获取插件模块
     * @returns PluginModule
     */
    plugins(): PluginModule {
        return this._plugins;
    }

    /**
     * 获取文件模块
     * @returns FileModule
     */
    files(): FileModule {
        return this._files;
    }

    /**
     * 获取数据库模块
     * @returns DatabaseModule
     */
    database(): DatabaseModule {
        return this._database;
    }

    /**
     * 获取设备模块
     * @returns DeviceModule
     */
    devices(): DeviceModule {
        return this._devices;
    }

    /**
     * 获取系统模块
     * @returns SystemModule
     */
    system(): SystemModule {
        return this._system;
    }

    /**
     * 获取标签模块
     * @returns TagModule
     */
    tags(): TagModule {
        return this._tags;
    }

    /**
     * 获取文件夹模块
     * @returns FolderModule
     */
    folders(): FolderModule {
        return this._folders;
    }

    /**
     * 获取当前用户的下载站点 Cookie 模块
     * @returns CookieSiteModule
     */
    cookieSites(): CookieSiteModule {
        return this._cookieSites;
    }

    /**
     * 创建WebSocket客户端
     * @param port WebSocket服务器端口
     * @param options WebSocket连接选项
     * @returns WebSocketClient
     */
    websocket(port: number, options?: WebSocketOptions): WebSocketClient {
        return new WebSocketClient(port, options);
    }

    /**
     * 设置认证令牌
     * @param token 访问令牌
     * @returns MiraClient 返回自身以支持链式调用
     */
    setToken(token: string): MiraClient {
        this.httpClient.setToken(token);
        return this;
    }

    /**
     * 清除认证令牌
     * @returns MiraClient 返回自身以支持链式调用
     */
    clearToken(): MiraClient {
        this.httpClient.clearToken();
        return this;
    }

    /**
     * 快速登录方法
     * @param username 用户名
     * @param password 密码
     * @returns Promise<MiraClient> 返回自身以支持链式调用
     */
    async login(username: string, password: string): Promise<MiraClient> {
        await this._auth.login(username, password);
        return this;
    }

    /**
     * 快速登出方法
     * @returns Promise<MiraClient> 返回自身以支持链式调用
     */
    async logout(): Promise<MiraClient> {
        await this._auth.logout();
        return this;
    }

    /**
     * 检查连接状态
     * @returns Promise<boolean>
     */
    async isConnected(): Promise<boolean> {
        return await this._system.isServerAvailable();
    }

    /**
     * 等待服务器就绪
     * @param timeout 超时时间（毫秒）
     * @param checkInterval 检查间隔（毫秒）
     * @returns Promise<boolean>
     */
    async waitForServer(timeout?: number, checkInterval?: number): Promise<boolean> {
        return await this._system.waitForServer(timeout, checkInterval);
    }

    /**
     * 获取客户端配置
     * @returns Partial<ClientConfig>
     */
    getConfig(): Partial<ClientConfig> {
        return {
            baseURL: (this.httpClient as any).config.baseURL,
            timeout: (this.httpClient as any).config.timeout,
            token: (this.httpClient as any).config.token,
        };
    }

    /**
     * 更新客户端配置
     * @param config 新的配置
     * @returns MiraClient 返回自身以支持链式调用
     */
    updateConfig(config: Partial<ClientConfig>): MiraClient {
        if (config.baseURL) {
            // 重新创建 HTTP 客户端
            const newConfig = { ...(this.httpClient as any).config, ...config };
            this.httpClient = new HttpClient(newConfig);

            // 重新初始化所有模块
            this._auth = new AuthModule(this.httpClient);
            this._user = new UserModule(this.httpClient);
            this._libraries = new LibraryModule(this.httpClient);
            this._plugins = new PluginModule(this.httpClient);
            this._files = new FileModule(this.httpClient);
            this._database = new DatabaseModule(this.httpClient);
            this._devices = new DeviceModule(this.httpClient);
            this._system = new SystemModule(this.httpClient);
            this._cookieSites = new CookieSiteModule(this.httpClient);
        }

        return this;
    }

    /**
     * 获取原始 HTTP 客户端（用于高级用法）
     * @returns HttpClient
     */
    getHttpClient(): HttpClient {
        return this.httpClient;
    }

    /**
     * 创建新的客户端实例（用于多服务器场景）
     * @param baseURL 新的服务器地址
     * @param config 配置选项
     * @returns MiraClient
     */
    static create(baseURL: string, config?: Partial<ClientConfig>): MiraClient {
        return new MiraClient(baseURL, config);
    }

    /**
     * 批量操作工具方法 - 执行多个异步操作
     * @param operations 操作函数数组
     * @returns Promise<any[]>
     */
    async batch<T>(operations: Array<() => Promise<T>>): Promise<T[]> {
        return await Promise.all(operations.map(op => op()));
    }

    /**
     * 错误处理工具方法
     * @param operation 要执行的操作
     * @param fallback 失败时的回退值
     * @returns Promise<T>
     */
    async safe<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
        try {
            return await operation();
        } catch {
            return fallback;
        }
    }

    /**
     * 重试工具方法
     * @param operation 要执行的操作
     * @param maxRetries 最大重试次数
     * @param delay 重试间隔（毫秒）
     * @returns Promise<T>
     */
    async retry<T>(
        operation: () => Promise<T>,
        maxRetries: number = 3,
        delay: number = 1000
    ): Promise<T> {
        let lastError: any;

        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                if (i < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }
}
