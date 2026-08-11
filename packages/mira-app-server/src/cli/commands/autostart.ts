/**
 * 开机自启管理命令（autostart）
 *
 * - autostart status   查看注册状态与 node 路径健康度
 * - autostart disable  取消开机自启并停止系统托管的实例
 *
 * 启用自启由 `start --autostart` 负责（注册并立即由系统拉起）。
 */

import { Command } from 'commander';
import { disableAutoStart, statusAutoStart, AutoStartStatus } from '../autostart';
import { isJsonMode, output } from '../format';

function formatStatus(s: AutoStartStatus): string {
    const lines: string[] = ['🔌 开机自启状态', ''];
    lines.push(`平台      : ${s.platform}`);
    lines.push(`已注册    : ${s.registered ? '✅ 是' : '❌ 否'}`);
    lines.push(`配置文件  : ${s.configFile || '(无)'}`);
    if (s.nodePath) {
        const valid = s.nodePathValid ? '✅ 存在' : '❌ 已失效';
        const volatile = s.nodePathVolatile ? '  ⚠️ 易变路径（随 node 版本变化）' : '';
        lines.push(`node 路径 : ${s.nodePath}  (${valid}${volatile})`);
    }
    if (s.running !== null) {
        lines.push(`运行状态  : ${s.running ? '🟢 运行中' : '⚪ 未运行'}`);
    }
    if (!s.registered) {
        lines.push('');
        lines.push('提示: 运行 `mira-app-server start --autostart` 注册开机自启');
    } else if (s.nodePath && !s.nodePathValid) {
        lines.push('');
        lines.push('⚠️  注册的 node 路径已失效（可能升级了 node 版本），请重新运行 `mira-app-server start --autostart`');
    }
    return lines.join('\n');
}

export function registerAutoStart(program: Command): void {
    const autostart = program
        .command('autostart')
        .description('管理开机自启（macOS=LaunchAgent / Linux=systemd / Windows=任务计划）');

    autostart
        .command('status')
        .description('查看开机自启注册状态与 node 路径健康度')
        .action(() => {
            output(statusAutoStart(), formatStatus);
        });

    autostart
        .command('disable')
        .description('取消开机自启并停止系统托管的实例')
        .action(() => {
            try {
                disableAutoStart();
                if (isJsonMode()) {
                    console.log(JSON.stringify({ ok: true }));
                } else {
                    console.log('✅ 已取消开机自启');
                }
            } catch (e: any) {
                console.error(`❌ 取消失败：${e?.message || e}`);
                process.exitCode = 1;
            }
        });
}
