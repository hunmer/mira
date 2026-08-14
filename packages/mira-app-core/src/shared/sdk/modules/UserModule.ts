import { HttpClient } from '../client/HttpClient';
import {
    UserInfo,
    UpdateUserRequest,
    BaseResponse,
    ApiToken,
} from '../types';

/**
 * 用户模块
 * 处理用户信息获取和更新
 */
export class UserModule {
    constructor(private httpClient: HttpClient) { }

    /**
     * 获取当前登录用户的详细信息
     * @returns Promise<UserInfo>
     */
    async getInfo(): Promise<UserInfo> {
        return await this.httpClient.get<UserInfo>('/api/user/info');
    }

    /**
     * 更新当前登录用户的信息
     * @param userData 要更新的用户数据
     * @returns Promise<BaseResponse>
     */
    async updateInfo(userData: UpdateUserRequest): Promise<BaseResponse> {
        return await this.httpClient.put<BaseResponse>('/api/user/info', userData);
    }

    /**
     * 修改当前登录用户的密码
     * @param oldPassword 旧密码
     * @param newPassword 新密码
     */
    async changePassword(oldPassword: string, newPassword: string): Promise<void> {
        await this.httpClient.put('/api/user/change-password', { oldPassword, newPassword });
    }

    /**
     * 上传当前登录用户的头像（base64 data URL 写入服务器文件）
     * @param image base64 图片数据（data:image/...;base64,...）
     */
    async uploadAvatar(image: string): Promise<void> {
        await this.httpClient.post('/api/user/avatar', { image });
    }

    /**
     * 获取当前登录用户的 API Token 列表
     */
    async getTokens(): Promise<ApiToken[]> {
        return await this.httpClient.get<ApiToken[]>('/api/user/tokens');
    }

    /**
     * 构造用户头像的资源 URL（供 img src 直接访问，自动附加鉴权）
     */
    getAvatarUrl(userId: string): string {
        return this.httpClient.getUrl(`/api/user/avatar/${encodeURIComponent(userId)}`);
    }

    /**
     * 更新用户真实姓名
     * @param realName 真实姓名
     * @returns UserModule 返回自身以支持链式调用
     */
    updateRealName(realName: string): Promise<BaseResponse> {
        return this.updateInfo({ realName });
    }

    /**
     * 更新用户头像
     * @param avatar 头像URL
     * @returns UserModule 返回自身以支持链式调用
     */
    updateAvatar(avatar: string): Promise<BaseResponse> {
        return this.updateInfo({ avatar });
    }

    /**
     * 批量更新用户信息
     * @param realName 真实姓名
     * @param avatar 头像URL
     * @returns Promise<BaseResponse>
     */
    updateProfile(realName?: string, avatar?: string): Promise<BaseResponse> {
        const updateData: UpdateUserRequest = {};
        if (realName) updateData.realName = realName;
        if (avatar) updateData.avatar = avatar;

        return this.updateInfo(updateData);
    }
}
