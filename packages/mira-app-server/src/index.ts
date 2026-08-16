import { MiraServer } from './MiraServer';
import ws from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { ServerPluginManager } from './ServerPluginManager';
import { ServerPlugin } from './ServerPlugin';
import { MiraWebsocketServer } from './WebSocketServer';
import { MiraHttpServer } from './server';
import { ThumbnailService } from './services/ThumbnailService';
import { MetadataService } from './services/MetadataService';
import { closeProcm, getProcmLogger, initProcm, publishBackendReady } from './services/procm';
import express from 'express';

// 加载环境变量 - 先加载根目录的 .env，再加载本地的 .env
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config();

async function startServer() {
  try {
    // SDK 仅在开发环境动态加载，生产环境无需安装 devDependency。
    await initProcm();
    const procmLogger = getProcmLogger();
    // 服务端启动文件
    // 获取端口配置，优先使用环境变量
    const httpPort = process.env.MIRA_SERVER_HTTP_PORT || process.env.HTTP_PORT || '8081';
    const wsPort = process.env.MIRA_SERVER_WS_PORT || process.env.WS_PORT || '8018';
    const dataPath = process.env.DATA_PATH || './data';

    procmLogger.info('Starting Mira Server', { httpPort, wsPort, dataPath });

    const server = await MiraServer.createAndStart({
      httpPort: parseInt(httpPort),
      wsPort: parseInt(wsPort),
      dataPath: dataPath,
    });

    procmLogger.info('Mira Server started successfully');
    publishBackendReady({ initializedAt: Date.now(), httpPort: parseInt(httpPort), wsPort: parseInt(wsPort) });

    // 优雅关闭处理
    process.on('SIGINT', async () => {
      await server.stop();
      closeProcm();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await server.stop();
      closeProcm();
      process.exit(0);
    });

    return server;

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    getProcmLogger().error('Failed to start server', { message: error instanceof Error ? error.message : String(error) });
    closeProcm();
    process.exit(1);
  }
}

// 导出服务器实例和启动函数
export { MiraServer, startServer, ServerPluginManager, ServerPlugin, MiraWebsocketServer, MiraHttpServer, ThumbnailService, MetadataService, express, ws };
export type { ThumbnailGenerator } from './services/ThumbnailService';
export type { MetadataRule } from './services/MetadataService';
export type { PluginRouteDefinition } from './ServerPlugin';
export type { ILibraryServerData } from 'mira-app-core/storage/sqlite';

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
  startServer();
}
