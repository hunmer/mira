/**
 * 文件上传示例
 * 演示如何使用 Mira SDK 进行文件上传操作
 */
import { MiraClient } from 'mira-server-sdk';
/**
 * 创建测试文件
 */
declare function createTestFiles(): {
    [key: string]: string;
};
/**
 * 基本文件上传示例
 */
declare function basicUploadExample(client: MiraClient, files: {
    [key: string]: string;
}): Promise<import("mira-server-sdk").UploadResponse>;
/**
 * 批量文件上传示例
 */
declare function batchUploadExample(client: MiraClient, files: {
    [key: string]: string;
}): Promise<import("mira-server-sdk").UploadResponse>;
/**
 * 高级上传选项示例
 */
declare function advancedUploadExample(client: MiraClient, files: {
    [key: string]: string;
}): Promise<import("mira-server-sdk").UploadResponse>;
/**
 * 文件下载示例
 */
declare function downloadExample(client: MiraClient, uploadResult: any): Promise<Blob | undefined>;
/**
 * 错误处理示例
 */
declare function errorHandlingExample(client: MiraClient): Promise<void>;
/**
 * 清理测试文件
 */
declare function cleanupTestFiles(files: {
    [key: string]: string;
}): void;
export { basicUploadExample, batchUploadExample, advancedUploadExample, downloadExample, errorHandlingExample, createTestFiles, cleanupTestFiles };
//# sourceMappingURL=upload-example.d.ts.map