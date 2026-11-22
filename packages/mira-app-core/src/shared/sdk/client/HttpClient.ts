import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ClientConfig, ErrorResponse, BaseResponse } from '../types';

/**
 * HTTP 客户端基础类
 * 提供统一的 HTTP 请求处理和错误处理
 */
export class HttpClient {
    private axiosInstance: AxiosInstance;
    private config: ClientConfig;
    private reauthenticationPromise: Promise<string | undefined> | null = null;

    constructor(config: ClientConfig) {
        this.config = config;
        this.axiosInstance = axios.create({
            baseURL: config.baseURL,
            timeout: config.timeout || 10000 * 6,
            headers: {
                'Content-Type': 'application/json',
                ...config.headers,
            },
        });

        // 设置请求拦截器
        this.axiosInstance.interceptors.request.use(
            (reqConfig) => this.applyAuthToken(reqConfig),
            (error) => {
                return Promise.reject(error);
            }
        );

        // 设置响应拦截器
        this.axiosInstance.interceptors.response.use(
            (response) => response,
            (error) => this.handleResponseError(error)
        );
    }

    /** 请求拦截器：注入 Bearer 认证头。 */
    private applyAuthToken(reqConfig: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
        const token = this.config.getToken?.() || this.config.token;
        if (token) {
            reqConfig.headers.Authorization = `Bearer ${token}`;
        }
        return reqConfig;
    }

    /** 响应错误拦截器：401 时尝试重认证并重放，其余统一转 ErrorResponse 抛出。 */
    private async handleResponseError(error: any): Promise<any> {
        if (error.response) {
            const replayed = await this.tryReplayWithFreshToken(error.response.status, error.config);
            if (replayed) return replayed;
        }
        return Promise.reject(this.toErrorResponse(error));
    }

    /**
     * 401 时单飞重认证并重放原请求一次。
     * 返回重放响应的 Promise；不可重放或重认证失败时返回 null（继续抛原始错误）。
     */
    private async tryReplayWithFreshToken(
        status: number,
        requestConfig: (AxiosRequestConfig & { _miraAuthRetried?: boolean }) | undefined,
    ): Promise<AxiosResponse | null> {
        const isLoginRequest = requestConfig?.url?.includes('/api/auth/login');
        const isActiveReauthenticationRequest = !!this.reauthenticationPromise
            && requestConfig?.url?.includes('/api/auth/');
        if (
            status !== 401
            || !requestConfig
            || requestConfig._miraAuthRetried
            || isLoginRequest
            || isActiveReauthenticationRequest
            || !this.config.onUnauthorized
        ) {
            return null;
        }
        requestConfig._miraAuthRetried = true;
        try {
            const token = await this.reauthenticate();
            if (token) {
                requestConfig.headers = requestConfig.headers || {};
                requestConfig.headers.Authorization = `Bearer ${token}`;
                return this.axiosInstance.request(requestConfig);
            }
        } catch {
            // 重认证失败时继续抛出原始 401，保留调用方现有错误处理语义
        }
        return null;
    }

    /** axios 错误 → 统一 ErrorResponse（有响应 / 无响应 / 其他三分支）。 */
    private toErrorResponse(error: any): ErrorResponse {
        if (error.response) {
            // 服务器返回了错误状态码
            return {
                error: error.response.data?.error || 'HTTP_ERROR',
                message: error.response.data?.message || error.message,
                timestamp: new Date().toISOString(),
                stack: error.response.data?.stack,
                status: error.response.status,
            };
        }
        if (error.request) {
            // 请求已发出但没有收到响应
            return {
                error: 'NETWORK_ERROR',
                message: 'Network error or server is not responding',
                timestamp: new Date().toISOString(),
            };
        }
        // 其他错误
        return {
            error: 'REQUEST_ERROR',
            message: error.message,
            timestamp: new Date().toISOString(),
        };
    }

    private reauthenticate(): Promise<string | undefined> {
        if (!this.reauthenticationPromise) {
            this.reauthenticationPromise = (async () => {
                try {
                    return await this.config.onUnauthorized?.();
                } finally {
                    this.reauthenticationPromise = null;
                }
            })();
        }
        return this.reauthenticationPromise;
    }

    /**
     * 设置认证令牌
     */
    setToken(token: string): void {
        this.config.token = token;
    }

    /**
     * 清除认证令牌
     */
    clearToken(): void {
        this.config.token = undefined;
    }

    /**
     * GET 请求
     */
    async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.axiosInstance.get<BaseResponse<T>>(url, config);
        return this.extractData(response);
    }

    /**
     * POST 请求
     */
    async post<T = any>(
        url: string,
        data?: any,
        config?: AxiosRequestConfig
    ): Promise<T> {
        const response = await this.axiosInstance.post<BaseResponse<T>>(url, data, config);
        return this.extractData(response);
    }

    /**
     * PUT 请求
     */
    async put<T = any>(
        url: string,
        data?: any,
        config?: AxiosRequestConfig
    ): Promise<T> {
        const response = await this.axiosInstance.put<BaseResponse<T>>(url, data, config);
        return this.extractData(response);
    }

    /**
     * PATCH 请求
     */
    async patch<T = any>(
        url: string,
        data?: any,
        config?: AxiosRequestConfig
    ): Promise<T> {
        const response = await this.axiosInstance.patch<BaseResponse<T>>(url, data, config);
        return this.extractData(response);
    }

    /**
     * DELETE 请求
     */
    async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.axiosInstance.delete<BaseResponse<T>>(url, config);
        return this.extractData(response);
    }

    /**
     * 上传文件
     */
    async upload<T = any>(
        url: string,
        formData: FormData,
        config?: AxiosRequestConfig
    ): Promise<T> {
        const response = await this.axiosInstance.post<T>(url, formData, {
            ...config,
            headers: {
                'Content-Type': 'multipart/form-data',
                ...config?.headers,
            },
        });
        return response.data;
    }

    /**
     * 下载文件
     */
    async download(url: string, config?: AxiosRequestConfig): Promise<Blob> {
        const response = await this.axiosInstance.get(url, {
            ...config,
            responseType: 'blob',
        });
        return response.data;
    }

    /** 构造可供 img/iframe 等元素直接访问的鉴权 URL。 */
    getUrl(url: string): string {
        const resolved = new URL(url, this.config.baseURL.endsWith('/') ? this.config.baseURL : `${this.config.baseURL}/`);
        const token = this.config.getToken?.() || this.config.token;
        if (token) resolved.searchParams.set('token', token);
        return resolved.toString();
    }

    /**
     * 提取响应数据
     * 支持不同的响应格式
     */
    private extractData<T>(response: AxiosResponse<BaseResponse<T> | T>): T {
        const data = response.data;

        // 如果响应包含 data 字段，则提取 data
        if (typeof data === 'object' && data !== null && 'data' in data) {
            return (data as BaseResponse<T>).data;
        }

        // 否则直接返回响应数据
        return data as T;
    }

    /**
     * 获取原始 axios 实例
     */
    getAxiosInstance(): AxiosInstance {
        return this.axiosInstance;
    }
}
