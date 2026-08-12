#!/usr/bin/env node

/**
 * Mira App Server CLI
 *
 * 既是服务器启动入口（start），也通过 mira-app-core/shared/sdk 暴露
 * 完整的服务器操作能力（auth/libraries/files/tags/folders/plugins/devices/db/system）。
 *
 * 登录凭证持久化到 ~/.mira/credentials.json，支持多 profile 切换。
 * 详细用法见各子命令的 --help。
 */

import { MiraServer } from './MiraServer';
import { program } from 'commander';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// 命令模块
import { registerDoctor } from './cli/doctor';
import { registerAuth } from './cli/commands/auth';
import { registerUser } from './cli/commands/user';
import { registerLibraries } from './cli/commands/libraries';
import { registerFiles } from './cli/commands/files';
import { registerTags } from './cli/commands/tags';
import { registerFolders } from './cli/commands/folders';
import { registerPlugins } from './cli/commands/plugins';
import { registerDevices } from './cli/commands/devices';
import { registerDatabase } from './cli/commands/database';
import { registerSystem } from './cli/commands/system';
import { registerAutoStart } from './cli/commands/autostart';
import { enableAutoStart, statusAutoStart, stopAutoStart, restartAutoStart } from './cli/autostart';

// MCP 服务（懒加载，避免在非 MCP 模式下加载 SDK）
import { startMcpServer } from './mcp/server';

// 加载环境变量
dotenv.config();

/**
 * MCP 模式短路检测：
 * 当命令行包含 --mcp 时，直接启动 MCP 服务（stdio），不进入 commander 命令流。
 * 这样可保证 stdout 仅承载 JSON-RPC（MCP 协议要求），帮助信息也不会污染输出。
 */
async function maybeRunMcp(): Promise<boolean> {
    const argv = process.argv.slice(2);
    if (!argv.includes('--mcp') && !argv.includes('-mcp')) {
        return false;
    }

    // 简易解析 --server / --token / --debug（复用 commander 风格但独立处理，避免 commander 副作用）
    const getOpt = (name: string): string | undefined => {
        const i = argv.indexOf(name);
        return i >= 0 ? argv[i + 1] : undefined;
    };
    try {
        await startMcpServer({
            server: getOpt('--server') || getOpt('-s'),
            token: getOpt('--token'),
            debug: argv.includes('--debug') || process.env.MIRA_MCP_DEBUG === '1',
        });
        return true;
    } catch (error) {
        process.stderr.write(`❌ MCP server failed to start: ${error}\n`);
        process.exit(1);
    }
}

// 从 package.json 读取真实版本号
// 编译产物位于 dist/，package.json 在其上一级目录
function getPackageVersion(): string {
    try {
        const pkgPath = path.resolve(__dirname, '..', 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        return pkg.version || '0.0.0';
    } catch {
        return '0.0.0';
    }
}

const VERSION = getPackageVersion();

program
    .name('mira-app-server')
    .description('Mira Server - Media Library Management System')
    .version(VERSION)
    // 全局选项：所有命令可覆盖连接目标与凭证来源
    .option('-s, --server <server>', '服务器地址（默认 http://localhost:8081）')
    .option('--token <token>', '访问令牌（覆盖当前 profile）')
    .option('--profile <name>', '使用指定 profile 的凭证')
    .option('--json', '以 JSON 格式输出（便于脚本/agent 解析）');

// ============ start ============
program
    .command('start')
    .description('Start the Mira server')
    .option('-p, --http-port <number>', 'HTTP port number', '8081')
    .option('-w, --ws-port <number>', 'WebSocket port number', '8018')
    .option('-d, --data-path <path>', 'Data directory path')
    .option('--env <path>', 'Environment file path')
    .option('--autostart', '注册为系统开机自启项并由系统托管启动（macOS=LaunchAgent / Linux=systemd / Windows=任务计划）')
    .action(async (options) => {
        try {
            // 如果指定了env文件，加载它
            if (options.env) {
                dotenv.config({ path: path.resolve(options.env) });
            }

            if (options.autostart) {
                console.log('🚀 注册系统开机自启并启动 Mira Server...');
                const target = enableAutoStart({
                    httpPort: parseInt(options.httpPort),
                    wsPort: parseInt(options.wsPort),
                    dataPath: options.dataPath,
                });
                console.log(`✅ 已注册开机自启并由系统托管：${target}`);
                console.log('   服务现已运行；下次开机/登录将自动启动。');
                return; // 不再前台启动实例（由系统机制拉起，避免双实例端口冲突）
            }

            console.log('🚀 Starting Mira Server with CLI...');
            const server = await MiraServer.createAndStart({
                httpPort: parseInt(options.httpPort),
                wsPort: parseInt(options.wsPort),
                dataPath: options.dataPath,
            });

            console.log('✅ Mira Server started via CLI');

            // 优雅关闭处理
            process.on('SIGINT', async () => {
                console.log('\n📴 Received SIGINT, gracefully shutting down...');
                await server.stop();
                process.exit(0);
            });

            process.on('SIGTERM', async () => {
                console.log('\n📴 Received SIGTERM, gracefully shutting down...');
                await server.stop();
                process.exit(0);
            });
        } catch (error) {
            console.error('❌ Failed to start server:', error);
            process.exit(1);
        }
    });

// ============ stop ============
program
    .command('stop')
    .description('停止系统托管的 Mira 服务（保留开机自启注册；前台实例请用 Ctrl+C）')
    .action(() => {
        try {
            const status = statusAutoStart();
            if (!status.registered) {
                console.error('❌ 未注册开机自启，无系统托管实例可停止。');
                console.error('   前台启动的实例请用 Ctrl+C 退出；如需系统托管请用 `mira-app-server start --autostart`。');
                process.exitCode = 1;
                return;
            }
            stopAutoStart();
            console.log('✅ 已停止 Mira 服务（开机自启注册已保留）。');
        } catch (e: any) {
            console.error(`❌ 停止失败：${e?.message || e}`);
            process.exitCode = 1;
        }
    });

// ============ restart ============
program
    .command('restart')
    .description('重启系统托管的 Mira 服务')
    .action(() => {
        try {
            const status = statusAutoStart();
            if (!status.registered) {
                console.error('❌ 未注册开机自启，无系统托管实例可重启。');
                console.error('   如需系统托管请用 `mira-app-server start --autostart`。');
                process.exitCode = 1;
                return;
            }
            restartAutoStart();
            console.log('✅ 已重启 Mira 服务。');
        } catch (e: any) {
            console.error(`❌ 重启失败：${e?.message || e}`);
            process.exitCode = 1;
        }
    });

// ============ version ============
program
    .command('version')
    .description('Show version information')
    .action(() => {
        console.log('Mira Server v' + VERSION);
        console.log('Node.js', process.version);
        console.log('Platform:', process.platform);
    });

// ============ health（保留向后兼容） ============
program
    .command('health')
    .description('Check server health')
    .option('-p, --http-port <number>', 'Server port', '8081')
    .action(async (options) => {
        try {
            const axios = await import('axios');
            const response = await axios.default.get(
                `http://localhost:${options.httpPort}/health`
            );
            console.log('✅ Server is healthy:', response.data);
        } catch (error) {
            console.error('❌ Server health check failed:', error);
            process.exit(1);
        }
    });

// ============ SDK 能力命令 ============
// 环境依赖自检（顶层 doctor 命令）
registerDoctor(program);
// 认证与凭证
registerAuth(program);
// 用户
registerUser(program);
// 素材库
registerLibraries(program);
// 文件
registerFiles(program);
// 标签
registerTags(program);
// 文件夹
registerFolders(program);
// 插件
registerPlugins(program);
// 设备
registerDevices(program);
// 数据库
registerDatabase(program);
// 系统
registerSystem(program);
// 开机自启管理
registerAutoStart(program);

// 主流程：先检测 MCP 模式，否则进入 commander 命令派发
(async () => {
    if (await maybeRunMcp()) {
        return; // MCP 模式已接管，进程由 stdio transport 保持运行
    }

    // 解析命令行参数
    program.parse(process.argv);

    // 如果没有提供命令，显示帮助
    if (!process.argv.slice(2).length) {
        program.outputHelp();
    }
})();
