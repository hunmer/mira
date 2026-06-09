import { ILibraryServerData } from 'mira-app-core/storage/sqlite';
import { WebSocket, WebSocketServer } from 'ws';
import type { WebSocketMessage } from '../types';
import { response } from 'express';
import { MiraWebsocketServer } from '../WebSocketServer';

export abstract class MessageHandler {
    constructor(
        protected server: MiraWebsocketServer,
        protected dbService: ILibraryServerData,
        protected ws: WebSocket,
        protected message: WebSocketMessage
    ) { }

    abstract handle(): Promise<void>;

    protected sendResponse(data: Record<string, any>): void {
        const response = JSON.stringify({
            'requestId': this.message.requestId,
            'libraryId': this.message.libraryId,
            "status": "success",
            data,
        })
        console.log({ response });
        this.ws.send(response);
    }

    protected sendError(error: string): void {
        const response = JSON.stringify({
            ...this.message,
            status: 'error',
            error
        });
        console.log({ response })
        this.ws.send(response);
    }
}
