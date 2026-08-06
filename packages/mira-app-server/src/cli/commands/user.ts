/**
 * 用户模块命令
 */

import { Command } from 'commander';
import { getClient } from '../client';
import { fatal, formatKeyValue, output, success } from '../format';

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
}
