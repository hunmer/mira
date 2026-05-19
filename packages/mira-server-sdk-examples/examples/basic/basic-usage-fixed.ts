/**
 * 基本使用示例（简化版）
 * 演示 Mira SDK 的基本功能和常见用法
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
 * 快速开始示例
 */
async function quickStartExample() {
    console.log(chalk.blue('🚀 快速开始示例'));
    console.log(chalk.gray('='.repeat(50)));

    try {
        // 1. 创建客户端
        console.log(chalk.yellow('1. 创建 Mira 客户端...'));
        const client = new MiraClient(SERVER_URL);
        console.log(chalk.green('✅ 客户端创建成功'));

        // 2. 登录
        console.log(chalk.yellow('2. 用户登录...'));
        await client.auth().login(USERNAME, PASSWORD);
        console.log(chalk.green('✅ 登录成功'));

        // 3. 获取用户信息
        console.log(chalk.yellow('3. 获取用户信息...'));
        const userInfo = await client.user().getInfo();
        console.log(chalk.green(`✅ 用户: ${userInfo.username} (${userInfo.realName})`));

        // 4. 获取素材库列表
        console.log(chalk.yellow('4. 获取素材库列表...'));
        const libraries = await client.libraries().getAll();
        console.log(chalk.green(`✅ 找到 ${libraries.length} 个素材库`));

        // 5. 获取系统健康状态
        console.log(chalk.yellow('5. 获取系统健康状态...'));
        const systemHealth = await client.system().getHealth();
        console.log(chalk.green(`✅ 系统状态: ${systemHealth.status}`));

        // 6. 登出
        console.log(chalk.yellow('6. 用户登出...'));
        await client.auth().logout();
        console.log(chalk.green('✅ 登出成功'));

        console.log(chalk.bold.green('\n🎉 快速开始示例完成!'));

    } catch (error) {
        console.error(chalk.red('❌ 快速开始失败:'), error);
        throw error;
    }
}

/**
 * 素材库管理示例
 */
async function libraryManagementExample() {
    console.log(chalk.blue('\n📚 素材库管理示例'));
    console.log(chalk.gray('='.repeat(50)));

    const client = new MiraClient(SERVER_URL);

    try {
        // 登录
        await client.auth().login(USERNAME, PASSWORD);

        // 获取所有素材库
        console.log(chalk.yellow('获取素材库列表...'));
        const libraries = await client.libraries().getAll();

        console.log(chalk.green(`✅ 总共 ${libraries.length} 个素材库:`));
        libraries.forEach((lib: any, index: number) => {
            console.log(`  ${index + 1}. ${lib.name} (${lib.type}) - ${lib.status}`);
            console.log(`     路径: ${lib.path}`);
            console.log(`     文件数: ${lib.fileCount}, 大小: ${lib.size} bytes`);
        });

        // 如果有素材库，演示详细操作
        if (libraries.length > 0) {
            const firstLibrary = libraries[0];

            console.log(chalk.yellow(`\n获取素材库详情: ${firstLibrary.name}...`));
            const libraryDetail = await client.libraries().getById(firstLibrary.id);
            console.log(chalk.green('✅ 素材库详情:'));
            console.log(`  ID: ${libraryDetail.id}`);
            console.log(`  名称: ${libraryDetail.name}`);
            console.log(`  描述: ${libraryDetail.description}`);
            console.log(`  创建时间: ${libraryDetail.createdAt}`);
            console.log(`  更新时间: ${libraryDetail.updatedAt}`);

            // 尝试启动素材库服务
            if (libraryDetail.status === 'inactive') {
                console.log(chalk.yellow(`启动素材库服务: ${firstLibrary.name}...`));
                try {
                    await client.libraries().start(firstLibrary.id);
                    console.log(chalk.green('✅ 素材库服务启动成功'));
                } catch (error: any) {
                    console.log(chalk.yellow('⚠️  素材库启动失败:'), error.message);
                }
            }

            // 获取素材库基本信息
            console.log(chalk.yellow('获取素材库基本信息...'));
            try {
                console.log(chalk.green('✅ 基本信息:'));
                console.log(`  文件总数: ${firstLibrary.fileCount || 'N/A'}`);
                console.log(`  总大小: ${firstLibrary.size || 'N/A'} bytes`);
                console.log(`  类型: ${firstLibrary.type}`);
            } catch (error: any) {
                console.log(chalk.yellow('⚠️  获取统计失败:'), error.message);
            }
        }

        await client.auth().logout();

    } catch (error) {
        console.error(chalk.red('❌ 素材库管理失败:'), error);
        throw error;
    }
}

/**
 * 用户管理示例
 */
async function userManagementExample() {
    console.log(chalk.blue('\n👤 用户管理示例'));
    console.log(chalk.gray('='.repeat(50)));

    const client = new MiraClient(SERVER_URL);

    try {
        // 登录
        await client.auth().login(USERNAME, PASSWORD);

        // 获取当前用户信息
        console.log(chalk.yellow('获取当前用户信息...'));
        const userInfo = await client.user().getInfo();
        console.log(chalk.green('✅ 当前用户:'));
        console.log(`  用户名: ${userInfo.username}`);
        console.log(`  真实姓名: ${userInfo.realName}`);
        console.log(`  角色: ${userInfo.roles.join(', ')}`);
        console.log(`  描述: ${userInfo.desc}`);
        console.log(`  头像: ${userInfo.avatar}`);
        console.log(`  主页路径: ${userInfo.homePath}`);

        // 获取用户权限码
        console.log(chalk.yellow('获取用户权限...'));
        const permissions = await client.auth().getCodes();
        console.log(chalk.green(`✅ 用户权限 (${permissions.length} 个):`));
        permissions.slice(0, 10).forEach((code: string, index: number) => {
            console.log(`  ${index + 1}. ${code}`);
        });
        if (permissions.length > 10) {
            console.log(`  ... 还有 ${permissions.length - 10} 个权限`);
        }

        await client.auth().logout();

    } catch (error) {
        console.error(chalk.red('❌ 用户管理失败:'), error);
        throw error;
    }
}

/**
 * 系统监控示例
 */
async function systemMonitoringExample() {
    console.log(chalk.blue('\n🖥️  系统监控示例'));
    console.log(chalk.gray('='.repeat(50)));

    const client = new MiraClient(SERVER_URL);

    try {
        // 登录
        await client.auth().login(USERNAME, PASSWORD);

        // 获取系统健康状态
        console.log(chalk.yellow('获取系统健康状态...'));
        const systemHealth = await client.system().getHealth();
        console.log(chalk.green('✅ 系统健康状态:'));
        console.log(`  状态: ${systemHealth.status}`);
        console.log(`  运行时间: ${systemHealth.uptime || 'N/A'} 秒`);
        console.log(`  时间戳: ${systemHealth.timestamp || 'N/A'}`);

        // 检查服务器可用性
        console.log(chalk.yellow('检查服务器可用性...'));
        const isAvailable = await client.system().isServerAvailable();
        console.log(chalk.green(`✅ 服务器可用性: ${isAvailable ? '可用' : '不可用'}`));

        await client.auth().logout();

    } catch (error) {
        console.error(chalk.red('❌ 系统监控失败:'), error);
        throw error;
    }
}

/**
 * 设备管理示例
 */
async function deviceManagementExample() {
    console.log(chalk.blue('\n📱 设备管理示例'));
    console.log(chalk.gray('='.repeat(50)));

    const client = new MiraClient(SERVER_URL);

    try {
        // 登录
        await client.auth().login(USERNAME, PASSWORD);

        // 获取设备列表
        console.log(chalk.yellow('获取设备列表...'));
        try {
            const devices = await client.devices().getAll();
            console.log(chalk.green(`✅ 设备管理功能可用`));
            console.log(`  设备响应类型: ${typeof devices}`);

            // 如果设备响应是数组，显示设备信息
            if (Array.isArray(devices)) {
                console.log(`  设备数量: ${devices.length}`);
                devices.slice(0, 5).forEach((device: any, index: number) => {
                    console.log(`  ${index + 1}. 设备: ${device.name || 'Unknown'}`);
                });
            } else {
                console.log(`  设备数据: ${JSON.stringify(devices, null, 2)}`);
            }

        } catch (error: any) {
            console.log(chalk.yellow('⚠️  设备管理功能不可用:'), error.message);
        }

        await client.auth().logout();

    } catch (error) {
        console.error(chalk.red('❌ 设备管理失败:'), error);
        throw error;
    }
}

/**
 * 主函数
 */
async function main() {
    console.log(chalk.bold.cyan('🚀 Mira SDK 基本使用示例集合\n'));

    try {
        await quickStartExample();
        await libraryManagementExample();
        await userManagementExample();
        await systemMonitoringExample();
        await deviceManagementExample();

        console.log(chalk.bold.green('\n🎉 所有基本示例执行完成!'));

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
    quickStartExample,
    libraryManagementExample,
    userManagementExample,
    systemMonitoringExample,
    deviceManagementExample
};
