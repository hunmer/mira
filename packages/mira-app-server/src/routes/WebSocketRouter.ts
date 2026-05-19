
import { LibraryServerDataSQLite } from 'mira-storage-sqlite';
import { WebSocket, WebSocketServer } from 'ws';
import { MessageHandler } from '../handlers/MessageHandler';
import { FileHandler } from '../handlers/FileHandler';
import { TagHandler } from '../handlers/TagHandler';
import { FolderHandler } from '../handlers/FolderHandler';
import { LibraryHandler } from '../handlers/LibraryHandler';
import { PluginMessageHandler } from '../handlers/PluginMessageHandler';
import type { WebSocketMessage } from '../types';

export class WebSocketRouter {
    static async route(
        server: any,  // 修改为any类型避免类型冲突
        dbService: LibraryServerDataSQLite,
        ws: WebSocket,
        message: WebSocketMessage
    ): Promise<MessageHandler | null> {
        const { payload } = message;

        // 根据资源类型路由到不同的处理器
        switch (payload.type) {
            case 'plugin':
                return new PluginMessageHandler(server, dbService, ws, message);
            case 'file':
                return new FileHandler(server, dbService, ws, message);
            case 'tag':
                return new TagHandler(server, dbService, ws, message);
            case 'folder':
                return new FolderHandler(server, dbService, ws, message);
            case 'library':
                return new LibraryHandler(server, dbService, ws, message);
            default:
                return null;
        }
    }
}
