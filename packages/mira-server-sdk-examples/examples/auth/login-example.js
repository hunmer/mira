"use strict";
/**
 * 登录示例
 * 演示如何使用 Mira SDK 进行用户认证
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.basicLoginExample = basicLoginExample;
exports.chainedLoginExample = chainedLoginExample;
exports.errorHandlingExample = errorHandlingExample;
exports.tokenManagementExample = tokenManagementExample;
const mira_server_sdk_1 = require("mira-server-sdk");
const dotenv = __importStar(require("dotenv"));
const chalk_1 = __importDefault(require("chalk"));
// 加载环境变量
dotenv.config();
const SERVER_URL = process.env.MIRA_SERVER_URL || 'http://localhost:8081';
const USERNAME = process.env.MIRA_USERNAME || 'admin';
const PASSWORD = process.env.MIRA_PASSWORD || 'admin123';
/**
 * 基本登录示例
 */
async function basicLoginExample() {
    console.log(chalk_1.default.blue('🔐 基本登录示例'));
    console.log(chalk_1.default.gray('='.repeat(50)));
    try {
        // 创建客户端实例
        const client = new mira_server_sdk_1.MiraClient(SERVER_URL);
        console.log(`连接到服务器: ${SERVER_URL}`);
        console.log(`用户名: ${USERNAME}`);
        // 执行登录
        console.log(chalk_1.default.yellow('正在登录...'));
        const loginResult = await client.auth().login(USERNAME, PASSWORD);
        console.log(chalk_1.default.green('✅ 登录成功!'));
        console.log(`访问令牌: ${loginResult.accessToken.substring(0, 20)}...`);
        // 验证令牌
        console.log(chalk_1.default.yellow('验证令牌...'));
        const verifyResult = await client.auth().verify();
        console.log(chalk_1.default.green('✅ 令牌验证成功!'));
        console.log(`用户信息: ${verifyResult.user.username} (${verifyResult.user.realName})`);
        console.log(`用户角色: ${verifyResult.user.roles.join(', ')}`);
        // 获取权限码
        console.log(chalk_1.default.yellow('获取权限码...'));
        const codes = await client.auth().getCodes();
        console.log(`权限码: ${codes.join(', ')}`);
        // 登出
        console.log(chalk_1.default.yellow('登出...'));
        await client.auth().logout();
        console.log(chalk_1.default.green('✅ 成功登出'));
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ 登录失败:'), error);
        throw error;
    }
}
/**
 * 链式调用登录示例
 */
async function chainedLoginExample() {
    console.log(chalk_1.default.blue('\n🔗 链式调用登录示例'));
    console.log(chalk_1.default.gray('='.repeat(50)));
    try {
        const client = new mira_server_sdk_1.MiraClient(SERVER_URL);
        // 链式调用：登录 -> 获取用户信息 -> 获取权限码
        console.log(chalk_1.default.yellow('执行链式调用...'));
        const result = await client
            .auth()
            .login(USERNAME, PASSWORD)
            .then(async (loginResult) => {
            console.log(chalk_1.default.green('✅ 链式登录成功'));
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
        console.log(chalk_1.default.green('✅ 链式操作完成'));
        console.log(`最终结果: 用户 ${result.user.username} 拥有 ${result.codes.length} 个权限`);
        // 清理
        await client.auth().logout();
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ 链式登录失败:'), error);
        throw error;
    }
}
/**
 * 错误处理示例
 */
async function errorHandlingExample() {
    console.log(chalk_1.default.blue('\n⚠️  错误处理示例'));
    console.log(chalk_1.default.gray('='.repeat(50)));
    const client = new mira_server_sdk_1.MiraClient(SERVER_URL);
    // 测试错误的用户名密码
    try {
        console.log(chalk_1.default.yellow('测试错误的登录凭据...'));
        await client.auth().login('wrong_user', 'wrong_password');
    }
    catch (error) {
        console.log(chalk_1.default.orange('✅ 正确捕获了登录错误:'), error.message);
    }
    // 测试未认证的请求
    try {
        console.log(chalk_1.default.yellow('测试未认证的请求...'));
        await client.auth().verify();
    }
    catch (error) {
        console.log(chalk_1.default.orange('✅ 正确捕获了认证错误:'), error.message);
    }
    // 测试无效令牌
    try {
        console.log(chalk_1.default.yellow('测试无效令牌...'));
        client.auth().setToken('invalid_token');
        await client.auth().verify();
    }
    catch (error) {
        console.log(chalk_1.default.orange('✅ 正确捕获了无效令牌错误:'), error.message);
    }
}
/**
 * 令牌管理示例
 */
async function tokenManagementExample() {
    console.log(chalk_1.default.blue('\n🎫 令牌管理示例'));
    console.log(chalk_1.default.gray('='.repeat(50)));
    const client = new mira_server_sdk_1.MiraClient(SERVER_URL);
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
        console.log(chalk_1.default.green('✅ 令牌恢复成功:'), verifyResult.user.username);
        // 最终清理
        await client.auth().logout();
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ 令牌管理失败:'), error);
        throw error;
    }
}
/**
 * 主函数
 */
async function main() {
    console.log(chalk_1.default.bold.cyan('🚀 Mira SDK 登录示例集合\n'));
    try {
        await basicLoginExample();
        await chainedLoginExample();
        await errorHandlingExample();
        await tokenManagementExample();
        console.log(chalk_1.default.bold.green('\n🎉 所有登录示例执行完成!'));
    }
    catch (error) {
        console.error(chalk_1.default.bold.red('\n💥 示例执行失败:'), error);
        process.exit(1);
    }
}
// 如果直接运行此文件
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=login-example.js.map