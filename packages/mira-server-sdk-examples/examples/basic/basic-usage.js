"use strict";
/**
 * 基本使用示例
 * 演示 Mira SDK 的基本功能和常见用法
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
exports.quickStartExample = quickStartExample;
exports.libraryManagementExample = libraryManagementExample;
exports.userManagementExample = userManagementExample;
exports.systemMonitoringExample = systemMonitoringExample;
exports.deviceManagementExample = deviceManagementExample;
const mira_server_sdk_1 = require("mira-server-sdk");
const dotenv = __importStar(require("dotenv"));
const chalk_1 = __importDefault(require("chalk"));
// 加载环境变量
dotenv.config();
const SERVER_URL = process.env.MIRA_SERVER_URL || 'http://localhost:8081';
const USERNAME = process.env.MIRA_USERNAME || 'admin';
const PASSWORD = process.env.MIRA_PASSWORD || 'admin123';
/**
 * 快速开始示例
 */
async function quickStartExample() {
    console.log(chalk_1.default.blue('🚀 快速开始示例'));
    console.log(chalk_1.default.gray('='.repeat(50)));
    try {
        // 1. 创建客户端
        console.log(chalk_1.default.yellow('1. 创建 Mira 客户端...'));
        const client = new mira_server_sdk_1.MiraClient(SERVER_URL);
        console.log(chalk_1.default.green('✅ 客户端创建成功'));
        // 2. 登录
        console.log(chalk_1.default.yellow('2. 用户登录...'));
        await client.auth().login(USERNAME, PASSWORD);
        console.log(chalk_1.default.green('✅ 登录成功'));
        // 3. 获取用户信息
        console.log(chalk_1.default.yellow('3. 获取用户信息...'));
        const userInfo = await client.user().getInfo();
        console.log(chalk_1.default.green(`✅ 用户: ${userInfo.username} (${userInfo.realName})`));
        // 4. 获取素材库列表
        console.log(chalk_1.default.yellow('4. 获取素材库列表...'));
        const libraries = await client.libraries().getAll();
        console.log(chalk_1.default.green(`✅ 找到 ${libraries.length} 个素材库`));
        // 5. 获取系统信息
        console.log(chalk_1.default.yellow('5. 获取系统信息...'));
        const systemInfo = await client.system().getInfo();
        console.log(chalk_1.default.green(`✅ 系统版本: ${systemInfo.version}`));
        // 6. 登出
        console.log(chalk_1.default.yellow('6. 用户登出...'));
        await client.auth().logout();
        console.log(chalk_1.default.green('✅ 登出成功'));
        console.log(chalk_1.default.bold.green('\n🎉 快速开始示例完成!'));
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ 快速开始失败:'), error);
        throw error;
    }
}
/**
 * 素材库管理示例
 */
async function libraryManagementExample() {
    console.log(chalk_1.default.blue('\n📚 素材库管理示例'));
    console.log(chalk_1.default.gray('='.repeat(50)));
    const client = new mira_server_sdk_1.MiraClient(SERVER_URL);
    try {
        // 登录
        await client.auth().login(USERNAME, PASSWORD);
        // 获取所有素材库
        console.log(chalk_1.default.yellow('获取素材库列表...'));
        const libraries = await client.libraries().getAll();
        console.log(chalk_1.default.green(`✅ 总共 ${libraries.length} 个素材库:`));
        libraries.forEach((lib, index) => {
            console.log(`  ${index + 1}. ${lib.name} (${lib.type}) - ${lib.status}`);
            console.log(`     路径: ${lib.path}`);
            console.log(`     文件数: ${lib.fileCount}, 大小: ${lib.size} bytes`);
        });
        // 如果有素材库，演示详细操作
        if (libraries.length > 0) {
            const firstLibrary = libraries[0];
            console.log(chalk_1.default.yellow(`\n获取素材库详情: ${firstLibrary.name}...`));
            const libraryDetail = await client.libraries().getById(firstLibrary.id);
            console.log(chalk_1.default.green('✅ 素材库详情:'));
            console.log(`  ID: ${libraryDetail.id}`);
            console.log(`  名称: ${libraryDetail.name}`);
            console.log(`  描述: ${libraryDetail.description}`);
            console.log(`  创建时间: ${libraryDetail.createdAt}`);
            console.log(`  更新时间: ${libraryDetail.updatedAt}`);
            // 尝试启动素材库服务
            if (libraryDetail.status === 'inactive') {
                console.log(chalk_1.default.yellow(`启动素材库服务: ${firstLibrary.name}...`));
                try {
                    await client.libraries().start(firstLibrary.id);
                    console.log(chalk_1.default.green('✅ 素材库服务启动成功'));
                }
                catch (error) {
                    console.log(chalk_1.default.orange('⚠️  素材库启动失败:'), error.message);
                }
            }
            // 获取素材库统计信息
            console.log(chalk_1.default.yellow('获取素材库统计信息...'));
            try {
                const stats = await client.libraries().getStats(firstLibrary.id);
                console.log(chalk_1.default.green('✅ 统计信息:'));
                console.log(`  文件总数: ${stats.totalFiles || 'N/A'}`);
                console.log(`  总大小: ${stats.totalSize || 'N/A'} bytes`);
                console.log(`  文件类型: ${stats.fileTypes ? stats.fileTypes.join(', ') : 'N/A'}`);
            }
            catch (error) {
                console.log(chalk_1.default.orange('⚠️  获取统计失败:'), error.message);
            }
        }
        await client.auth().logout();
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ 素材库管理失败:'), error);
        throw error;
    }
}
/**
 * 用户管理示例
 */
async function userManagementExample() {
    console.log(chalk_1.default.blue('\n👤 用户管理示例'));
    console.log(chalk_1.default.gray('='.repeat(50)));
    const client = new mira_server_sdk_1.MiraClient(SERVER_URL);
    try {
        // 登录
        await client.auth().login(USERNAME, PASSWORD);
        // 获取当前用户信息
        console.log(chalk_1.default.yellow('获取当前用户信息...'));
        const userInfo = await client.user().getInfo();
        console.log(chalk_1.default.green('✅ 当前用户:'));
        console.log(`  用户名: ${userInfo.username}`);
        console.log(`  真实姓名: ${userInfo.realName}`);
        console.log(`  角色: ${userInfo.roles.join(', ')}`);
        console.log(`  描述: ${userInfo.desc}`);
        console.log(`  头像: ${userInfo.avatar}`);
        console.log(`  主页路径: ${userInfo.homePath}`);
        // 获取用户权限码
        console.log(chalk_1.default.yellow('获取用户权限...'));
        const permissions = await client.auth().getCodes();
        console.log(chalk_1.default.green(`✅ 用户权限 (${permissions.length} 个):`));
        permissions.slice(0, 10).forEach((code, index) => {
            console.log(`  ${index + 1}. ${code}`);
        });
        if (permissions.length > 10) {
            console.log(`  ... 还有 ${permissions.length - 10} 个权限`);
        }
        // 如果有管理员权限，获取管理员列表
        try {
            console.log(chalk_1.default.yellow('获取管理员列表...'));
            const admins = await client.user().getAdmins();
            console.log(chalk_1.default.green(`✅ 管理员列表 (${admins.length} 个):`));
            admins.forEach((admin, index) => {
                console.log(`  ${index + 1}. ${admin.username} (${admin.email}) - ${admin.role}`);
            });
        }
        catch (error) {
            console.log(chalk_1.default.orange('⚠️  无权限获取管理员列表:'), error.message);
        }
        await client.auth().logout();
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ 用户管理失败:'), error);
        throw error;
    }
}
/**
 * 系统监控示例
 */
async function systemMonitoringExample() {
    console.log(chalk_1.default.blue('\n🖥️  系统监控示例'));
    console.log(chalk_1.default.gray('='.repeat(50)));
    const client = new mira_server_sdk_1.MiraClient(SERVER_URL);
    try {
        // 登录
        await client.auth().login(USERNAME, PASSWORD);
        // 获取系统信息
        console.log(chalk_1.default.yellow('获取系统信息...'));
        const systemInfo = await client.system().getInfo();
        console.log(chalk_1.default.green('✅ 系统信息:'));
        console.log(`  版本: ${systemInfo.version}`);
        console.log(`  环境: ${systemInfo.environment || 'N/A'}`);
        console.log(`  启动时间: ${systemInfo.startTime || 'N/A'}`);
        console.log(`  运行时间: ${systemInfo.uptime || 'N/A'}`);
        // 获取系统状态
        console.log(chalk_1.default.yellow('获取系统状态...'));
        try {
            const status = await client.system().getStatus();
            console.log(chalk_1.default.green('✅ 系统状态:'));
            console.log(`  CPU使用率: ${status.cpu || 'N/A'}%`);
            console.log(`  内存使用: ${status.memory || 'N/A'}`);
            console.log(`  磁盘使用: ${status.disk || 'N/A'}`);
            console.log(`  活跃连接: ${status.connections || 'N/A'}`);
        }
        catch (error) {
            console.log(chalk_1.default.orange('⚠️  获取系统状态失败:'), error.message);
        }
        // 获取配置信息
        console.log(chalk_1.default.yellow('获取配置信息...'));
        try {
            const config = await client.system().getConfig();
            console.log(chalk_1.default.green('✅ 配置信息:'));
            console.log(`  最大上传大小: ${config.maxUploadSize || 'N/A'}`);
            console.log(`  允许的文件类型: ${config.allowedFileTypes ? config.allowedFileTypes.join(', ') : 'N/A'}`);
            console.log(`  默认库路径: ${config.defaultLibraryPath || 'N/A'}`);
        }
        catch (error) {
            console.log(chalk_1.default.orange('⚠️  获取配置失败:'), error.message);
        }
        await client.auth().logout();
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ 系统监控失败:'), error);
        throw error;
    }
}
/**
 * 设备管理示例
 */
async function deviceManagementExample() {
    console.log(chalk_1.default.blue('\n📱 设备管理示例'));
    console.log(chalk_1.default.gray('='.repeat(50)));
    const client = new mira_server_sdk_1.MiraClient(SERVER_URL);
    try {
        // 登录
        await client.auth().login(USERNAME, PASSWORD);
        // 获取设备列表
        console.log(chalk_1.default.yellow('获取设备列表...'));
        try {
            const devices = await client.devices().getAll();
            console.log(chalk_1.default.green(`✅ 设备列表 (${devices.length} 个):`));
            devices.forEach((device, index) => {
                console.log(`  ${index + 1}. ${device.name} (${device.type})`);
                console.log(`     状态: ${device.status}`);
                console.log(`     IP: ${device.ip || 'N/A'}`);
                console.log(`     最后连接: ${device.lastConnected || 'N/A'}`);
            });
            // 如果有设备，获取第一个设备的详细信息
            if (devices.length > 0) {
                const firstDevice = devices[0];
                console.log(chalk_1.default.yellow(`\n获取设备详情: ${firstDevice.name}...`));
                const deviceDetail = await client.devices().getById(firstDevice.id);
                console.log(chalk_1.default.green('✅ 设备详情:'));
                console.log(`  设备ID: ${deviceDetail.id}`);
                console.log(`  设备名称: ${deviceDetail.name}`);
                console.log(`  设备类型: ${deviceDetail.type}`);
                console.log(`  固件版本: ${deviceDetail.firmwareVersion || 'N/A'}`);
                console.log(`  配置: ${JSON.stringify(deviceDetail.config || {}, null, 2)}`);
            }
        }
        catch (error) {
            console.log(chalk_1.default.orange('⚠️  设备管理功能不可用:'), error.message);
        }
        await client.auth().logout();
    }
    catch (error) {
        console.error(chalk_1.default.red('❌ 设备管理失败:'), error);
        throw error;
    }
}
/**
 * 主函数
 */
async function main() {
    console.log(chalk_1.default.bold.cyan('🚀 Mira SDK 基本使用示例集合\n'));
    try {
        await quickStartExample();
        await libraryManagementExample();
        await userManagementExample();
        await systemMonitoringExample();
        await deviceManagementExample();
        console.log(chalk_1.default.bold.green('\n🎉 所有基本示例执行完成!'));
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
//# sourceMappingURL=basic-usage.js.map