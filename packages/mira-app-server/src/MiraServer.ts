import { MiraHttpServer } from "./HttpServer";
import { LibraryStorage } from "./LibraryStorage";
import { MiraWebsocketServer } from "./server";
import { ServerPluginManager } from "./ServerPluginManager";
import { SettingsManager } from "./SettingsManager";
import { ThumbnailService } from "./services/ThumbnailService";
import { MetadataService } from "./services/MetadataService";
import path from "path";
import { DatabaseBackupService } from './services/DatabaseBackupService';
import { DownloadExecutorService } from './services/DownloadExecutorService';


export interface ServerConfig {
    httpPort?: number;
    wsPort?: number;
    dataPath?: string;
}

export class MiraServer {
    dataPath: string;
    httpServer?: MiraHttpServer;
    webSocketServer?: MiraWebsocketServer;
    pluginManager?: ServerPluginManager;
    settingsManager!: SettingsManager;
    thumbnailService!: ThumbnailService;
    metadataService!: MetadataService;
    config: ServerConfig;
    libraries?: LibraryStorage;
    databaseBackupService!: DatabaseBackupService;
    downloadExecutor!: DownloadExecutorService;

    constructor(config: ServerConfig = {}) {
        this.config = {
            httpPort: 8081,
            wsPort: 8018,
            ...config
        };

        console.log('🚀 Initializing Mira Server...');
        console.log('📋 Configuration:', this.config);

        this.dataPath = config.dataPath || process.env.DATA_PATH || path.join(process.cwd(), 'data');
        console.log('📂 Data path resolved to:', this.dataPath);
    }

    public async start(): Promise<void> {
        try {
            // 初始化设置管理器
            this.settingsManager = new SettingsManager(this.dataPath);
            await this.settingsManager.initialize();

            // 初始化缩略图服务
            this.thumbnailService = new ThumbnailService();
            this.metadataService = new MetadataService();

            // 启动HTTP服务器
            this.httpServer = new MiraHttpServer(this, this.config.dataPath);
            await this.httpServer.initialize();
            await this.httpServer.start(this.config.httpPort!);

            // 启动WebSocket服务器（复用HTTP服务器）
            this.webSocketServer = new MiraWebsocketServer(
                this
            );
            await this.webSocketServer.start(this.config.wsPort!);
            console.log(`🔌 WebSocket Server initialized on port ${this.config.wsPort}`);

            // 缩略图服务接入 WebSocket 广播
            this.thumbnailService.setWebSocketServer(this.webSocketServer);

            console.log('📚 Auto-loading libraries...');
            this.libraries = new LibraryStorage(this);
            this.libraries.loadAll().then((loaded: number) => console.log(`✅ ${loaded} Libraries loaded`));

            this.databaseBackupService = new DatabaseBackupService(this.dataPath);
            await this.databaseBackupService.start();

            // 下载执行器（消费 cookie 站点下载图片并入库）
            this.downloadExecutor = new DownloadExecutorService(this);

            console.log('✅ Mira Server started successfully!');
        } catch (error) {
            console.error('❌ Failed to start Mira Server:', error);
            throw error;
        }
    }

    public async stop(): Promise<void> {
        console.log('🔄 Stopping Mira Server...');

        this.databaseBackupService?.stop();
        this.metadataService?.clear();

        if (this.httpServer) {
            await this.httpServer.stop();
        }

        console.log('✅ Mira Server stopped successfully');
    }

    public getHttpServer(): MiraHttpServer {
        return this.httpServer!;
    }

    public getDataPath() {
        return this.dataPath;
    }

    public getWebSocketServer(): MiraWebsocketServer {
        return this.webSocketServer!;
    }

    // 静态方法用于快速启动
    public static async createAndStart(config: ServerConfig = {}): Promise<MiraServer> {
        const server = new MiraServer(config);
        await server.start();
        return server;
    }
}
