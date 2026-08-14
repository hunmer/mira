/**
 * Phase 2: 扫描 monorepo 消费者代码, 统计每个接口的直接 HTTP 调用点与消费者包数
 * 用法: cd packages/mira-app-core && ./node_modules/.bin/ts-node-script -T -O '{"module":"commonjs"}' ../../.audit/scan-usage.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const DIR = __dirname;
const classified = JSON.parse(fs.readFileSync(path.join(DIR, 'coverage-classified.json'), 'utf8'));

// 扫描所有包的生产源码 (排除 SDK 自身模块定义处/测试/构建产物)
const PKG_ROOT = path.join(ROOT, 'packages');
const SKIP_DIRS = new Set(['node_modules', 'dist', '.audit', 'build', 'out', 'coverage', '.git']);
const SDK_MODULE_DIR = path.join(ROOT, 'packages/mira-app-core/src/shared/sdk/modules').replace(/\\/g, '/');

interface Site { file: string; pkg: string; line: number; isTest: boolean; isSdkModule: boolean; }

function collectFiles(dir: string, out: string[]) {
    for (const name of fs.readdirSync(dir)) {
        if (SKIP_DIRS.has(name)) continue;
        const abs = path.join(dir, name);
        const stat = fs.statSync(abs);
        if (stat.isDirectory()) collectFiles(abs, out);
        else if (/\.(ts|tsx|vue|js|jsx)$/.test(name)) out.push(abs);
    }
}

// 归一化 path -> 匹配源码字符串的正则
// 引号边界: '/settings' (baseURL 含 /api) 与 '/api/settings' 两种形态都匹配
function pathToRegexes(p: string): RegExp[] {
    if (p.startsWith('__REGEXP__')) return [];
    const segStr = (path: string) => path.split('/').filter(Boolean).map((s) => {
        if (s === '*') return '[^\'"`\\s]*';
        if (s.startsWith(':param')) {
            const suffix = s.slice(':param'.length);
            return `(?:\\\$\{[^}]+\}|[A-Za-z0-9_.\\-]+)${suffix.replace(/\./g, '\\.')}`;
        }
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('/');
    // 结尾边界: 引号 / ?query / ${插值 / 行尾
    const tail = `(?:['"\`?]|\\$\\{|$)`;
    if (p.startsWith('/api')) {
        // 剥掉 /api 前缀后以可选前缀拼接: 匹配 '/settings' 与 '/api/settings'
        return [new RegExp(`['"\`](?:/api)?/${segStr(p.slice(4))}${tail}`)];
    }
    return [new RegExp(`['"\`]${segStr(p) ? '/' + segStr(p) : ''}${tail}`)];
}

function main() {
    const files: string[] = [];
    for (const pkg of fs.readdirSync(PKG_ROOT)) {
        const srcDir = path.join(PKG_ROOT, pkg);
        if (!fs.statSync(srcDir).isDirectory()) continue;
        collectFiles(srcDir, files);
    }

    // 预编译: 每个 server 路由一个 regex
    const targets = classified.routes
        .filter((r: any) => !r.path.startsWith('__REGEXP__'))
        .map((r: any) => ({ ...r, regexes: pathToRegexes(r.path) }));

    const cache = files.map((f) => {
        const rel = path.relative(ROOT, f).replace(/\\/g, '/');
        const pkg = rel.split('/')[1];
        const isTest = /\.test\.|\.spec\.|__tests__/.test(rel);
        const isSdkModule = rel.startsWith(SDK_MODULE_DIR.replace(ROOT + '/', ''));
        const content = fs.readFileSync(f, 'utf8');
        return { rel, pkg, isTest, isSdkModule, content, lines: content.split('\n') };
    });

    const results = targets.map((t: any) => {
        const sites: Site[] = [];
        for (const c of cache) {
            if (!c.lines.some((l: string) => t.regexes.some((rx: RegExp) => rx.test(l)))) continue;
            // 逐行定位
            c.lines.forEach((lineText, i) => {
                if (t.regexes.some((rx: RegExp) => rx.test(lineText))) {
                    sites.push({ file: c.rel, pkg: c.pkg, line: i + 1, isTest: c.isTest, isSdkModule: c.isSdkModule });
                }
            });
        }
        // mira-app-server 是提供方: 其包内出现的路径多为路由定义/挂载, 不算消费者调用点
        const prod = sites.filter((s) => !s.isTest && !s.isSdkModule && s.pkg !== 'mira-app-server');
        const pkgs = [...new Set(prod.map((s) => s.pkg))];
        return {
            method: t.method,
            path: t.path,
            domain: t.domain,
            category: t.category,
            totalSites: sites.length,
            prodSites: prod.length,
            testSites: sites.filter((s) => s.isTest).length,
            sdkModuleSites: sites.filter((s) => s.isSdkModule).length,
            pkgCount: pkgs.length,
            packages: pkgs,
            sites: sites.slice(0, 50).map((s) => `${s.file}:${s.line}${s.isTest ? ' [test]' : ''}`),
        };
    });

    // 频率分级 (静态证据): F3 >=10 prod调用点 或 >=3 包; F2 3-9 或 2包; F1 1-2 或 1包; F0 无
    for (const r of results) {
        r.frequency = r.prodSites === 0 ? 'F0' : (r.prodSites >= 10 || r.pkgCount >= 3) ? 'F3' : (r.prodSites >= 3 || r.pkgCount >= 2) ? 'F2' : 'F1';
    }

    fs.writeFileSync(path.join(DIR, 'usage-stats.json'), JSON.stringify({
        generatedAt: new Date().toISOString(),
        scannedFiles: cache.length,
        results,
    }, null, 2));

    // 控制台摘要: missing/partial 的频率分布
    const mp = results.filter((r: any) => r.category === 'missing' || r.category === 'partial');
    const freqCount: Record<string, number> = {};
    for (const r of mp) freqCount[r.frequency] = (freqCount[r.frequency] || 0) + 1;
    console.log('missing+partial frequency:', freqCount);
    console.log('--- missing/partial with direct usage (F1+) ---');
    for (const r of mp.filter((x: any) => x.frequency !== 'F0')) {
        console.log(`${r.frequency} ${r.prodSites}pt/${r.pkgCount}pkg  ${r.method.padEnd(6)}${r.path.padEnd(45)} ${r.packages.join(',')}`);
    }
}

main();
