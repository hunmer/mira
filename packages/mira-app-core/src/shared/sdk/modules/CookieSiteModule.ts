import { HttpClient } from '../client/HttpClient';

export interface CookieItem {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: string | number;
}

export interface CookieSite {
    id: number;
    userId: number;
    name: string;
    url: string;
    cookies: CookieItem[];
    remark?: string;
    label?: string;
    isDefault?: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface CreateCookieSiteRequest {
    name: string;
    url: string;
    cookies?: CookieItem[];
    remark?: string;
    label?: string;
    isDefault?: boolean;
}

export type UpdateCookieSiteRequest = Partial<CreateCookieSiteRequest>;

/** 当前登录用户的下载站点 Cookie 管理。 */
export class CookieSiteModule {
    constructor(private httpClient: HttpClient) { }

    async getAll(): Promise<CookieSite[]> {
        return await this.httpClient.get<CookieSite[]>('/api/cookie-sites');
    }

    async create(request: CreateCookieSiteRequest): Promise<CookieSite> {
        return await this.httpClient.post<CookieSite>('/api/cookie-sites', request);
    }

    async update(id: number, request: UpdateCookieSiteRequest): Promise<CookieSite> {
        return await this.httpClient.put<CookieSite>(`/api/cookie-sites/${id}`, request);
    }

    async setDefault(id: number): Promise<CookieSite> {
        return await this.httpClient.put<CookieSite>(`/api/cookie-sites/${id}/default`);
    }

    async delete(id: number): Promise<{ id: number }> {
        return await this.httpClient.delete<{ id: number }>(`/api/cookie-sites/${id}`);
    }
}
