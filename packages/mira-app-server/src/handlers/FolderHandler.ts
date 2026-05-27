import { MessageHandler } from './MessageHandler';
import { WebSocket } from 'ws';
import type { WebSocketMessage } from '../types';
import { ILibraryServerData } from 'mira-storage-sqlite';
import { MiraWebsocketServer } from '../WebSocketServer';

export class FolderHandler extends MessageHandler {
    constructor(
        server: MiraWebsocketServer,
        dbService: ILibraryServerData,
        ws: WebSocket,
        message: WebSocketMessage
    ) {
        super(server, dbService, ws, message);
    }

    async handle(): Promise<void> {
        try {
            const { action, payload } = this.message;
            const { data } = payload;
            const libraryId = this.dbService.getLibraryId();
            let result;
            switch (action) {
                case 'file_set':
                    var { fileId, folder } = data;
                    const folderResult = await this.dbService.setFileFolder(fileId, folder);
                    if (folderResult.success) {
                        result = { fileId, folder, libraryId, old_data: folderResult.oldData };
                        this.server.broadcastPluginEvent('file::setFolder', result);
                        this.server.broadcastLibraryEvent(libraryId, 'file::setFolder', result);
                    }
                    break;
                case 'file_get':
                    var { fileId } = data;
                    result = { folder: await this.dbService.getFileFolder(fileId) };
                    break;
                case 'all':
                    result = await this.dbService.getAllFolders();
                    break;
                case 'read':
                    result = await this.dbService.queryFolder(data.query);
                    break;
                case 'create':
                    result = await this.dbService.createFolder(data);
                    this.server.broadcastPluginEvent('folder::created', { message: this.message, result, libraryId });
                    this.server.broadcastLibraryEvent(libraryId, 'folder::created', { result, libraryId });
                    break;
                case 'update':
                    result = await this.dbService.updateFolder(data.id, data);
                    this.server.broadcastPluginEvent('folder::updated', { message: this.message, result, libraryId });
                    this.server.broadcastLibraryEvent(libraryId, 'folder::updated', { id: data.id, title: data.title, libraryId });
                    break;
                case 'delete':
                    var { id, deleteFiles } = data;
                    if (await this.dbService.deleteFolder(id, deleteFiles)) {
                        result = { id };
                        this.server.broadcastPluginEvent('folder::deleted', { id, libraryId });
                        this.server.broadcastLibraryEvent(libraryId, 'folder::deleted', { id, libraryId });
                    }
                    break;
                default:
                    throw new Error(`Unsupported folder action: ${action}`);
            }

            this.sendResponse(result as Record<string, any>);
        } catch (err) {
            this.sendError(err instanceof Error ? err.message : 'Folder operation failed');
        }
    }
}
