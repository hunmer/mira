// Types migrated from mira-app-core for server-side use

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
