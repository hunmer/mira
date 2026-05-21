/**
 * 简化的测试环境配置
 */

// 设置 Jest 测试环境
module.exports = {
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    testEnvironment: 'node',
};
