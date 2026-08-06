/**
 * MCP 工具结果构造辅助函数
 *
 * 工具 handler 返回 CallToolResult：成功把数据 JSON 化为 text；失败标记 isError。
 */

/** 成功结果：把任意可序列化数据 JSON 化 */
export function ok(data: unknown) {
    return {
        content: [{ type: 'text' as const, text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }],
    };
}

/** 错误结果 */
export function err(message: string) {
    return {
        isError: true,
        content: [{ type: 'text' as const, text: message }],
    };
}

/**
 * 包装一个异步工具体：自动 try/catch，把 Error.message 转成 isError 结果。
 * 同时把 SDK 抛出的 ErrorResponse（含 message 字段）也正确提取。
 */
export async function run(fn: () => Promise<unknown>) {
    try {
        const result = await fn();
        return ok(result);
    } catch (e: any) {
        const message =
            e?.message ||
            (typeof e === 'string' ? e : '未知错误');
        return err(message);
    }
}
