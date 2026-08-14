import { HttpClient } from '../client/HttpClient';
import {
    AdminUser,
    ApiToken,
    BaseResponse,
    CreateAdminRequest,
    UpdateAdminRequest,
} from '../types';

/**
 * 管理员模块
 * 管理员账号与其 API Token 的增删改查
 */
export class AdminModule {
    constructor(private httpClient: HttpClient) { }

    /**
     * 获取管理员列表
     * @returns Promise<AdminUser[]>
     */
    async getAll(): Promise<AdminUser[]> {
        return await this.httpClient.get<AdminUser[]>('/api/admins');
    }

    /**
     * 创建管理员
     * @returns Promise<{ id: string }> 新建管理员 ID
     */
    async create(data: CreateAdminRequest): Promise<{ id: string }> {
        return await this.httpClient.post<{ id: string }>('/api/admins', data);
    }

    /**
     * 更新管理员信息
     */
    async update(id: string, data: UpdateAdminRequest): Promise<BaseResponse> {
        return await this.httpClient.put<BaseResponse>(`/api/admins/${encodeURIComponent(id)}`, data);
    }

    /**
     * 删除管理员
     */
    async delete(id: string): Promise<BaseResponse> {
        return await this.httpClient.delete<BaseResponse>(`/api/admins/${encodeURIComponent(id)}`);
    }

    /**
     * 获取管理员的 API Token 列表
     */
    async getTokens(id: string): Promise<ApiToken[]> {
        return await this.httpClient.get<ApiToken[]>(`/api/admins/${encodeURIComponent(id)}/tokens`);
    }

    /**
     * 为管理员创建 API Token
     */
    async createToken(id: string, data: { name?: string; expiresInDays?: number | null }): Promise<ApiToken> {
        return await this.httpClient.post<ApiToken>(`/api/admins/${encodeURIComponent(id)}/tokens`, data);
    }

    /**
     * 更新管理员的 API Token
     */
    async updateToken(id: string, tokenId: number, data: { name?: string; expiresInDays?: number | null }): Promise<ApiToken> {
        return await this.httpClient.put<ApiToken>(
            `/api/admins/${encodeURIComponent(id)}/tokens/${tokenId}`,
            data
        );
    }

    /**
     * 删除管理员的 API Token
     */
    async deleteToken(id: string, tokenId: number): Promise<BaseResponse> {
        return await this.httpClient.delete<BaseResponse>(
            `/api/admins/${encodeURIComponent(id)}/tokens/${tokenId}`
        );
    }
}
