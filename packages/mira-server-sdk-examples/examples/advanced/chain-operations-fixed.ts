/**
 * 高级链式操作示例（简化版）
 * 演示复杂的链式调用和错误处理模式
 */

import { MiraClient } from 'mira-server-sdk';
import * as dotenv from 'dotenv';
import chalk from 'chalk';

// 加载环境变量
dotenv.config();

const SERVER_URL = process.env.MIRA_SERVER_URL || 'http://localhost:8081';
const USERNAME = process.env.MIRA_USERNAME || 'admin';
const PASSWORD = process.env.MIRA_PASSWORD || 'admin123';

/**
 * 复杂工作流示例
 * 展示登录 -> 创建素材库 -> 启动服务 -> 上传文件 -> 验证的完整流程
 */
async function complexWorkflowExample() {
    console.log(chalk.blue('🔗 复杂工作流链式操作示例'));
    console.log(chalk.gray('='.repeat(50)));

    const client = new MiraClient(SERVER_URL);

    try {
        const workflowResult = await client
            .auth()
            .login(USERNAME, PASSWORD)
            .then(async (loginResult) => {
                console.log(chalk.green('✅ 步骤1: 登录成功'));
                console.log(`  令牌: ${loginResult.accessToken.substring(0, 20)}...`);

                // 获取用户信息
                const userInfo = await client.user().getInfo();
                console.log(`  用户: ${userInfo.username} (${userInfo.realName})`);

                return { login: loginResult, user: userInfo };
            })
            .then(async (context) => {
                console.log(chalk.yellow('📚 步骤2: 管理素材库...'));

                // 获取素材库列表
                const libraries = await client.libraries().getAll();
                console.log(chalk.green(`✅ 找到 ${libraries.length} 个素材库`));

                // 选择第一个素材库进行操作
                let targetLibrary = null;
                if (libraries.length > 0) {
                    targetLibrary = libraries[0];
                    console.log(`  选择库: ${targetLibrary.name} (${targetLibrary.status})`);

                    // 如果库未激活，尝试启动
                    if (targetLibrary.status === 'inactive') {
                        console.log(chalk.yellow('  启动素材库服务...'));
                        try {
                            await client.libraries().start(targetLibrary.id);
                            console.log(chalk.green('  ✅ 素材库启动成功'));
                        } catch (error: any) {
                            console.log(chalk.yellow(`  ⚠️  启动失败: ${error.message}`));
                        }
                    }

                    // 获取库基本信息
                    try {
                        console.log(`  统计: ${targetLibrary.fileCount || 0} 文件, ${targetLibrary.size || 0} bytes`);
                    } catch (error: any) {
                        console.log(chalk.yellow(`  ⚠️  统计获取失败: ${error.message}`));
                    }
                }

                return { ...context, libraries, targetLibrary };
            })
            .then(async (context) => {
                console.log(chalk.yellow('📁 步骤3: 文件操作...'));

                if (!context.targetLibrary) {
                    console.log(chalk.yellow('  ⚠️  跳过文件操作: 没有可用的素材库'));
                    return context;
                }

                // 创建测试文件
                const testContent = `高级工作流测试文件
用户: ${context.user.username}
库: ${context.targetLibrary.name}
时间: ${new Date().toISOString()}
工作流ID: ${Math.random().toString(36).substring(2)}`;

                const testFile = new File([testContent], 'workflow-test.txt', {
                    type: 'text/plain'
                });

                try {
                    console.log(chalk.yellow('  上传测试文件...'));
                    const uploadResult = await client.files().uploadFile(
                        testFile,
                        context.targetLibrary.id,
                        {
                            sourcePath: '/workflow-test',
                            tags: ['workflow', 'test', 'advanced']
                        }
                    );

                    console.log(chalk.green('  ✅ 文件上传成功'));
                    console.log(`    文件ID: ${(uploadResult as any).fileId || 'N/A'}`);

                    return { ...context, uploadResult };

                } catch (error: any) {
                    console.log(chalk.red(`  ❌ 文件上传失败: ${error.message}`));
                    return { ...context, uploadError: error };
                }
            })
            .then(async (context) => {
                console.log(chalk.yellow('🔍 步骤4: 验证和清理...'));

                // 验证用户权限
                const permissions = await client.auth().getCodes();
                console.log(chalk.green(`✅ 用户权限验证: ${permissions.length} 个权限`));

                // 获取系统健康状态
                try {
                    const systemHealth = await client.system().getHealth();
                    console.log(chalk.green(`✅ 系统健康状态: ${systemHealth.status}`));
                } catch (error: any) {
                    console.log(chalk.yellow(`⚠️  系统信息获取失败: ${error.message}`));
                }

                // 工作流总结
                const summary = {
                    user: context.user.username,
                    librariesCount: context.libraries.length,
                    targetLibrary: context.targetLibrary?.name || 'N/A',
                    uploadSuccess: !!(context as any).uploadResult,
                    permissions: permissions.length,
                    timestamp: new Date().toISOString()
                };

                console.log(chalk.green('✅ 工作流完成总结:'));
                console.log(JSON.stringify(summary, null, 2));

                return summary;
            })
            .catch(async (error) => {
                console.error(chalk.red('❌ 工作流执行失败:'), error);

                // 尝试获取用户信息以进行错误分析
                try {
                    const userInfo = await client.user().getInfo();
                    console.log(`  当前用户: ${userInfo.username}`);
                } catch (e) {
                    console.log('  无法获取用户信息，可能未登录');
                }

                throw error;
            })
            .finally(async () => {
                // 确保清理资源
                try {
                    await client.auth().logout();
                    console.log(chalk.green('✅ 清理完成: 已登出'));
                } catch (error) {
                    console.log(chalk.yellow('⚠️  登出时出现错误'));
                }
            });

        return workflowResult;

    } catch (error) {
        console.error(chalk.red('❌ 复杂工作流失败:'), error);
        throw error;
    }
}

/**
 * 错误恢复链示例
 * 展示如何在链式调用中处理错误并进行恢复
 */
async function errorRecoveryChainExample() {
    console.log(chalk.blue('\n🛠️  错误恢复链示例'));
    console.log(chalk.gray('='.repeat(50)));

    const client = new MiraClient(SERVER_URL);

    try {
        const result = await client
            .auth()
            .login(USERNAME, PASSWORD)
            .then(async () => {
                console.log(chalk.green('✅ 登录成功'));

                // 故意触发一些错误来演示恢复机制
                const operations = [
                    {
                        name: '获取不存在的素材库',
                        operation: () => client.libraries().getById('non-existent-id'),
                        fallback: () => client.libraries().getAll()
                    },
                    {
                        name: '访问系统健康状态',
                        operation: () => client.system().getHealth(),
                        fallback: () => client.system().getSimpleHealth()
                    },
                    {
                        name: '上传到无效库',
                        operation: () => {
                            const dummyFile = new File(['test'], 'test.txt', { type: 'text/plain' });
                            return client.files().uploadFile(dummyFile, 'invalid-library');
                        },
                        fallback: () => client.libraries().getAll()
                    }
                ];

                const results = [];

                for (const op of operations) {
                    console.log(chalk.yellow(`尝试: ${op.name}...`));

                    try {
                        const result = await op.operation();
                        console.log(chalk.green(`✅ ${op.name} 成功`));
                        results.push({ operation: op.name, success: true, result });
                    } catch (error: any) {
                        console.log(chalk.yellow(`⚠️  ${op.name} 失败: ${error.message}`));
                        console.log(chalk.yellow(`  尝试降级操作...`));

                        try {
                            const fallbackResult = await op.fallback();
                            console.log(chalk.green(`✅ 降级操作成功`));
                            results.push({
                                operation: op.name,
                                success: false,
                                fallbackSuccess: true,
                                result: fallbackResult
                            });
                        } catch (fallbackError: any) {
                            console.log(chalk.red(`❌ 降级操作也失败: ${fallbackError.message}`));
                            results.push({
                                operation: op.name,
                                success: false,
                                fallbackSuccess: false,
                                error: fallbackError.message
                            });
                        }
                    }
                }

                return results;
            });

        console.log(chalk.green('\n✅ 错误恢复链执行完成'));
        console.log('最终结果:');
        result.forEach((item: any, index: number) => {
            console.log(`  ${index + 1}. ${item.operation}: ${item.success ? '成功' : (item.fallbackSuccess ? '降级成功' : '失败')}`);
        });

        await client.auth().logout();
        return result;

    } catch (error) {
        console.error(chalk.red('❌ 错误恢复链失败:'), error);
        throw error;
    }
}

/**
 * 并发操作链示例
 * 展示如何在链式调用中进行并发操作
 */
async function concurrentOperationsExample() {
    console.log(chalk.blue('\n⚡ 并发操作链示例'));
    console.log(chalk.gray('='.repeat(50)));

    const client = new MiraClient(SERVER_URL);

    try {
        const result = await client
            .auth()
            .login(USERNAME, PASSWORD)
            .then(async () => {
                console.log(chalk.green('✅ 登录成功'));
                console.log(chalk.yellow('启动并发操作...'));

                const startTime = Date.now();

                // 并发执行多个独立操作
                const concurrentOps = await Promise.allSettled([
                    client.user().getInfo(),
                    client.libraries().getAll(),
                    client.auth().getCodes(),
                    client.system().getHealth().catch(() => ({ status: 'unknown' })),
                    // 添加一些延迟操作来模拟真实场景
                    new Promise(resolve =>
                        setTimeout(() => resolve({ delayed: true, timestamp: Date.now() }), 1000)
                    )
                ]);

                const endTime = Date.now();
                const duration = endTime - startTime;

                console.log(chalk.green(`✅ 并发操作完成，耗时: ${duration}ms`));

                // 分析结果
                const results = {
                    userInfo: null,
                    libraries: [],
                    permissions: [],
                    systemInfo: null,
                    delayedOp: null,
                    successful: 0,
                    failed: 0,
                    duration
                };

                concurrentOps.forEach((result, index) => {
                    const opNames = ['用户信息', '素材库列表', '权限码', '系统健康', '延迟操作'];

                    if (result.status === 'fulfilled') {
                        console.log(chalk.green(`  ✅ ${opNames[index]}: 成功`));
                        (results as any).successful++;

                        // 分配结果到相应字段
                        switch (index) {
                            case 0: (results as any).userInfo = result.value; break;
                            case 1: (results as any).libraries = result.value; break;
                            case 2: (results as any).permissions = result.value; break;
                            case 3: (results as any).systemInfo = result.value; break;
                            case 4: (results as any).delayedOp = result.value; break;
                        }
                    } else {
                        console.log(chalk.red(`  ❌ ${opNames[index]}: ${(result.reason as Error)?.message || '失败'}`));
                        (results as any).failed++;
                    }
                });

                console.log(chalk.cyan(`\n📊 并发操作统计:`));
                console.log(`  成功: ${(results as any).successful}`);
                console.log(`  失败: ${(results as any).failed}`);
                console.log(`  总时间: ${results.duration}ms`);
                console.log(`  平均每操作: ${Math.round(results.duration / concurrentOps.length)}ms`);

                return results;
            });

        await client.auth().logout();
        return result;

    } catch (error) {
        console.error(chalk.red('❌ 并发操作链失败:'), error);
        throw error;
    }
}

/**
 * 条件链示例
 * 根据条件动态构建操作链
 */
async function conditionalChainExample() {
    console.log(chalk.blue('\n🔀 条件链示例'));
    console.log(chalk.gray('='.repeat(50)));

    const client = new MiraClient(SERVER_URL);

    try {
        const result = await client
            .auth()
            .login(USERNAME, PASSWORD)
            .then(async () => {
                console.log(chalk.green('✅ 登录成功'));

                // 获取用户信息以确定后续操作
                const userInfo = await client.user().getInfo();
                console.log(`用户角色: ${userInfo.roles.join(', ')}`);

                const isAdmin = userInfo.roles.includes('admin') || userInfo.roles.includes('Administrator');
                const operations = { userInfo, operations: [] as string[] };

                if (isAdmin) {
                    console.log(chalk.yellow('检测到管理员权限，执行管理员操作...'));

                    try {
                        const systemHealth = await client.system().getHealth();
                        console.log(chalk.green(`✅ 获取系统健康状态: ${systemHealth.status}`));
                        operations.operations.push('系统健康状态');
                    } catch (error: any) {
                        console.log(chalk.yellow(`⚠️  系统状态获取失败: ${error.message}`));
                    }
                } else {
                    console.log(chalk.yellow('普通用户，执行基本操作...'));
                }

                // 所有用户都可以执行的操作
                try {
                    const libraries = await client.libraries().getAll();
                    console.log(chalk.green(`✅ 获取素材库列表: ${libraries.length} 个`));
                    operations.operations.push('素材库列表');

                    // 如果有素材库，尝试获取第一个的详情
                    if (libraries.length > 0) {
                        const firstLib = libraries[0];
                        try {
                            const libDetail = await client.libraries().getById(firstLib.id);
                            console.log(chalk.green(`✅ 获取库详情: ${libDetail.name}`));
                            operations.operations.push('库详情');
                        } catch (error: any) {
                            console.log(chalk.yellow(`⚠️  库详情获取失败: ${error.message}`));
                        }
                    }
                } catch (error: any) {
                    console.log(chalk.red(`❌ 基本操作失败: ${error.message}`));
                }

                return operations;
            });

        console.log(chalk.green('\n✅ 条件链执行完成'));
        console.log(`执行的操作: ${result.operations.join(', ')}`);

        await client.auth().logout();
        return result;

    } catch (error) {
        console.error(chalk.red('❌ 条件链失败:'), error);
        throw error;
    }
}

/**
 * 主函数
 */
async function main() {
    console.log(chalk.bold.cyan('🚀 Mira SDK 高级链式操作示例集合\n'));

    try {
        await complexWorkflowExample();
        await errorRecoveryChainExample();
        await concurrentOperationsExample();
        await conditionalChainExample();

        console.log(chalk.bold.green('\n🎉 所有高级示例执行完成!'));

    } catch (error) {
        console.error(chalk.bold.red('\n💥 示例执行失败:'), error);
        process.exit(1);
    }
}

// 如果直接运行此文件
if (require.main === module) {
    main().catch(console.error);
}

export {
    complexWorkflowExample,
    errorRecoveryChainExample,
    concurrentOperationsExample,
    conditionalChainExample
};
