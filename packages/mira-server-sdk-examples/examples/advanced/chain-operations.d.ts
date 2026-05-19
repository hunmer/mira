/**
 * 高级链式操作示例
 * 演示复杂的链式调用和错误处理模式
 */
/**
 * 复杂工作流示例
 * 展示登录 -> 创建素材库 -> 启动服务 -> 上传文件 -> 验证的完整流程
 */
declare function complexWorkflowExample(): Promise<{
    user: string;
    librariesCount: number;
    targetLibrary: string;
    uploadSuccess: boolean;
    permissions: number;
    timestamp: string;
}>;
/**
 * 错误恢复链示例
 * 展示如何在链式调用中处理错误并进行恢复
 */
declare function errorRecoveryChainExample(): Promise<({
    operation: string;
    success: boolean;
    result: any;
    fallbackSuccess?: undefined;
    error?: undefined;
} | {
    operation: string;
    success: boolean;
    fallbackSuccess: boolean;
    result: any;
    error?: undefined;
} | {
    operation: string;
    success: boolean;
    fallbackSuccess: boolean;
    error: any;
    result?: undefined;
})[]>;
/**
 * 并发操作链示例
 * 展示如何在链式调用中进行并发操作
 */
declare function concurrentOperationsExample(): Promise<{
    userInfo: null;
    libraries: never[];
    permissions: never[];
    systemInfo: null;
    delayedOp: null;
    successful: number;
    failed: number;
    duration: number;
}>;
/**
 * 条件链示例
 * 根据条件动态构建操作链
 */
declare function conditionalChainExample(): Promise<{
    userInfo: import("mira-server-sdk").UserInfo;
    operations: string[];
}>;
export { complexWorkflowExample, errorRecoveryChainExample, concurrentOperationsExample, conditionalChainExample };
//# sourceMappingURL=chain-operations.d.ts.map