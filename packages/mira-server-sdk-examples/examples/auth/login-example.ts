/**
 * 登录示例
 * 演示如何使用 Mira SDK 进行用户认证
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
 * 基本登录示例
 */
async function basicLoginExample() {
    console.log(chalk.blue('🔐 基本登录示例'));
    console.log(chalk.gray('='.repeat(50)));

    try {
        // 创建客户端实例
        const client = new MiraClient(SERVER_URL);

        console.log(`连接到服务器: ${SERVER_URL}`);
        console.log(`用户名: ${USERNAME}`);

        // 执行登录
        console.log(chalk.yellow('正在登录...'));
        const loginResult = await client.auth().login(USERNAME, PASSWORD);

        console.log(chalk.green('✅ 登录成功!'));
        console.log(`访问令牌: ${loginResult.accessToken.substring(0, 20)}...`);

        // 验证令牌
        console.log(chalk.yellow('验证令牌...'));
        const verifyResult = await client.auth().verify();

        console.log(chalk.green('✅ 令牌验证成功!'));
        console.log(`用户信息: ${verifyResult.user.username} (${verifyResult.user.realName || 'N/A'})`);
        console.log(`用户角色: ${verifyResult.user.roles ? verifyResult.user.roles.join(', ') : 'N/A'}`);

        // 获取权限码
        console.log(chalk.yellow('获取权限码...'));
        const codes = await client.auth().getCodes();
        console.log(`权限码: ${Array.isArray(codes) ? codes.join(', ') : codes}`);

        // 登出
        console.log(chalk.yellow('登出...'));
        await client.auth().logout();
        console.log(chalk.green('✅ 成功登出'));

    } catch (error) {
        console.error(chalk.red('❌ 登录失败:'), error);
        throw error;
    }
}

/**
 * 链式调用登录示例
 */
async function chainedLoginExample() {
    console.log(chalk.blue('\n🔗 链式调用登录示例'));
    console.log(chalk.gray('='.repeat(50)));

    try {
        const client = new MiraClient(SERVER_URL);

        // 链式调用：登录 -> 获取用户信息 -> 获取权限码
        console.log(chalk.yellow('执行链式调用...'));

        const result = await client
            .auth()
            .login(USERNAME, PASSWORD)
            .then(async (loginResult) => {
                console.log(chalk.green('✅ 链式登录成功'));

                // 获取用户信息
                const userInfo = await client.user().getInfo();
                console.log(`用户信息: ${userInfo.username}`);

                // 获取权限码
                const codes = await client.auth().getCodes();
                console.log(`权限数量: ${codes.length}`);

                return {
                    login: loginResult,
                    user: userInfo,
                    codes
                };
            });

        console.log(chalk.green('✅ 链式操作完成'));
        console.log(`最终结果: 用户 ${result.user.username} 拥有 ${result.codes.length} 个权限`);

        // 清理
        await client.auth().logout();

    } catch (error) {
        console.error(chalk.red('❌ 链式登录失败:'), error);
        throw error;
    }
}

/**
 * 错误处理示例
 */
async function errorHandlingExample() {
    console.log(chalk.blue('\n⚠️  错误处理示例'));
    console.log(chalk.gray('='.repeat(50)));

    const client = new MiraClient(SERVER_URL);

    // 测试错误的用户名密码
    try {
        console.log(chalk.yellow('测试错误的登录凭据...'));
        await client.auth().login('wrong_user', 'wrong_password');
    } catch (error) {
        console.log(chalk.yellow('✅ 正确捕获了登录错误:'), (error as Error).message);
    }

    // 测试未认证的请求
    try {
        console.log(chalk.yellow('测试未认证的请求...'));
        await client.auth().verify();
    } catch (error) {
        console.log(chalk.yellow('✅ 正确捕获了认证错误:'), (error as Error).message);
    }

    // 测试无效令牌
    try {
        console.log(chalk.yellow('测试无效令牌...'));
        client.auth().setToken('invalid_token');
        await client.auth().verify();
    } catch (error) {
        console.log(chalk.yellow('✅ 正确捕获了无效令牌错误:'), (error as Error).message);
    }
}

/**
 * 令牌管理示例
 */
async function tokenManagementExample() {
    console.log(chalk.blue('\n🎫 令牌管理示例'));
    console.log(chalk.gray('='.repeat(50)));

    const client = new MiraClient(SERVER_URL);

    try {
        // 检查认证状态
        console.log(`认证状态: ${client.auth().isAuthenticated() ? '已认证' : '未认证'}`);

        // 登录并获取令牌
        const loginResult = await client.auth().login(USERNAME, PASSWORD);
        console.log(`认证状态: ${client.auth().isAuthenticated() ? '已认证' : '未认证'}`);

        // 手动设置令牌
        const savedToken = loginResult.accessToken;
        client.auth().clearToken();
        console.log(`认证状态: ${client.auth().isAuthenticated() ? '已认证' : '未认证'}`);

        client.auth().setToken(savedToken);
        console.log(`认证状态: ${client.auth().isAuthenticated() ? '已认证' : '未认证'}`);

        // 验证恢复的令牌
        const verifyResult = await client.auth().verify();
        console.log(chalk.green('✅ 令牌恢复成功:'), verifyResult.user.username);

        // 最终清理
        await client.auth().logout();

    } catch (error) {
        console.error(chalk.red('❌ 令牌管理失败:'), error);
        throw error;
    }
}

/**
 * 主函数
 */
async function main() {
    console.log(chalk.bold.cyan('🚀 Mira SDK 登录示例集合\n'));

    try {
        await basicLoginExample();
        await chainedLoginExample();
        await errorHandlingExample();
        await tokenManagementExample();

        console.log(chalk.bold.green('\n🎉 所有登录示例执行完成!'));

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
    basicLoginExample,
    chainedLoginExample,
    errorHandlingExample,
    tokenManagementExample
};
