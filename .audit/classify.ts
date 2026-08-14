/**
 * Phase 1 分类: server manifest x sdk manifest -> covered/partial/missing/excluded/dynamic
 * 用法: cd packages/mira-app-core && ./node_modules/.bin/ts-node-script -T -O '{"module":"commonjs"}' ../../.audit/classify.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const DIR = __dirname;
const server = JSON.parse(fs.readFileSync(path.join(DIR, 'server-api-manifest.json'), 'utf8'));
const sdk = JSON.parse(fs.readFileSync(path.join(DIR, 'sdk-api-manifest.json'), 'utf8'));

type Category = 'covered' | 'partial' | 'missing' | 'excluded' | 'dynamic';

interface Classified {
    method: string;
    path: string;
    domain: string;
    file: string;
    line: number;
    category: Category;
    sdkMethods: string[];
    note?: string;
}

// 显式排除: 静态资源 / 流式响应(SSE/文件流/HLS) / SPA / 通配资源
// 依据: handler 响应形态为 createReadStream/sendFile/text-event-stream, 非 JSON API
const EXCLUDE_RULES: { test: (p: string) => boolean; reason: string }[] = [
    { test: (p) => p.startsWith('__REGEXP__'), reason: 'regex SPA/static route (dashboard/web)' },
    { test: (p) => p === '/', reason: 'root redirect to /web/' },
    { test: (p) => p === '/api/logs/stream', reason: 'SSE log stream, not JSON API' },
    { test: (p) => p === '/api/plugins/install/stream', reason: 'SSE install progress stream' },
    { test: (p) => p === '/server-plugins/:param/:param/*', reason: 'plugin static resource wildcard' },
    { test: (p) => p === '/api/plugins/:param/:param/*', reason: 'plugin static/resource wildcard' },
    { test: (p) => p === '/api/plugins/:param/icon/:param', reason: 'plugin icon image resource' },
    { test: (p) => p === '/api/files/thumb/:param/:param', reason: 'thumbnail image stream' },
    { test: (p) => p === '/api/files/extra/:param/:param', reason: 'extra file resource stream' },
    { test: (p) => p === '/api/files/extra/:param/:param/*', reason: 'extra file resource wildcard' },
    { test: (p) => p === '/api/files/preview/:param/:param/index.m3u8', reason: 'HLS manifest resource' },
    { test: (p) => p === '/api/files/preview/:param/:param/segment/:param.ts', reason: 'HLS segment resource' },
    { test: (p) => p === '/api/files/preview/:param/:param', reason: 'preview file stream' },
    { test: (p) => p === '/api/files/file/:param/:param', reason: 'raw file stream (Range support)' },
];

const results: Classified[] = [];

// sdk 匹配索引: method|path -> entries
const sdkIndex = new Map<string, typeof sdk.entries>();
const sdkByPath = new Map<string, typeof sdk.entries>();
for (const e of sdk.entries) {
    const k = `${e.httpMethod}|${e.path}`;
    if (!sdkIndex.has(k)) sdkIndex.set(k, []);
    sdkIndex.get(k)!.push(e);
    if (!sdkByPath.has(e.path)) sdkByPath.set(e.path, []);
    sdkByPath.get(e.path)!.push(e);
}

for (const r of server.routes) {
    // 1. 动态路由 (插件运行时注册)
    if (r.dynamic) {
        results.push({ method: r.method, path: r.rawPath ?? r.path, domain: r.domain, file: r.file, line: r.line, category: 'dynamic', sdkMethods: [], note: r.domain === 'api-root' ? 'HttpRouter plugin runtime registration' : 'regex/dynamic' });
        continue;
    }
    // 2. 显式排除
    const ex = EXCLUDE_RULES.find((x) => x.test(r.path));
    if (ex) {
        results.push({ method: r.method, path: r.path, domain: r.domain, file: r.file, line: r.line, category: 'excluded', sdkMethods: [], note: ex.reason });
        continue;
    }
    // 3. 精确匹配
    const exact = sdkIndex.get(`${r.method}|${r.path}`);
    if (exact && exact.length) {
        results.push({ method: r.method, path: r.path, domain: r.domain, file: r.file, line: r.line, category: 'covered', sdkMethods: exact.map((e) => `${e.module}.${e.method}`) });
        continue;
    }
    // 4. path 匹配但 method 不同 -> partial
    const samePath = sdkByPath.get(r.path);
    if (samePath && samePath.length) {
        results.push({ method: r.method, path: r.path, domain: r.domain, file: r.file, line: r.line, category: 'partial', sdkMethods: samePath.map((e) => `${e.module}.${e.method} (${e.httpMethod})`), note: 'path matched, method differs' });
        continue;
    }
    // 5. missing
    results.push({ method: r.method, path: r.path, domain: r.domain, file: r.file, line: r.line, category: 'missing', sdkMethods: [] });
}

// 汇总
const summary: Record<string, number> = {};
for (const r of results) summary[r.category] = (summary[r.category] || 0) + 1;

fs.writeFileSync(path.join(DIR, 'coverage-classified.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    summary,
    routes: results,
}, null, 2));

// 生成 sdk-coverage-report.md
const lines: string[] = [];
lines.push('# Mira Server API 与 SDK 覆盖报告');
lines.push('');
lines.push(`生成时间: ${new Date().toISOString()}`);
lines.push('');
lines.push('匹配键: HTTP method + 归一化路径（动态参数统一为 `:param`，query string 不参与匹配）。');
lines.push('');
lines.push('## 总览');
lines.push('');
lines.push('| 分类 | 数量 | 说明 |');
lines.push('|------|------|------|');
lines.push(`| covered | ${summary.covered} | SDK 有等价 method+path |`);
lines.push(`| partial | ${summary.partial} | path 匹配但 method 不匹配 |`);
lines.push(`| missing | ${summary.missing} | SDK 无对应方法 |`);
lines.push(`| excluded | ${summary.excluded} | 资源/流式/SPA/通配, 不生成普通 CRUD |`);
lines.push(`| dynamic | ${summary.dynamic} | 插件运行时注册/正则路由 |`);
lines.push('');
const fixed = results.filter((r) => ['covered', 'partial', 'missing'].includes(r.category));
lines.push(`固定 JSON API 共 ${fixed.length} 条, 已 100% 分类（covered ${summary.covered} / partial ${summary.partial} / missing ${summary.missing}）。`);
lines.push('');

const section = (title: string, cat: string) => {
    lines.push(`## ${title}`);
    lines.push('');
    lines.push('| method | path | 域 | 来源 | SDK | 备注 |');
    lines.push('|--------|------|----|------|-----|------|');
    for (const r of results.filter((x) => x.category === cat)) {
        const src = `${r.file}:${r.line}`;
        lines.push(`| ${r.method} | \`${r.path}\` | ${r.domain} | ${src} | ${(r.sdkMethods || []).join(', ') || '-'} | ${r.note || ''} |`);
    }
    lines.push('');
};
section('Missing (SDK 无对应方法)', 'missing');
section('Partial (path 匹配, method 不匹配)', 'partial');
section('Excluded (资源/流式/静态, 不生成普通 CRUD)', 'excluded');
lines.push('## Dynamic (插件运行时注册, 无法静态枚举)');
lines.push('');
lines.push('- `HttpRouter` 提供插件运行时 `POST/GET/PUT/DELETE/PATCH /api/*` 动态注册（来源 `packages/mira-app-server/src/routes/HttpRouter.ts:52-64`）。');
lines.push('- 插件静态资源通配 `/api/plugins/:libraryId/:pluginName/*`。');
lines.push('- SPA 正则路由 `/dashboard`、`/web`。');
lines.push('- 建议: 需要时提供通用 plugin request API 或 URL builder, 不逐一建 SDK 方法。');
lines.push('');
lines.push('## Covered 明细');
lines.push('');
lines.push('| method | path | 域 | SDK 方法 |');
lines.push('|--------|------|----|---------|');
for (const r of results.filter((x) => x.category === 'covered')) {
    lines.push(`| ${r.method} | \`${r.path}\` | ${r.domain} | ${(r.sdkMethods || []).join(', ')} |`);
}
lines.push('');
fs.writeFileSync(path.join(DIR, 'sdk-coverage-report.md'), lines.join('\n'));

console.log('summary:', summary);
const fixedJson = results.filter((r) => r.category !== 'dynamic' && r.category !== 'excluded');
console.log(`fixed JSON API classified: ${fixedJson.length} (covered ${summary.covered}, partial ${summary.partial}, missing ${summary.missing})`);
// missing 明细
console.log('--- missing ---');
for (const r of results.filter((x) => x.category === 'missing')) {
    console.log(`${r.method.padEnd(7)}${r.path.padEnd(50)}${r.domain}`);
}
console.log('--- partial ---');
for (const r of results.filter((x) => x.category === 'partial')) {
    console.log(`${r.method.padEnd(7)}${r.path.padEnd(50)}sdk: ${r.sdkMethods.join(',')}`);
}
