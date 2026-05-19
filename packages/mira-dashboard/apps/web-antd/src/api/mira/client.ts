/**
 * Mira专用API客户端
 * 基于vben的RequestClient，但适配mira-app-server的API格式
 */
import type { RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { RequestClient } from '@vben/request';
import { useAccessStore } from '@vben/stores';

import { message } from 'ant-design-vue';

/**
 * 创建Mira专用的API客户端
 */
function createMiraApiClient(baseURL: string, options?: RequestClientOptions) {
    const client = new RequestClient({
        ...options,
        baseURL,
        timeout: 10000,
    });

    // 请求拦截器 - 添加认证token
    client.addRequestInterceptor({
        fulfilled: (config) => {
            // 记录请求开始时间（用于统计）
            (config as any).metadata = { startTime: Date.now() };

            // 设置Content-Type（除非是FormData）
            if (!(config.data instanceof FormData)) {
                config.headers = config.headers || {};
                config.headers['Content-Type'] = 'application/json';
            }

            // 添加认证token - 兼容mira和vben两种token获取方式
            let token = sessionStorage.getItem('token'); // mira方式
            if (!token) {
                const accessStore = useAccessStore();
                token = accessStore.accessToken; // vben方式
            }

            if (token) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${token}`;
            }

            return config;
        },
        rejected: (error) => {
            console.error('❌ Mira API Request Interceptor Error:', error);
            return Promise.reject(error);
        },
    });

    // 响应拦截器 - 错误处理
    client.addResponseInterceptor({
        fulfilled: (response) => {
            // 计算请求耗时
            const duration = Date.now() - ((response.config as any).metadata?.startTime || 0);

            // 在开发环境下记录请求信息
            if (import.meta.env.DEV) {
                console.log(`✅ Mira API: ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`);
            }

            return response;
        },
        rejected: (error) => {
            // 计算请求耗时
            const duration = Date.now() - ((error.config as any)?.metadata?.startTime || 0);

            // 在开发环境下记录错误信息
            if (import.meta.env.DEV) {
                console.error(`❌ Mira API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${duration}ms`, error);
            }

            // 错误处理 - 保持与mira原有逻辑一致
            if (error.response?.status === 401) {
                // 清除认证相关存储
                sessionStorage.removeItem('token');
                localStorage.removeItem('token');
                sessionStorage.clear();

                // 使用vben的认证store处理登录过期
                const accessStore = useAccessStore();
                accessStore.setAccessToken(null);

                // 重定向到登录页
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                    message.error('登录已过期，请重新登录');
                }
            } else if (error.response?.status >= 500) {
                message.error('服务器错误，请稍后重试');
            } else if (error.response?.status >= 400) {
                const errorMessage = error.response?.data?.message || error.response?.data?.error || '请求失败';
                message.error(errorMessage);
            } else if (error.code === 'ECONNABORTED') {
                message.error('请求超时，请检查网络连接');
            } else if (!error.response) {
                message.error('网络连接失败，请检查网络设置');
            }

            return Promise.reject(error);
        },
    });

    return client;
}

// 获取API基础URL
const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

// 创建Mira API客户端实例
export const miraApiClient = createMiraApiClient(apiURL);

// 兼容原有的api导出方式
export const api = miraApiClient;
export default miraApiClient;
