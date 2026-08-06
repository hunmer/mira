/**
 * 系统模块命令
 */

import { Command } from 'commander';
import { getClient, getAnonymousClient } from '../client';
import { fatal, formatKeyValue, output } from '../format';

export function registerSystem(program: Command): void {
    const system = program.command('system').description('系统信息');

    system
        .command('health')
        .description('获取服务器健康状态')
        .action(async () => {
            try {
                const { client } = getAnonymousClient();
                const health = await client.system().getHealth();
                output(health, () => formatKeyValue(health as any));
            } catch (error) {
                fatal(error);
            }
        });

    system
        .command('info')
        .description('获取服务器版本与运行环境信息')
        .action(async () => {
            try {
                const { client } = getClient(false);
                const info = await client.system().getSystemInfo();
                output(info, () => formatKeyValue(info as any));
            } catch (error) {
                fatal(error);
            }
        });

    system
        .command('uptime')
        .description('获取服务器运行时间（可读格式）')
        .action(async () => {
            try {
                const { client } = getClient(false);
                const formatted = await client.system().getUptimeFormatted();
                output({ uptime: formatted }, () => `运行时间: ${formatted}`);
            } catch (error) {
                fatal(error);
            }
        });
}
