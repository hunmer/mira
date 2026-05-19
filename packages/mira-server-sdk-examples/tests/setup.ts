/**
 * 测试环境设置
 */

import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 设置测试超时时间
jest.setTimeout(30000);

// 声明全局测试配置类型
declare global {
    var testConfig: {
        serverUrl: string;
        username: string;
        password: string;
        libraryId: string;
        enableIntegrationTests: boolean;
    };
}

// 全局测试配置
(global as any).testConfig = {
    serverUrl: process.env.MIRA_SERVER_URL || 'http://localhost:8081',
    username: process.env.MIRA_USERNAME || 'admin',
    password: process.env.MIRA_PASSWORD || 'admin123',
    libraryId: process.env.MIRA_LIBRARY_ID || 'default-library',
    enableIntegrationTests: process.env.ENABLE_INTEGRATION_TESTS === 'true'
};

// 在测试开始前的全局设置
beforeAll(async () => {
    console.log('🔧 设置测试环境...');
    console.log(`服务器地址: ${(global as any).testConfig.serverUrl}`);
    console.log(`集成测试: ${(global as any).testConfig.enableIntegrationTests ? '启用' : '禁用'}`);
});

// 在所有测试完成后的清理
afterAll(async () => {
    console.log('🧹 清理测试环境...');
});
