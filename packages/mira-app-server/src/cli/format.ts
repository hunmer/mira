/**
 * CLI 输出格式化工具
 *
 * 统一处理人类可读输出与 --json 原始 JSON 输出，便于 agent 解析。
 */

import { program } from 'commander';

/**
 * 当前是否启用了 --json 输出
 */
export function isJsonMode(): boolean {
    return !!program.opts().json;
}

/**
 * 统一输出结果。
 * - --json 模式：直接打印 JSON.stringify(data, null, 2)
 * - 普通模式：调用 formatter 生成人类可读文本；未提供 formatter 时退化为 JSON
 *
 * @param data 原始数据
 * @param formatter 人类可读格式化函数
 */
export function output<T>(data: T, formatter?: (data: T) => string): void {
    if (isJsonMode()) {
        console.log(JSON.stringify(data, null, 2));
        return;
    }
    if (formatter) {
        console.log(formatter(data));
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

/**
 * 将扁平对象/数组渲染为简易键值表
 */
export function formatKeyValue(obj: Record<string, any>): string {
    return Object.entries(obj)
        .map(([k, v]) => `${k}: ${formatValue(v)}`)
        .join('\n');
}

/**
 * 将对象数组渲染为简易表格（自动取并集列）
 */
export function formatTable(rows: Array<Record<string, any>>): string {
    if (rows.length === 0) return '(空)';
    const keys = Array.from(
        rows.reduce<Set<string>>((set, row) => {
            Object.keys(row).forEach(k => set.add(k));
            return set;
        }, new Set())
    );

    const header = keys.join('  |  ');
    const divider = keys.map(k => '-'.repeat(Math.max(k.length, 4))).join('--+--');
    const body = rows
        .map(row => keys.map(k => formatValue(row[k])).join('  |  '))
        .join('\n');

    return `${header}\n${divider}\n${body}`;
}

/**
 * 单个值的格式化：对象/数组转为 JSON，undefined 显示为空
 */
export function formatValue(value: any): string {
    if (value === undefined || value === null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

/**
 * 成功提示（仅普通模式打印，--json 模式保持纯净输出）
 */
export function success(message: string): void {
    if (!isJsonMode()) {
        console.log(`✅ ${message}`);
    }
}

/**
 * 错误处理：打印后退出。--json 模式输出结构化错误对象。
 */
export function fatal(error: any): never {
    const message =
        error?.message ||
        (typeof error === 'string' ? error : '未知错误');

    if (isJsonMode()) {
        console.log(JSON.stringify({ ok: false, error: message }, null, 2));
    } else {
        console.error(`❌ ${message}`);
    }
    process.exit(1);
}
