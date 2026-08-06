/**
 * 认证与凭证命令
 *
 * - login: 交互式登录，凭证持久化到本地 profile
 * - logout: 清除当前 profile 的 token
 * - whoami: 显示当前登录用户
 * - auth use / list / add / remove: profile 管理
 */

import { Command } from 'commander';
import * as readline from 'readline/promises';
import {
    DEFAULT_PROFILE_NAME,
    CredentialProfile,
    clearCurrentToken,
    getCurrentProfile,
    getProfile,
    listProfiles,
    removeProfile,
    saveProfile,
    setCurrent,
} from '../credentials';
import { getAnonymousClient, getClient, DEFAULT_SERVER } from '../client';
import { fatal, formatKeyValue, formatTable, output, success } from '../format';
import { program } from 'commander';

/**
 * 交互式提示输入。
 * @param question 提示语
 * @param hidden 是否隐藏输入（密码场景）。隐藏通过在原始模式下逐字符读取、
 *               输出星号实现，回车结束。
 */
async function prompt(question: string, hidden: boolean = false): Promise<string> {
    if (!hidden) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        try {
            return (await rl.question(question)).trim();
        } finally {
            rl.close();
        }
    }

    // 隐藏输入模式：直接操作 stdin/stdout，原始模式逐字符读取
    return new Promise<string>(resolve => {
        const stdin = process.stdin;
        const stdout = process.stdout;
        stdout.write(question);
        let value = '';
        const onData = (buffer: Buffer) => {
            for (const byte of buffer) {
                // \r (13) 或 \n (10) 表示回车结束
                if (byte === 0x0d || byte === 0x0a) {
                    stdout.write('\n');
                    stdin.removeListener('data', onData);
                    stdin.setRawMode(false);
                    stdin.pause();
                    resolve(value.trim());
                    return;
                }
                // Backspace (127 / 8)
                if (byte === 0x7f || byte === 0x08) {
                    if (value.length > 0) {
                        value = value.slice(0, -1);
                        stdout.write('\b \b');
                    }
                    continue;
                }
                // Ctrl+C (3)
                if (byte === 0x03) {
                    stdout.write('\n');
                    stdin.removeListener('data', onData);
                    stdin.setRawMode(false);
                    process.exit(0);
                }
                const ch = String.fromCharCode(byte);
                value += ch;
                stdout.write('*');
            }
        };
        stdin.setRawMode(true);
        stdin.resume();
        stdin.on('data', onData);
    });
}

export function registerAuth(program: Command): void {
    // ============ login ============
    program
        .command('login [server]')
        .description('登录到 Mira 服务器，凭证会保存到本地 profile')
        .option('-u, --username <username>', '用户名（不填则交互式输入）')
        .option('-p, --password <password>', '密码（不填则交互式输入）')
        .option('--profile <name>', '保存到的 profile 名', DEFAULT_PROFILE_NAME)
        .action(async (serverArg: string | undefined, options: any) => {
            try {
                // server: 位置参数 > 全局 --server > 默认
                const server = serverArg || program.opts().server || DEFAULT_SERVER;
                const { client } = getAnonymousClient({ server });

                // 检查服务器连通性
                const available = await client.system().isServerAvailable();
                if (!available) {
                    throw new Error(`无法连接到服务器 ${server}，请确认服务器已启动`);
                }

                // 检查是否需要鉴权
                const health = await client.system().getHealth();
                const authRequired = health.authRequired;

                let username = options.username;
                let password = options.password;

                if (authRequired) {
                    if (!username) {
                        username = await prompt('用户名: ');
                    }
                    if (!password) {
                        password = await prompt('密码: ', true);
                    }
                    if (!username || !password) {
                        throw new Error('用户名和密码不能为空');
                    }

                    await client.auth().login(username, password);
                    success(`登录成功 (${server})`);
                } else {
                    success(`服务器 ${server} 无需鉴权`);
                }

                // 拉取用户信息
                const userInfo = await client.user().getInfo();

                // 持久化 profile
                const profile: CredentialProfile = {
                    server,
                    token: client.getConfig().token || '',
                    username: userInfo.username || username,
                };
                saveProfile(options.profile, profile);

                output(
                    { profile: options.profile, server, user: userInfo },
                    () =>
                        `当前 profile: ${options.profile}\n` +
                        `服务器: ${server}\n` +
                        `用户信息:\n${formatKeyValue(userInfo as any)}`
                );
            } catch (error) {
                fatal(error);
            }
        });

    // ============ logout ============
    program
        .command('logout')
        .description('登出当前 profile（清除本地保存的 token）')
        .option('--profile <name>', '指定登出的 profile')
        .action(async (options: any) => {
            try {
                // 尝试通知服务器登出（失败不阻塞）
                try {
                    const { client } = getClient(false, { profile: options.profile });
                    if (client.getConfig().token) {
                        await client.auth().logout();
                    }
                } catch {
                    // 忽略服务器端登出错误
                }

                const name = options.profile || getCurrentProfile()?.name;
                if (!name) {
                    throw new Error('没有可登出的 profile');
                }

                // 仅清除当前指定 profile 的 token
                if (options.profile) {
                    const profile = getProfile(options.profile);
                    if (profile) {
                        saveProfile(options.profile, { ...profile, token: '' });
                    }
                } else {
                    clearCurrentToken();
                }
                success(`已登出 profile: ${name}`);
            } catch (error) {
                fatal(error);
            }
        });

    // ============ whoami ============
    program
        .command('whoami')
        .description('显示当前登录用户信息')
        .action(async () => {
            try {
                const { client, connection } = getClient();
                const info = await client.user().getInfo();
                output(
                    { server: connection.server, profile: connection.profile, user: info },
                    () =>
                        `服务器: ${connection.server}\n` +
                        `用户信息:\n${formatKeyValue(info as any)}`
                );
            } catch (error) {
                fatal(error);
            }
        });

    // ============ auth (子命令组) ============
    const auth = program.command('auth').description('凭证 profile 管理');

    auth.command('list')
        .description('列出所有已保存的 profile')
        .action(() => {
            try {
                const current = getCurrentProfile()?.name;
                const names = listProfiles();
                if (names.length === 0) {
                    output({ profiles: [] }, () => '暂无保存的 profile');
                    return;
                }
                const rows = names.map(name => {
                    const p = getProfile(name)!;
                    return {
                        profile: name,
                        current: name === current ? '*' : '',
                        server: p.server,
                        username: p.username || '',
                        updated: p.updatedAt || '',
                    };
                });
                output({ profiles: rows }, () => formatTable(rows));
            } catch (error) {
                fatal(error);
            }
        });

    auth.command('use <name>')
        .description('切换当前激活的 profile')
        .action((name: string) => {
            try {
                if (!setCurrent(name)) {
                    throw new Error(`profile "${name}" 不存在`);
                }
                success(`已切换到 profile: ${name}`);
            } catch (error) {
                fatal(error);
            }
        });

    auth.command('add <name>')
        .description('手动添加一个 profile（server/token 不填则交互式输入，或用全局 -s/--token）')
        .option('-u, --username <username>', '用户名（可选）')
        .action(async (name: string, options: any) => {
            try {
                // server/token 优先取全局 --server / --token，其次交互式输入
                const global = program.opts();
                const server = global.server || (await prompt('服务器地址: '));
                const token = global.token || (await prompt('访问令牌: '));
                const username = options.username;
                if (!server || !token) {
                    throw new Error('服务器地址和访问令牌不能为空');
                }
                saveProfile(name, { server, token, username });
                success(`已添加 profile: ${name} (${server})`);
            } catch (error) {
                fatal(error);
            }
        });

    auth.command('remove <name>')
        .alias('rm')
        .description('删除一个 profile')
        .action((name: string) => {
            try {
                if (!removeProfile(name)) {
                    throw new Error(`profile "${name}" 不存在`);
                }
                success(`已删除 profile: ${name}`);
            } catch (error) {
                fatal(error);
            }
        });
}
