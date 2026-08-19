import { HttpClient } from '../client/HttpClient';
import { HealthResponse } from '../types';

/**
 * 系统模块
 * 处理系统状态检查和健康监控
 */
export class SystemModule {
    constructor(private httpClient: HttpClient) { }

    /**
     * 获取详细的系统健康状态
     * @returns Promise<HealthResponse>
     */
    async getHealth(): Promise<HealthResponse> {
        return await this.httpClient.get<HealthResponse>('/api/health');
    }

    /**
     * 获取简单的健康状态
     * @returns Promise<HealthResponse>
     */
    async getSimpleHealth(): Promise<HealthResponse> {
        return await this.httpClient.get<HealthResponse>('/health');
    }

    /**
     * 停止服务器（服务端优雅关闭后退出进程）
     * 仅限本机回环调用，远程调用会被服务端拒绝（403）
     * @returns Promise<{stopping: boolean}>
     */
    async stopServer(): Promise<{ stopping: boolean }> {
        return await this.httpClient.post<{ stopping: boolean }>('/api/system/stop');
    }

    /**
     * 检查服务器是否可用
     * @returns Promise<boolean>
     */
    async isServerAvailable(): Promise<boolean> {
        try {
            const health = await this.getSimpleHealth();
            return health.status === 'ok';
        } catch {
            return false;
        }
    }

    /**
     * 获取服务器运行时间（秒）
     * @returns Promise<number>
     */
    async getUptime(): Promise<number> {
        const health = await this.getHealth();
        return health.uptime;
    }

    /**
     * 获取服务器版本信息
     * @returns Promise<string>
     */
    async getVersion(): Promise<string> {
        const health = await this.getHealth();
        return health.version;
    }

    /**
     * 获取 Node.js 版本
     * @returns Promise<string | undefined>
     */
    async getNodeVersion(): Promise<string | undefined> {
        const health = await this.getHealth();
        return health.nodeVersion;
    }

    /**
     * 获取运行环境
     * @returns Promise<string | undefined>
     */
    async getEnvironment(): Promise<string | undefined> {
        const health = await this.getHealth();
        return health.environment;
    }

    /**
     * 获取完整的系统信息
     * @returns Promise<{uptime: number, version: string, nodeVersion?: string, environment?: string}>
     */
    async getSystemInfo(): Promise<{
        uptime: number;
        version: string;
        nodeVersion?: string;
        environment?: string;
    }> {
        const health = await this.getHealth();
        return {
            uptime: health.uptime,
            version: health.version,
            nodeVersion: health.nodeVersion,
            environment: health.environment,
        };
    }

    /**
     * 检查服务器是否健康（带重试机制）
     * @param maxRetries 最大重试次数
     * @param retryDelay 重试间隔（毫秒）
     * @returns Promise<boolean>
     */
    async checkHealthWithRetry(maxRetries: number = 3, retryDelay: number = 1000): Promise<boolean> {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const isAvailable = await this.isServerAvailable();
                if (isAvailable) {
                    return true;
                }
            } catch {
                // 忽略错误，继续重试
            }

            if (i < maxRetries - 1) {
                await this.delay(retryDelay);
            }
        }

        return false;
    }

    /**
     * 等待服务器就绪
     * @param timeout 超时时间（毫秒）
     * @param checkInterval 检查间隔（毫秒）
     * @returns Promise<boolean>
     */
    async waitForServer(timeout: number = 30000, checkInterval: number = 1000): Promise<boolean> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            try {
                const isAvailable = await this.isServerAvailable();
                if (isAvailable) {
                    return true;
                }
            } catch {
                // 忽略错误，继续等待
            }

            await this.delay(checkInterval);
        }

        return false;
    }

    /**
     * 获取运行时间的可读格式
     * @returns Promise<string>
     */
    async getUptimeFormatted(): Promise<string> {
        const uptimeSeconds = await this.getUptime();
        return this.formatUptime(uptimeSeconds);
    }

    /**
     * 监控服务器状态
     * @param callback 状态变化回调函数
     * @param interval 检查间隔（毫秒）
     * @returns 停止监控的函数
     */
    monitorHealth(
        callback: (isHealthy: boolean, health?: HealthResponse, error?: any) => void,
        interval: number = 5000
    ): () => void {
        let isRunning = true;

        const check = async () => {
            while (isRunning) {
                try {
                    const health = await this.getHealth();
                    const isHealthy = health.status === 'ok';
                    callback(isHealthy, health);
                } catch (error) {
                    callback(false, undefined, error);
                }

                if (isRunning) {
                    await this.delay(interval);
                }
            }
        };

        check();

        // 返回停止监控的函数
        return () => {
            isRunning = false;
        };
    }

    /**
     * 延迟函数
     * @param ms 延迟时间（毫秒）
     * @returns Promise<void>
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 格式化运行时间
     * @param seconds 秒数
     * @returns 格式化的时间字符串
     */
    private formatUptime(seconds: number): string {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        const parts: string[] = [];

        if (days > 0) parts.push(`${days}天`);
        if (hours > 0) parts.push(`${hours}小时`);
        if (minutes > 0) parts.push(`${minutes}分钟`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}秒`);

        return parts.join('');
    }
}
