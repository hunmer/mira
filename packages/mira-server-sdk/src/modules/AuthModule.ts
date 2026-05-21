import { HttpClient } from '../client/HttpClient';
import {
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    UserInfo,
    VerifyResponse,
    BaseResponse,
} from '../types';

/**
 * 认证模块
 * 处理用户登录、登出、令牌验证等认证相关操作
 */
export class AuthModule {
    constructor(private httpClient: HttpClient) { }

    /**
     * 用户登录
     * @param username 用户名
     * @param password 密码
     * @returns Promise<LoginResponse>
     */
    async login(username: string, password: string): Promise<LoginResponse> {
        const request: LoginRequest = { username, password };
        const response = await this.httpClient.post<LoginResponse>('/api/auth/login', request);

        // 自动设置令牌
        if (response.accessToken) {
            this.httpClient.setToken(response.accessToken);
        }

        return response;
    }

    /**
     * 用户注册
     * @param username 用户名
     * @param password 密码
     * @returns Promise<RegisterResponse>
     */
    async register(username: string, password: string): Promise<RegisterResponse> {
        const request: RegisterRequest = { username, password };
        const response = await this.httpClient.post<RegisterResponse>('/api/auth/register', request);
        return response;
    }

    /**
     * 用户登出
     * @returns Promise<BaseResponse>
     */
    async logout(): Promise<BaseResponse> {
        const response = await this.httpClient.post<BaseResponse>('/api/auth/logout');

        // 清除本地令牌
        this.httpClient.clearToken();

        return response;
    }

    /**
     * 验证令牌是否有效
     * @returns Promise<VerifyResponse>
     */
    async verify(): Promise<VerifyResponse> {
        return await this.httpClient.get<VerifyResponse>('/api/auth/verify');
    }

    /**
     * 获取当前用户的权限码列表
     * @returns Promise<string[]>
     */
    async getCodes(): Promise<string[]> {
        return await this.httpClient.get<string[]>('/api/auth/codes');
    }

    /**
     * 手动设置令牌
     * @param token 访问令牌
     * @returns AuthModule 返回自身以支持链式调用
     */
    setToken(token: string): AuthModule {
        this.httpClient.setToken(token);
        return this;
    }

    /**
     * 清除令牌
     * @returns AuthModule 返回自身以支持链式调用
     */
    clearToken(): AuthModule {
        this.httpClient.clearToken();
        return this;
    }

    /**
     * 检查是否已登录（有令牌）
     * @returns boolean
     */
    isAuthenticated(): boolean {
        return (this.httpClient as any).config.token !== undefined;
    }
}
