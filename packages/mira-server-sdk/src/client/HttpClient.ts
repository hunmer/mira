import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ClientConfig, ErrorResponse, BaseResponse } from '../types';

/**
 * HTTP 客户端基础类
 * 提供统一的 HTTP 请求处理和错误处理
 */
export class HttpClient {
    private axiosInstance: AxiosInstance;
    private config: ClientConfig;

    constructor(config: ClientConfig) {
        this.config = config;
        this.axiosInstance = axios.create({
            baseURL: config.baseURL,
            timeout: config.timeout || 10000,
            headers: {
                'Content-Type': 'application/json',
                ...config.headers,
            },
        });

        // 设置请求拦截器
        this.axiosInstance.interceptors.request.use(
            (config) => {
                if (this.config.token) {
                    config.headers.Authorization = `Bearer ${this.config.token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // 设置响应拦截器
        this.axiosInstance.interceptors.response.use(
            (response) => {
                return response;
            },
            (error) => {
                if (error.response) {
                    // 服务器返回了错误状态码
                    const errorResponse: ErrorResponse = {
                        error: error.response.data?.error || 'HTTP_ERROR',
                        message: error.response.data?.message || error.message,
                        timestamp: new Date().toISOString(),
                        stack: error.response.data?.stack,
                    };
                    return Promise.reject(errorResponse);
                } else if (error.request) {
                    // 请求已发出但没有收到响应
                    const errorResponse: ErrorResponse = {
                        error: 'NETWORK_ERROR',
                        message: 'Network error or server is not responding',
                        timestamp: new Date().toISOString(),
                    };
                    return Promise.reject(errorResponse);
                } else {
                    // 其他错误
                    const errorResponse: ErrorResponse = {
                        error: 'REQUEST_ERROR',
                        message: error.message,
                        timestamp: new Date().toISOString(),
                    };
                    return Promise.reject(errorResponse);
                }
            }
        );
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
