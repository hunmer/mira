/**
 * 用户模块命令
 */

import { Command } from 'commander';
import path from 'path';
import { getClient } from '../client';
import { fatal, formatKeyValue, output, success } from '../format';

/**
 * 交互式读取密码（隐藏输入，输出星号），回车结束。
 * 仅当未通过 -p 提供密码时使用。
 */
async function promptPassword(question: string): Promise<string> {
    return new Promise<string>(resolve => {
        const stdin = process.stdin;
        const stdout = process.stdout;
        stdout.write(question);
        let value = '';
        const cleanup = () => {
            stdin.removeListener('data', onData);
            stdin.setRawMode(false);
            stdin.pause();
        };
        const onData = (buffer: Buffer) => {
            for (const byte of buffer) {
                if (byte === 0x0d || byte === 0x0a) {       // Enter
                    stdout.write('\n');
                    cleanup();
                    resolve(value.trim());
                    return;
                }
                if (byte === 0x7f || byte === 0x08) {        // Backspace
                    if (value.length > 0) {
                        value = value.slice(0, -1);
                        stdout.write('\b \b');
                    }
                    continue;
                }
                if (byte === 0x03) {                          // Ctrl+C
                    stdout.write('\n');
                    cleanup();
                    process.exit(0);
                }
                value += String.fromCharCode(byte);
                stdout.write('*');
            }
        };
        stdin.setRawMode(true);
        stdin.resume();
        stdin.on('data', onData);
    });
}

export function registerUser(program: Command): void {
    const user = program.command('user').description('用户信息管理');

    user.command('info')
        .description('获取当前登录用户信息')
        .action(async () => {
            try {
                const { client } = getClient();
                const info = await client.user().getInfo();
                output(info, () => formatKeyValue(info as any));
            } catch (error) {
                fatal(error);
            }
        });

    user.command('update')
        .description('更新当前用户信息')
        .option('--real-name <name>', '真实姓名')
        .option('--avatar <url>', '头像 URL')
        .action(async (options: any) => {
            try {
                const { client } = getClient();
                const data: any = {};
                if (options.realName !== undefined) data.realName = options.realName;
                if (options.avatar !== undefined) data.avatar = options.avatar;
                const res = await client.user().updateInfo(data);
                success('用户信息已更新');
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    // 重置密码：直接操作本地 users.db，不经过 HTTP、不需要登录。
    // 用于密码遗忘 / deploy 脚本登录失败时的恢复。会清除该用户所有会话。
    user.command('reset-password')
        .description('重置用户密码（直连本地 users.db，无需登录；用于密码遗忘/登录失败恢复）')
        .option('-u, --username <username>', '用户名', 'admin')
        .option('-p, --password <password>', '新密码（不填则交互式输入）')
        .option('-d, --data-path <path>', '数据目录（含 users.db）；默认取 DATA_PATH 环境变量或 ./data')
        .action(async (options: any) => {
            const dataPath = options.dataPath || process.env.DATA_PATH || path.join(process.cwd(), 'data');

            let password = options.password;
            if (!password) {
                password = await promptPassword('新密码: ');
                const confirm = await promptPassword('确认新密码: ');
                if (!password) {
                    fatal(new Error('密码不能为空'));
                }
                if (password !== confirm) {
                    fatal(new Error('两次输入的密码不一致'));
                }
            }

            const { UserStorage } = await import('../../UserStorage');
            const storage = new UserStorage(dataPath);
            let exitError: any = null;
            try {
                await storage.initialize();
                const target = await storage.findUserByUsername(options.username);
                if (!target) {
                    throw new Error(`用户 "${options.username}" 不存在或未激活`);
                }
                const updated = await storage.updateUser(target.id, { password });
                if (!updated) {
                    throw new Error('密码更新失败（用户可能已被禁用）');
                }
                // 清除该用户所有会话，旧 token 立即失效
                await storage.revokeAllUserSessions(target.id);
                output(
                    { ok: true, username: options.username, dataPath },
                    () => `已重置用户 "${options.username}" 的密码，并清除其所有登录会话`,
                );
            } catch (error) {
                exitError = error;
            } finally {
                await storage.close();
                if (exitError) fatal(exitError);
            }
        });
}
