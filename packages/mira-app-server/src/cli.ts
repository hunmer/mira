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
import os from 'os';
import { spawn } from 'child_process';

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
import { getAnonymousClient } from './cli/client';

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
const DEFAULT_DATA_PATH = path.join(os.homedir(), '.mira-data');

/** 等待目标服务器停止响应（用于优雅退出后的确认），超时返回 false */
async function waitForServerDown(stopClient: { system: () => { getSimpleHealth: () => Promise<any> } }, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            await stopClient.system().getSimpleHealth();
        } catch (e: any) {
            if (e?.error === 'NETWORK_ERROR') return true; // 已无法连接 = 已退出
            throw e;
        }
        await new Promise(r => setTimeout(r, 300));
    }
    return false;
}

/** 等待本地端口上的服务器就绪（轮询 /health），超时返回 false */
async function waitForServerUp(httpPort: number, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(`http://localhost:${httpPort}/health`);
            if (res.ok) return true;
        } catch { /* 尚未就绪 */ }
        await new Promise(r => setTimeout(r, 500));
    }
    return false;
}

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
    .option('-d, --data-path <path>', `Data directory path (default: ${DEFAULT_DATA_PATH})`)
    .option('--env <path>', 'Environment file path')
    .option('--autostart', '注册为系统开机自启项并由系统托管启动（macOS=LaunchAgent / Linux=systemd / Windows=任务计划）')
    .action(async (options) => {
        try {
            // 无额外参数时复用已注册的系统托管配置，与 `restart` 行为一致。
            // 自启任务本身会带上完整参数，因此不会进入此分支。
            const startCommandIndex = process.argv.indexOf('start');
            const hasStartOptions = startCommandIndex >= 0 && process.argv.slice(startCommandIndex + 1).length > 0;
            if (!hasStartOptions) {
                const status = statusAutoStart();
                if (status.registered) {
                    console.log('🔄 使用已注册配置重启 Mira Server...');
                    restartAutoStart();
                    console.log('✅ Mira Server 已按已注册配置启动。');
                    return;
                }
            }

            // 如果指定了env文件，加载它
            if (options.env) {
                dotenv.config({ path: path.resolve(options.env) });
            }

            // 普通启动与 --autostart 必须使用相同的数据目录；环境变量仍可覆盖默认值。
            const dataPath = options.dataPath || process.env.DATA_PATH || DEFAULT_DATA_PATH;

            if (options.autostart) {
                console.log('🚀 注册系统开机自启并启动 Mira Server...');
                const target = enableAutoStart({
                    httpPort: parseInt(options.httpPort),
                    wsPort: parseInt(options.wsPort),
                    dataPath,
                });
                console.log(`✅ 已注册开机自启并由系统托管：${target}`);
                console.log('   服务现已运行；下次开机/登录将自动启动。');
                return; // 不再前台启动实例（由系统机制拉起，避免双实例端口冲突）
            }

            console.log('🚀 Starting Mira Server with CLI...');
            const server = await MiraServer.createAndStart({
                httpPort: parseInt(options.httpPort),
                wsPort: parseInt(options.wsPort),
                dataPath,
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
    .description('停止运行中的 Mira 服务（优先通过 HTTP 优雅停止；系统托管实例一并停止）')
    .action(async () => {
        try {
            let stopped = false;

            // 1) 通过 stop HTTP API 优雅停止运行中的实例（无需登录，仅本机回环生效）
            try {
                const { client } = getAnonymousClient();
                await client.system().stopServer();
                console.log('✅ 已通知运行中的 Mira Server 优雅退出。');
                stopped = true;
            } catch (e: any) {
                if (e?.error === 'NETWORK_ERROR') {
                    // 目标地址没有实例在监听，继续检查系统托管实例
                } else if (e?.status === 404) {
                    console.warn('⚠️  目标服务器版本过旧，不支持远程停止（POST /api/system/stop 返回 404）。');
                } else if (e?.status === 403) {
                    console.error('❌ 服务端拒绝：仅允许本机停止服务（--server 指向了远程地址）。');
                    process.exitCode = 1;
                    return;
                } else {
                    throw e;
                }
            }

            // 2) 停止系统托管的实例（保留开机自启注册；幂等）
            const status = statusAutoStart();
            if (status.registered) {
                stopAutoStart();
                console.log('✅ 已停止系统托管的 Mira 服务（开机自启注册已保留）。');
                stopped = true;
            }

            if (!stopped) {
                console.error('❌ 未发现运行中的 Mira 服务实例。');
                console.error('   前台启动的实例请用 Ctrl+C 退出；如需系统托管请用 `mira-app-server start --autostart`。');
                process.exitCode = 1;
            }
        } catch (e: any) {
            console.error(`❌ 停止失败：${e?.message || e}`);
            process.exitCode = 1;
        }
    });

// ============ restart ============
program
    .command('restart')
    .description('重启 Mira 服务（系统托管实例复用注册配置；否则停止运行实例并后台拉起新实例）')
    .option('-p, --http-port <number>', 'HTTP port number', '8081')
    .option('-w, --ws-port <number>', 'WebSocket port number', '8018')
    .option('-d, --data-path <path>', `Data directory path (default: ${DEFAULT_DATA_PATH})`)
    .action(async (options) => {
        try {
            // 1) 系统托管实例：复用已注册配置重启
            const status = statusAutoStart();
            if (status.registered) {
                restartAutoStart();
                console.log('✅ 已按注册配置重启系统托管的 Mira 服务。');
                return;
            }

            // 2) 非托管实例：先经 stop API 优雅停止（无实例在跑则跳过）
            try {
                const { client } = getAnonymousClient();
                await client.system().stopServer();
                console.log('📴 已通知运行中的 Mira Server 优雅退出...');
                const down = await waitForServerDown(client, 10000);
                if (!down) {
                    console.error('❌ 旧实例未能及时退出，请稍后重试或检查 ~/.mira/mira-server.err.log。');
                    process.exitCode = 1;
                    return;
                }
            } catch (e: any) {
                if (e?.error === 'NETWORK_ERROR') {
                    // 没有实例在跑，直接启动
                } else if (e?.status === 404) {
                    console.error('❌ 目标服务器版本过旧，不支持远程停止（POST /api/system/stop 返回 404），无法自动重启。');
                    process.exitCode = 1;
                    return;
                } else {
                    throw e;
                }
            }

            // 3) 以分离进程后台拉起新实例，日志追加到 ~/.mira/
            const dataPath = options.dataPath || process.env.DATA_PATH || DEFAULT_DATA_PATH;
            const logsDir = path.join(os.homedir(), '.mira');
            fs.mkdirSync(logsDir, { recursive: true });
            const out = fs.openSync(path.join(logsDir, 'mira-server.out.log'), 'a');
            const err = fs.openSync(path.join(logsDir, 'mira-server.err.log'), 'a');
            const child = spawn(
                process.execPath,
                [
                    path.join(__dirname, 'cli.js'), 'start',
                    '--http-port', options.httpPort,
                    '--ws-port', options.wsPort,
                    '--data-path', dataPath,
                ],
                { detached: true, stdio: ['ignore', out, err], windowsHide: true }
            );
            child.unref();
            console.log('🚀 已在后台启动 Mira Server...');

            const up = await waitForServerUp(parseInt(options.httpPort), 30000);
            if (up) {
                console.log('✅ Mira Server 已重启。');
            } else {
                console.error('⚠️  后台实例 30s 内未就绪，请检查日志 ~/.mira/mira-server.err.log。');
                process.exitCode = 1;
            }
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
