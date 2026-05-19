export type User = {
    id: number;
    username: string;
    password: string;
    role: string;
    permissions: string[];
    created_at: number;
    updated_at: number;
    is_active: boolean;
    email?: string;
};

export type Session = {
    token: string;
    user_id: number;
    created_at: number;
    expires_at: number;
    is_active: boolean;
};

// Core exports for mira_core package (SDK only)
export { EventArgs, EventSubscription, EventManager } from './event-manager';
export { saveLibraries, getLibraries } from './LibraryList';

// Shared interfaces migrated from mira-app-server
export interface WebSocketMessage {
    action: string;
    requestId: string;
    libraryId: string;
    clientId: string;
    payload: {
        type: string;
        data: Record<string, any>;
    };
}


// Re-export types and interfaces
export type * from './event-manager';
