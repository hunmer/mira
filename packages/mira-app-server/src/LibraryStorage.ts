import { LibraryServerDataSQLite } from "mira-app-core/storage/sqlite";
import { ServerPluginManager } from "./ServerPluginManager";
import { EventManager, getLibraries } from "mira-app-core";
import { MiraServer } from "./MiraServer";
import { MiraWebsocketServer } from "./WebSocketServer";
import { LibraryWatcher } from "./LibraryWatcher";

export class LibraryStorage {
    libraries: Record<string, {
        libraryService?: LibraryServerDataSQLite;
        pluginManager?: ServerPluginManager;
        eventManager?: EventManager;
        savedConfig?: Record<string, any>; // 保存禁用库的配置信息
        watcher?: LibraryWatcher;
    }> = {};

    server: MiraServer;
    webSocketServer: MiraWebsocketServer;

    constructor(server: MiraServer) {
        this.server = server;
        this.webSocketServer = this.server.getWebSocketServer();
    }


    getLibraries() {
        return this.libraries;
    }

    removeLibrary(libraryId: string) {
        const lib = this.libraries[libraryId];
        if (lib?.watcher) {
            lib.watcher.stop();
        }
        delete this.libraries[libraryId];
    }

    async load(dbConfig: Record<string, any>): Promise<LibraryServerDataSQLite> {
        const libraryId = dbConfig.id;
        let dbServer!: LibraryServerDataSQLite;
        dbServer = new LibraryServerDataSQLite(dbConfig, {
            onFileImported: (file) => { this.server.metadataService.enqueue(file, dbServer); },
        });
        this.libraries[libraryId] = {
            libraryService: dbServer,
            eventManager: new EventManager()
        }
        await dbServer.initialize();

        // 设置初始状态（如果配置中没有指定，默认为 active）
        dbServer.config.status = dbConfig.status || 'active';

        const pluginManager = new ServerPluginManager(
            { server: this.webSocketServer, dbService: dbServer, pluginsDir: dbConfig.pluginsDir }
        );
        this.libraries[libraryId].pluginManager = pluginManager;
        await pluginManager.loadPlugins();

        // 接入缩略图服务
        const thumbService = this.server.thumbnailService;
        if (thumbService) {
            const em = this.libraries[libraryId].eventManager!;
            em.on('file::created', (event: any) => thumbService.onFileCreated(libraryId, event, dbServer));
            em.on('file::deleted', (event: any) => thumbService.onFileDeleted(libraryId, event.args?.result || event.args, dbServer));
            // 自动扫描缺失缩略图
            const enableThumbScan = dbConfig.customFields?.enableThumbScan ?? false;
            if (enableThumbScan) {
                thumbService.scanPending(libraryId, dbServer, 'library-startup');
            }
        }

        // 启动自动同步 watcher
        const enableAutoSync = dbConfig.customFields?.enableAutoSync ?? true;
        if (enableAutoSync) {
            const watcher = new LibraryWatcher(dbServer, this.webSocketServer);
            this.libraries[libraryId].watcher = watcher;
            watcher.start(); // 不阻塞启动
        }

        return dbServer;
    }

    async loadAll(): Promise<number> {
        let success = 0;
        for (const library of await getLibraries(this.server.getDataPath())) {
            try {
                // 只加载活动状态的库，或者没有设置状态的库（默认为活动）
                const shouldLoad = library.status === 'active' || !library.status;

                if (shouldLoad) {
                    console.log('loading library ', library.name);
                    await this.load(library);
                    success++;
                } else {
                    console.log('skipping inactive library ', library.name);
                    // 为禁用的库创建库对象，保留配置信息和事件管理器
                    this.libraries[library.id] = {
                        eventManager: new EventManager(),
                        savedConfig: { ...library } // 保存完整的配置信息
                    };
                }
            } catch (err) {
                console.log(err)
            }
        }
        return success;
    }

    clear() {
        Object.values(this.libraries).forEach(lib => {
            if (lib.watcher) {
                lib.watcher.stop();
            }
            if (lib.libraryService) {
                lib.libraryService.close();
            }
        });
        this.libraries = {};
    }

    getLibrary(libraryId: string): Record<string, any> | undefined {
        return this.libraries[libraryId];
    }

    libraryExists(libraryId: string): boolean {
        return libraryId in this.libraries;
    }

    /**
     * 启用库服务
     */
    async enableLibrary(libraryId: string): Promise<boolean> {
        try {
            const libraryObj = this.libraries[libraryId];
            if (!libraryObj) {
                console.error(`Library ${libraryId} not found`);
                return false;
            }

            // 如果库服务不存在或已关闭，重新初始化
            if (!libraryObj.libraryService) {
                let config: Record<string, any>;

                // 优先使用保存的配置，如果没有则从文件读取
                if (libraryObj.savedConfig) {
                    config = libraryObj.savedConfig;
                    console.log(`Using saved config for library ${libraryId}`);
                } else {
                    // 从配置文件加载
                    const librarysJson = await getLibraries(this.server.getDataPath());
                    const fileConfig = librarysJson.find((lib: any) => lib.id === libraryId);
                    if (!fileConfig) {
                        console.error(`Library config for ${libraryId} not found`);
                        return false;
                    }
                    config = fileConfig;
                }

                let dbServer!: LibraryServerDataSQLite;
                dbServer = new LibraryServerDataSQLite(config, {
                    onFileImported: (file) => { this.server.metadataService.enqueue(file, dbServer); },
                });
                this.libraries[libraryId].libraryService = dbServer;
                await dbServer.initialize();

                // 重新加载插件管理器
                const pluginManager = new ServerPluginManager(
                    { server: this.server.getWebSocketServer(), dbService: dbServer, pluginsDir: config.pluginsDir }
                );
                this.libraries[libraryId].pluginManager = pluginManager;
                await pluginManager.loadPlugins();

                // 启动自动同步 watcher
                const enableAutoSync = config.customFields?.enableAutoSync ?? true;
                if (enableAutoSync) {
                    const watcher = new LibraryWatcher(dbServer, this.webSocketServer);
                    this.libraries[libraryId].watcher = watcher;
                    watcher.start();
                }
            }

            // 更新状态
            libraryObj.libraryService!.config.status = 'active';
            libraryObj.libraryService!.config.updatedAt = new Date().toISOString();

            // 清除保存的配置（已重新启用）
            delete libraryObj.savedConfig;

            console.log(`Library ${libraryId} enabled successfully`);
            return true;
        } catch (error) {
            console.error(`Failed to enable library ${libraryId}:`, error);
            return false;
        }
    }

    /**
     * 禁用库服务
     */
    async disableLibrary(libraryId: string): Promise<boolean> {
        try {
            const libraryObj = this.libraries[libraryId];
            if (!libraryObj || !libraryObj.libraryService) {
                console.warn(`Library ${libraryId} not found or already disabled`);
                return false;
            }

            // 保存当前配置（在关闭前）
            const savedConfig = { ...libraryObj.libraryService.config };
            savedConfig.status = 'inactive';
            savedConfig.updatedAt = new Date().toISOString();

            // 停止自动同步 watcher
            if (libraryObj.watcher) {
                await libraryObj.watcher.stop();
                libraryObj.watcher = undefined;
            }

            // 卸载所有插件
            if (libraryObj.pluginManager) {
                // 获取所有已加载的插件并卸载
                const pluginsList = libraryObj.pluginManager.getPluginsList();
                for (const plugin of pluginsList) {
                    if (plugin.enabled) {
                        libraryObj.pluginManager.unloadPlugin(plugin.name);
                    }
                }
            }

            // 关闭数据库连接
            await libraryObj.libraryService.close();

            // 清理服务实例，但保留配置信息
            libraryObj.libraryService = undefined;
            libraryObj.pluginManager = undefined;

            // 保存配置信息以便后续重新启用时使用
            libraryObj.savedConfig = savedConfig;

            console.log(`Library ${libraryId} disabled successfully`);
            return true;
        } catch (error) {
            console.error(`Failed to disable library ${libraryId}:`, error);
            return false;
        }
    }

    /**
     * 检查库是否处于活动状态
     */
    isLibraryActive(libraryId: string): boolean {
        const libraryObj = this.libraries[libraryId];
        return !!(libraryObj?.libraryService?.config?.status === 'active');
    }

    /**
     * 获取库的状态
     */
    getLibraryStatus(libraryId: string): 'active' | 'inactive' | 'unknown' {
        const libraryObj = this.libraries[libraryId];
        if (!libraryObj) return 'unknown';

        // 如果有活跃的库服务，返回其状态
        if (libraryObj.libraryService?.config?.status) {
            return libraryObj.libraryService.config.status;
        }

        // 如果有保存的配置，返回保存的状态
        if (libraryObj.savedConfig?.status) {
            return libraryObj.savedConfig.status;
        }

        return 'inactive';
    }

    /**
     * 获取库的配置信息（无论是否活跃）
     */
    getLibraryConfig(libraryId: string): Record<string, any> | null {
        const libraryObj = this.libraries[libraryId];
        if (!libraryObj) return null;

        // 如果有活跃的库服务，返回其配置
        if (libraryObj.libraryService?.config) {
            return libraryObj.libraryService.config;
        }

        // 如果有保存的配置，返回保存的配置
        if (libraryObj.savedConfig) {
            return libraryObj.savedConfig;
        }

        return null;
    }

}
