import { MessageHandler } from './MessageHandler';
import { WebSocket, WebSocketServer } from 'ws';
import type { WebSocketMessage } from '../types';
import { ILibraryServerData } from 'mira-storage-sqlite';
import { MiraWebsocketServer } from '../WebSocketServer';

export class FileHandler extends MessageHandler {
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
            const message = this.message;
            const { action, payload } = message;
            const { data } = payload;
            const libraryId = message.libraryId;
            let result;
            switch (action) {
                case 'read':
                    result = await this.dbService.getFiles({
                        filters: data?.query ?? {},
                        isUrlFile: true,
                    });
                    break;
                case 'create':
                    const path = data.path;
                    result = path != null ? await this.dbService.createFileFromPath(path, data) : await this.dbService.createFile(data);
                    this.server.broadcastPluginEvent('file::created', { message, result, libraryId });
                    this.server.sendToWebsocket(this.ws, { eventName: 'file::uploaded', data: { path } });
                    this.server.broadcastLibraryEvent(libraryId, 'file::created', result);
                    break;
                case 'update':
                    const { success: updateOk, oldData } = await this.dbService.updateFile(data.id, data);
                    result = await this.dbService.getFile(data.id);
                    this.server.broadcastPluginEvent('file::updated', { message, result, libraryId });
                    this.server.broadcastLibraryEvent(libraryId, 'file::updated', { ...result, libraryId, old_data: oldData });
                    break;
                case 'recover':
                    var { id } = data;
                    if (await this.dbService.recoverFile(id)) {
                        this.server.broadcastPluginEvent('file::recovered', { id, libraryId });
                        this.server.sendToWebsocket(this.ws, { eventName: 'file::recovered', data: { id, libraryId } });
                    }
                    break;
                case 'delete':
                    var { id, moveToRecycleBin } = data;
                    if (await this.dbService.deleteFile(id, { moveToRecycleBin })) {
                        this.server.broadcastPluginEvent('file::deleted', { id, libraryId });
                        this.server.sendToWebsocket(this.ws, { eventName: 'file::deleted', data: { id, libraryId } });
                    }
                    break;
                default:
                    throw new Error(`Unsupported file action: ${action}`);
            }

            this.sendResponse(result as Record<string, any>);
        } catch (err) {
            this.sendError(err instanceof Error ? err.message : 'File operation failed');
        }
    }
}
