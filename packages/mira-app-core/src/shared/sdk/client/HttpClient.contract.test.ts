import { describe, expect, it, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { HttpClient } from './HttpClient';

/**
 * 捕获 axios 拦截器回调与实例方法的 mock。
 * interceptors.request.use / response.use 注册的回调存入数组, 供测试手动触发。
 */
const requestHandlers: ((config: any) => any)[] = [];
const responseHandlers: ((error: any) => any)[] = [];
const mockAxiosInstance = {
    interceptors: {
        request: { use: vi.fn((onFulfilled: any) => requestHandlers.push(onFulfilled)) },
        response: {
            use: vi.fn((_onFulfilled: any, onRejected: any) => responseHandlers.push(onRejected)),
        },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
};

vi.mock('axios', () => ({
    default: { create: vi.fn(() => mockAxiosInstance) },
}));

describe('HttpClient contract', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requestHandlers.length = 0;
        responseHandlers.length = 0;
    });

    it('injects the configured token as a Bearer header on every request', () => {
        new HttpClient({ baseURL: 'http://localhost:8081', token: 'token-1' });
        const interceptor = requestHandlers[0];

        const config = interceptor({ headers: {} });
        expect(config.headers.Authorization).toBe('Bearer token-1');
    });

    it('prefers getToken() over the static token when both are set', () => {
        new HttpClient({
            baseURL: 'http://localhost:8081',
            token: 'static-token',
            getToken: () => 'dynamic-token',
        });
        const interceptor = requestHandlers[0];

        const config = interceptor({ headers: {} });
        expect(config.headers.Authorization).toBe('Bearer dynamic-token');
    });

    it('does not set an Authorization header when no token is configured', () => {
        new HttpClient({ baseURL: 'http://localhost:8081' });
        const interceptor = requestHandlers[0];

        const config = interceptor({ headers: {} });
        expect(config.headers.Authorization).toBeUndefined();
    });

    it('unwraps the inner data field of a wrapped response', async () => {
        const client = new HttpClient({ baseURL: 'http://localhost:8081' });
        const inner = { hello: 'world' };
        mockAxiosInstance.get.mockResolvedValueOnce({ data: { code: 0, data: inner } });

        await expect(client.get('/api/settings')).resolves.toEqual(inner);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/settings', undefined);
    });

    it('returns the raw payload when the response has no data wrapper', async () => {
        const client = new HttpClient({ baseURL: 'http://localhost:8081' });
        const raw = [{ name: 'lib-1' }];
        mockAxiosInstance.get.mockResolvedValueOnce({ data: raw });

        await expect(client.get('/api/libraries')).resolves.toEqual(raw);
    });

    it('rejects with an HTTP_ERROR ErrorResponse when the server returns an error status', async () => {
        new HttpClient({ baseURL: 'http://localhost:8081' });
        const onRejected = responseHandlers[0];
        const axiosError = {
            response: { data: { error: 'PLUGIN_NOT_FOUND', message: 'plugin missing' } },
            message: 'Request failed with status code 404',
        };

        await expect(onRejected(axiosError)).rejects.toMatchObject({
            error: 'PLUGIN_NOT_FOUND',
            message: 'plugin missing',
        });
    });

    it('rejects with a NETWORK_ERROR ErrorResponse when no response was received', async () => {
        new HttpClient({ baseURL: 'http://localhost:8081' });
        const onRejected = responseHandlers[0];

        await expect(onRejected({ request: {}, message: 'timeout' })).rejects.toMatchObject({
            error: 'NETWORK_ERROR',
        });
    });
});
