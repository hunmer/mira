/**
 * 设备模块命令
 */

import { Command } from 'commander';
import { getClient } from '../client';
import { fatal, formatKeyValue, formatTable, output, success } from '../format';

export function registerDevices(program: Command): void {
    const devices = program.command('devices').description('设备管理');

    devices
        .command('list')
        .description('获取所有设备连接信息')
        .option('--library <id>', '按素材库 ID 筛选')
        .action(async (options: any) => {
            try {
                const { client } = getClient();
                if (options.library) {
                    const list = await client.devices().getByLibrary(options.library);
                    const rows = list.map(d => ({
                        clientId: d.clientId,
                        libraryId: d.libraryId,
                        status: d.status,
                        ipAddress: d.ipAddress,
                        lastActivity: d.lastActivity,
                    }));
                    output(rows, () => formatTable(rows));
                } else {
                    // SDK 已提取 data：得到 Record<libraryId, Device[]>
                    const devicesByLib: Record<string, any[]> =
                        (await client.devices().getAll()) as unknown as Record<string, any[]>;
                    const rows: any[] = [];
                    Object.values(devicesByLib || {}).forEach(arr => {
                        arr.forEach((d: any) => {
                            rows.push({
                                clientId: d.clientId,
                                libraryId: d.libraryId,
                                status: d.status,
                                ipAddress: d.ipAddress,
                                lastActivity: d.lastActivity,
                            });
                        });
                    });
                    output(rows, () => formatTable(rows));
                }
            } catch (error) {
                fatal(error);
            }
        });

    devices
        .command('stats')
        .description('获取设备统计信息')
        .action(async () => {
            try {
                const { client } = getClient();
                // SDK 的 HttpClient 已自动提取 data 字段，直接输出
                const stats: any = await client.devices().getStats();
                output(stats, () => formatKeyValue(stats));
            } catch (error) {
                fatal(error);
            }
        });

    devices
        .command('disconnect <clientId> <libraryId>')
        .description('断开设备连接')
        .action(async (clientId: string, libraryId: string) => {
            try {
                const { client } = getClient();
                const res = await client.devices().disconnect(clientId, libraryId);
                success(`设备 ${clientId} 已断开`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });

    devices
        .command('send <clientId> <libraryId> <message>')
        .description('向设备发送消息（message 为 JSON 字符串）')
        .action(async (clientId: string, libraryId: string, message: string) => {
            try {
                let msg: any;
                try {
                    msg = JSON.parse(message);
                } catch {
                    msg = message; // 纯文本也允许
                }
                const { client } = getClient();
                const res = await client.devices().sendMessage(clientId, libraryId, msg);
                success(`消息已发送到 ${clientId}`);
                output(res);
            } catch (error) {
                fatal(error);
            }
        });
}
