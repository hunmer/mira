/**
 * HttpClient 测试
 */

import axios from 'axios';
import { HttpClient } from '../../src/client/HttpClient';

// 模拟 axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HttpClient', () => {
    let httpClient: HttpClient;
    let mockAxiosInstance: any;

    beforeEach(() => {
        // 重置所有模拟
        jest.clearAllMocks();

        // 模拟 axios 实例
        mockAxiosInstance = {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
            interceptors: {
                request: { use: jest.fn() },
                response: { use: jest.fn() },
            },
        };

        mockedAxios.create.mockReturnValue(mockAxiosInstance);

        httpClient = new HttpClient({
            baseURL: 'http://localhost:8081',
            timeout: 5000,
        });
    });

    describe('构造函数', () => {
        it('应该正确创建 axios 实例', () => {
            expect(mockedAxios.create).toHaveBeenCalledWith({
                baseURL: 'http://localhost:8081',
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        });

        it('应该设置请求和响应拦截器', () => {
            expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
            expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
        });
    });

    describe('setToken', () => {
        it('应该设置认证令牌', () => {
            const token = 'test-token';
            httpClient.setToken(token);

            expect((httpClient as any).config.token).toBe(token);
        });
    });

    describe('clearToken', () => {
        it('应该清除认证令牌', () => {
            httpClient.setToken('test-token');
            httpClient.clearToken();

            expect((httpClient as any).config.token).toBeUndefined();
        });
    });

    describe('GET 请求', () => {
        it('应该发送 GET 请求并返回数据', async () => {
            const responseData = { data: { id: 1, name: 'test' } };
            mockAxiosInstance.get.mockResolvedValue(responseData);

            const result = await httpClient.get('/api/test');

            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/test', undefined);
            expect(result).toEqual({ id: 1, name: 'test' });
        });

        it('应该处理直接返回数据的响应', async () => {
            const responseData = { id: 1, name: 'test' };
            mockAxiosInstance.get.mockResolvedValue({ data: responseData });

            const result = await httpClient.get('/api/test');

            expect(result).toEqual(responseData);
        });
    });

    describe('POST 请求', () => {
        it('应该发送 POST 请求', async () => {
            const requestData = { name: 'test' };
            const responseData = { data: { success: true } };
            mockAxiosInstance.post.mockResolvedValue(responseData);

            const result = await httpClient.post('/api/test', requestData);

            expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/test', requestData, undefined);
            expect(result).toEqual({ success: true });
        });
    });

    describe('PUT 请求', () => {
        it('应该发送 PUT 请求', async () => {
            const requestData = { name: 'updated' };
            const responseData = { data: { success: true } };
            mockAxiosInstance.put.mockResolvedValue(responseData);

            const result = await httpClient.put('/api/test/1', requestData);

            expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/test/1', requestData, undefined);
            expect(result).toEqual({ success: true });
        });
    });

    describe('DELETE 请求', () => {
        it('应该发送 DELETE 请求', async () => {
            const responseData = { data: { success: true } };
            mockAxiosInstance.delete.mockResolvedValue(responseData);

            const result = await httpClient.delete('/api/test/1');

            expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/api/test/1', undefined);
            expect(result).toEqual({ success: true });
        });
    });

    describe('文件上传', () => {
        it('应该发送文件上传请求', async () => {
            const formData = new FormData();
            formData.append('file', 'test-content');
            const responseData = { success: true };
            mockAxiosInstance.post.mockResolvedValue({ data: responseData });

            const result = await httpClient.upload('/api/upload', formData);

            expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            expect(result).toEqual(responseData);
        });
    });

    describe('文件下载', () => {
        it('应该发送文件下载请求', async () => {
            const blobData = new Blob(['file content']);
            mockAxiosInstance.get.mockResolvedValue({ data: blobData });

            const result = await httpClient.download('/api/download/file.txt');

            expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/download/file.txt', {
                responseType: 'blob',
            });
            expect(result).toBe(blobData);
        });
    });

    describe('错误处理', () => {
        it('应该处理网络错误', async () => {
            const networkError = { request: {}, message: 'Network Error' };
            mockAxiosInstance.get.mockRejectedValue(networkError);

            await expect(httpClient.get('/api/test')).rejects.toMatchObject({
                error: 'NETWORK_ERROR',
                message: 'Network error or server is not responding',
            });
        });

        it('应该处理服务器错误响应', async () => {
            const serverError = {
                response: {
                    data: {
                        error: 'VALIDATION_ERROR',
                        message: 'Invalid data',
                        stack: 'Error stack trace',
                    },
                },
            };
            mockAxiosInstance.get.mockRejectedValue(serverError);

            await expect(httpClient.get('/api/test')).rejects.toMatchObject({
                error: 'VALIDATION_ERROR',
                message: 'Invalid data',
                stack: 'Error stack trace',
            });
        });

        it('应该处理请求配置错误', async () => {
            const configError = { message: 'Invalid configuration' };
            mockAxiosInstance.get.mockRejectedValue(configError);

            await expect(httpClient.get('/api/test')).rejects.toMatchObject({
                error: 'REQUEST_ERROR',
                message: 'Invalid configuration',
            });
        });
    });

    describe('请求拦截器', () => {
        it('应该在请求中添加 Authorization 头', () => {
            const token = 'test-token';
            httpClient.setToken(token);

            // 获取请求拦截器
            const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
            const config = { headers: {} };

            const result = requestInterceptor(config);

            expect(result.headers.Authorization).toBe(`Bearer ${token}`);
        });

        it('没有令牌时不应该添加 Authorization 头', () => {
            // 获取请求拦截器
            const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
            const config = { headers: {} };

            const result = requestInterceptor(config);

            expect(result.headers.Authorization).toBeUndefined();
        });
    });
});
