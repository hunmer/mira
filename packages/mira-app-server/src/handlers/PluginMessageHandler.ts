import { MessageHandler } from './MessageHandler';
import { WebSocket } from 'ws';
import type { WebSocketMessage } from '../types';
import { ILibraryServerData } from 'mira-storage-sqlite';
import { MiraWebsocketServer } from '../WebSocketServer';

export class PluginMessageHandler extends MessageHandler {
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

            // this.server.broadcastPluginEvent('plugin::connected', { ws: this.ws, fields: data['fields'] });
        } catch (err) {
            this.sendError(err instanceof Error ? err.message : 'PluginMessageHandler failed');
        }
    }
}
