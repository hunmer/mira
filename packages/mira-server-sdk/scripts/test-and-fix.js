#!/usr/bin/env node

/**
 * SDK 自动测试和修复脚本
 * 
 * 此脚本会：
 * 1. 检查 SDK 的基本功能
 * 2. 运行简单的集成测试
 * 3. 检测常见问题并尝试自动修复
 * 4. 生成测试报告
 */

const { MiraClient } = require('../dist/index');
const fs = require('fs');
const path = require('path');

class SDKTester {
    constructor() {
        this.testResults = [];
        this.errors = [];
        this.client = null;
        this.serverURL = process.env.MIRA_SERVER_URL || 'http://localhost:8081';
    }

    /**
     * 记录测试结果
     */
    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, message, type };

        console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
        this.testResults.push(logEntry);
    }

    /**
     * 记录错误
     */
    error(message, error = null) {
        const timestamp = new Date().toISOString();
        const errorEntry = {
            timestamp,
            message,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : null
        };

        console.error(`[${timestamp}] [ERROR] ${message}`);
        if (error) {
            console.error(error);
        }

        this.errors.push(errorEntry);
    }

    /**
     * 测试客户端创建
     */
    async testClientCreation() {
        this.log('测试客户端创建...');

        try {
            this.client = new MiraClient(this.serverURL);

            // 检查所有模块是否可访问
            const modules = [
                'auth', 'user', 'libraries', 'plugins',
                'files', 'database', 'devices', 'system'
            ];

            for (const moduleName of modules) {
                const module = this.client[moduleName]();
                if (!module) {
                    throw new Error(`模块 ${moduleName} 未正确初始化`);
                }
            }

            this.log('✅ 客户端创建成功，所有模块正常');
            return true;

        } catch (error) {
            this.error('❌ 客户端创建失败', error);
            return false;
        }
    }

    /**
     * 测试服务器连接
     */
    async testServerConnection() {
        this.log('测试服务器连接...');

        try {
            const isConnected = await this.client.isConnected();

            if (isConnected) {
                this.log('✅ 服务器连接正常');

                // 获取服务器信息
                const health = await this.client.system().getHealth();
                this.log(`服务器版本: ${health.version}`);
                this.log(`运行时间: ${Math.floor(health.uptime / 60)} 分钟`);

                return true;
            } else {
                this.log('⚠️ 服务器未响应，尝试等待服务器启动...');

                const serverReady = await this.client.waitForServer(10000, 1000);
                if (serverReady) {
                    this.log('✅ 服务器已就绪');
                    return true;
                } else {
                    this.error('❌ 服务器连接超时');
                    return false;
                }
            }

        } catch (error) {
            this.error('❌ 服务器连接测试失败', error);
            return false;
        }
    }

    /**
     * 测试基本 API 功能
     */
    async testBasicAPI() {
        this.log('测试基本 API 功能...');

        try {
            // 测试系统 API
            const health = await this.client.system().getHealth();
            if (!health || !health.status) {
                throw new Error('健康检查 API 返回数据格式错误');
            }
            this.log('✅ 系统 API 正常');

            // 测试认证 API（不需要实际登录）
            try {
                await this.client.auth().verify();
            } catch (error) {
                // 预期的错误，表示 API 正常工作
                if (error.error === 'UNAUTHORIZED' || error.message.includes('token')) {
                    this.log('✅ 认证 API 正常（未登录状态）');
                } else {
                    throw error;
                }
            }

            this.log('✅ 基本 API 功能正常');
            return true;

        } catch (error) {
            this.error('❌ 基本 API 测试失败', error);
            return false;
        }
    }

    /**
     * 测试链式调用
     */
    async testChainedCalls() {
        this.log('测试链式调用...');

        try {
            // 测试简单的链式调用
            const client = this.client
                .setToken('test-token')
                .clearToken()
                .setToken('another-token');

            if (client !== this.client) {
                throw new Error('链式调用未返回正确的客户端实例');
            }

            this.log('✅ 链式调用正常');
            return true;

        } catch (error) {
            this.error('❌ 链式调用测试失败', error);
            return false;
        }
    }

    /**
     * 测试错误处理
     */
    async testErrorHandling() {
        this.log('测试错误处理...');

        try {
            // 测试 safe 方法
            const fallbackValue = { test: 'fallback' };
            const result = await this.client.safe(
                () => Promise.reject(new Error('Test error')),
                fallbackValue
            );

            if (result !== fallbackValue) {
                throw new Error('safe 方法未正确处理错误');
            }

            // 测试 retry 方法
            let callCount = 0;
            await this.client.retry(
                () => {
                    callCount++;
                    if (callCount < 2) {
                        return Promise.reject(new Error('Test retry'));
                    }
                    return Promise.resolve('success');
                },
                3,
                100
            );

            if (callCount !== 2) {
                throw new Error('retry 方法重试次数不正确');
            }

            this.log('✅ 错误处理正常');
            return true;

        } catch (error) {
            this.error('❌ 错误处理测试失败', error);
            return false;
        }
    }

    /**
     * 测试批量操作
     */
    async testBatchOperations() {
        this.log('测试批量操作...');

        try {
            const operations = [
                () => Promise.resolve('result1'),
                () => Promise.resolve('result2'),
                () => Promise.resolve('result3'),
            ];

            const results = await this.client.batch(operations);

            if (results.length !== 3 || results[0] !== 'result1') {
                throw new Error('批量操作结果不正确');
            }

            this.log('✅ 批量操作正常');
            return true;

        } catch (error) {
            this.error('❌ 批量操作测试失败', error);
            return false;
        }
    }

    /**
     * 检查常见问题并尝试修复
     */
    async checkAndFix() {
        this.log('检查常见问题...');

        const issues = [];
        const fixes = [];

        // 检查网络连接
        try {
            await this.client.system().isServerAvailable();
        } catch (error) {
            issues.push('网络连接问题');
            fixes.push('建议检查服务器是否启动，网络是否正常');
        }

        // 检查配置
        const config = this.client.getConfig();
        if (!config.baseURL) {
            issues.push('缺少服务器地址配置');
            fixes.push('请设置正确的服务器地址');
        }

        if (config.timeout && config.timeout < 5000) {
            issues.push('超时时间可能过短');
            fixes.push('建议将超时时间设置为至少5秒');
        }

        if (issues.length > 0) {
            this.log(`发现 ${issues.length} 个潜在问题:`);
            issues.forEach((issue, index) => {
                this.log(`  ${index + 1}. ${issue}`);
                this.log(`     修复建议: ${fixes[index]}`);
            });
        } else {
            this.log('✅ 未发现明显问题');
        }

        return { issues, fixes };
    }

    /**
     * 生成测试报告
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            serverURL: this.serverURL,
            summary: {
                totalTests: this.testResults.length,
                errors: this.errors.length,
                success: this.errors.length === 0
            },
            testResults: this.testResults,
            errors: this.errors
        };

        const reportPath = path.join(__dirname, 'test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        this.log(`测试报告已生成: ${reportPath}`);
        return report;
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        this.log('开始 SDK 测试...');

        const tests = [
            this.testClientCreation.bind(this),
            this.testServerConnection.bind(this),
            this.testBasicAPI.bind(this),
            this.testChainedCalls.bind(this),
            this.testErrorHandling.bind(this),
            this.testBatchOperations.bind(this),
        ];

        let passedTests = 0;

        for (const test of tests) {
            try {
                const success = await test();
                if (success) {
                    passedTests++;
                }
            } catch (error) {
                this.error(`测试执行失败`, error);
            }
        }

        // 检查问题并提供修复建议
        await this.checkAndFix();

        // 生成报告
        const report = this.generateReport();

        // 输出汇总信息
        this.log(`\n测试完成! 通过: ${passedTests}/${tests.length}, 错误: ${this.errors.length}`);

        if (this.errors.length === 0) {
            this.log('🎉 所有测试通过! SDK 工作正常');
        } else {
            this.log('⚠️ 部分测试失败，请查看详细错误信息');
        }

        return report;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const tester = new SDKTester();
    tester.runAllTests()
        .then((report) => {
            process.exit(report.summary.success ? 0 : 1);
        })
        .catch((error) => {
            console.error('测试脚本执行失败:', error);
            process.exit(1);
        });
}

module.exports = SDKTester;
