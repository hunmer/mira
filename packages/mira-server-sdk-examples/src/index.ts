/**
 * 主入口文件
 * 导出所有示例函数供其他模块使用
 */

// 认证示例
export {
    basicLoginExample,
    chainedLoginExample,
    errorHandlingExample as authErrorHandlingExample,
    tokenManagementExample
} from '../examples/auth/login-example';

// 文件上传示例
export {
    basicUploadExample,
    batchUploadExample,
    advancedUploadExample,
    downloadExample,
    errorHandlingExample as uploadErrorHandlingExample,
    createTestFiles,
    cleanupTestFiles
} from '../examples/files/upload-example';

// 基本使用示例
export {
    quickStartExample,
    libraryManagementExample,
    userManagementExample,
    systemMonitoringExample,
    deviceManagementExample
} from '../examples/basic/basic-usage';

// 导出SDK类型
export * from 'mira-server-sdk';

/**
 * 示例工具函数
 */
export class ExampleUtils {
    /**
     * 创建测试文件
     */
    static createTestFile(content: string, filename: string, type: string): File {
        const blob = new Blob([content], { type });
        return new File([blob], filename, { type });
    }

    /**
     * 格式化文件大小
     */
    static formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 生成随机文件名
     */
    static generateRandomFilename(extension: string = 'txt'): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        return `test-${timestamp}-${random}.${extension}`;
    }

    /**
     * 延迟函数
     */
    static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 重试函数
     */
    static async retry<T>(
        fn: () => Promise<T>,
        maxRetries: number = 3,
        delayMs: number = 1000
    ): Promise<T> {
        let lastError: Error;

        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error as Error;
                if (i < maxRetries - 1) {
                    await this.delay(delayMs);
                }
            }
        }

        throw lastError!;
    }
}
