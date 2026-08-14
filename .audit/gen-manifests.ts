/**
 * 生成 server-api-manifest.json 与 sdk-api-manifest.json
 * 用法: cd packages/mira-app-core && npx tsx ../../.audit/gen-manifests.ts
 */
import * as fs from 'fs';
import * as path from 'path';
// 脚本位于包外, 用 createRequire 从 mira-app-core 解析 typescript
const coreRequire = require('module').createRequire(path.resolve(__dirname, '..', 'packages', 'mira-app-core', 'package.json'));
const ts = coreRequire('typescript');

const ROOT = path.resolve(__dirname, '..');
const ROUTES_DIR = path.join(ROOT, 'packages/mira-app-server/src/routes');
const HTTP_SERVER = path.join(ROOT, 'packages/mira-app-server/src/HttpServer.ts');
const SDK_MODULES_DIR = path.join(ROOT, 'packages/mira-app-core/src/shared/sdk/modules');
const OUT_DIR = __dirname;

const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'all', 'upload']);

/** 归一化路径片段: 模板 `${x}` -> :param, 冒号参数 :id -> :param */
function normalizePathPart(expr: ts.Expression): { path: string | null; dynamic: boolean } {
    if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
        return { path: expr.text, dynamic: false };
    }
    if (ts.isTemplateExpression(expr)) {
        let out = expr.head.text;
        let dynamic = false;
        for (const span of expr.templateSpans) {
            const expText = span.expression.getText().replace(/\s+/g, '');
            // query 变量 (如 ${query}): 其后均属 query string, 路径截断
            if (/query|search|qs/i.test(expText)) {
                const qIdx = out.indexOf('?');
                if (qIdx >= 0) out = out.slice(0, qIdx);
                return { path: out, dynamic };
            }
            const cond = span.literal.text;
            if (out.endsWith('/')) {
                out = out + ':param' + (cond.startsWith('/') ? cond : cond ? '/' + cond : '');
            } else {
                out = out + ':param' + cond;
            }
            dynamic = true;
        }
        const qIdx = out.indexOf('?');
        if (qIdx >= 0) out = out.slice(0, qIdx);
        return { path: out, dynamic };
    }
    if (ts.isBinaryExpression && ts.isBinaryExpression(expr)) {
        // path + '/' + id 之类的拼接: 常量段保留, 非常量段 -> :param
        let out = '';
        let dynamic = false;
        const walk = (e: ts.Expression) => {
            if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) {
                walk(e.left);
                walk(e.right);
            } else if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) {
                out += e.text;
            } else if (ts.isTemplateExpression(e)) {
                const r = normalizePathPart(e);
                out += r.path;
                dynamic = dynamic || r.dynamic;
            } else {
                dynamic = true;
                const t = out.replace(/\/$/, '');
                out = t + (t.endsWith(':param') ? '' : '/:param');
            }
        };
        walk(expr);
        return { path: out, dynamic };
    }
    return { path: null, dynamic: true };
}

/** Express 风格 :id -> :param */
function normalizeExpressPath(p: string): string {
    let out = p.replace(/\/:[A-Za-z0-9_]+/g, '/:param');
    if (out.length > 1) out = out.replace(/\/+$/, '');
    return out;
}

function cleanFull(p: string): string {
    let out = '/' + p.split('/').filter(Boolean).join('/');
    if (out.length > 1) out = out.replace(/\/+$/, '');
    return out || '/';
}

function makeSourceFile(abs: string): ts.SourceFile {
    return ts.createSourceFile(abs, fs.readFileSync(abs, 'utf8'), ts.ScriptTarget.Latest, true);
}

interface RouteEntry {
    method: string;
    path: string;        // 归一化完整路径
    rawPath: string | null;
    dynamic: boolean;    // 路径为运行时变量 (插件动态注册)
    domain: string;      // 路由域 (auth/user/...)
    file: string;        // 相对路径
    line: number;
    middlewares: string[];
}

// ---------- 1. 解析 HttpServer.ts: mount prefix + 直接路由 ----------
function parseHttpServer() {
    const sf = makeSourceFile(HTTP_SERVER);
    const mounts: Record<string, string> = {}; // routerGetterCall -> prefix, e.g. "authRouter.getRouter()" -> "/api/auth"
    const directRoutes: { method: string; path: string; line: number }[] = [];
    const staticAssets: string[] = [];
    const streamEndpoints: string[] = [];

    const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node)) {
            const callee = node.expression;
            // 限定 this.app.xxx(...)
            if (ts.isPropertyAccessExpression(callee) &&
                ts.isPropertyAccessExpression(callee.expression) &&
                callee.expression.getText() === 'this.app') {
                const propName = callee.name.text;
                const firstArg = node.arguments[0];
                if (propName === 'use' && firstArg && (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg))) {
                    const secondArg = node.arguments[1];
                    if (secondArg && ts.isCallExpression(secondArg)) {
                        const getterText = secondArg.getText().replace(/\s+/g, '');
                        mounts[getterText] = firstArg.text;
                    }
                }
                // this.app.get('/path', handler)  直接路由
                if (HTTP_METHODS.has(propName) && firstArg) {
                    const r = normalizePathPart(firstArg);
                    if (r.path !== null) {
                        directRoutes.push({ method: propName.toUpperCase(), path: r.path, line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1 });
                    } else {
                        // 正则路由等
                        directRoutes.push({ method: propName.toUpperCase(), path: `__REGEXP__${firstArg.getText()}`, line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1 });
                    }
                }
            }
        }
        node.forEachChild(visit);
    };
    visit(sf);
    return { mounts, directRoutes };
}

// ---------- 2. 解析 routes 文件 ----------
function parseRouteFile(abs: string, mountPrefix: string): RouteEntry[] {
    const sf = makeSourceFile(abs);
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    const entries: RouteEntry[] = [];
    const domain = mountPrefix.replace(/^\/api\/?/, '') || 'api-root';

    const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node) &&
            ts.isPropertyAccessExpression(node.expression) &&
            ts.isPropertyAccessExpression(node.expression.expression) &&
            node.expression.expression.getText() === 'this.router') {
            const m = node.expression.name.text.toLowerCase();
            if (HTTP_METHODS.has(m)) {
                const firstArg = node.arguments[0];
                if (firstArg) {
                    const r = normalizePathPart(firstArg);
                    const middlewares = node.arguments.slice(1)
                        .map((a) => {
                            if (ts.isIdentifier(a)) return a.text;
                            if (ts.isPropertyAccessExpression(a)) return a.getText();
                            if (ts.isArrowFunction(a) || ts.isFunctionExpression(a)) return null; // handler
                            return a.getText().slice(0, 30);
                        })
                        .filter((x): x is string => !!x && x !== 'async');
                    entries.push({
                        method: m.toUpperCase(),
                        path: r.path === null
                            ? `${mountPrefix}/__DYNAMIC__`
                            : normalizeExpressPath(cleanFull(mountPrefix + '/' + r.path)),
                        rawPath: r.path,
                        dynamic: r.path === null,
                        domain,
                        file: rel,
                        line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1,
                        middlewares,
                    });
                }
            }
        }
        node.forEachChild(visit);
    };
    visit(sf);
    return entries;
}

// ---------- 3. 解析 SDK 模块 ----------
interface SdkEntry {
    module: string;
    method: string;      // SDK 方法名
    httpMethod: string;
    path: string;
    file: string;
    line: number;
    hasQuery: boolean;
    hasBody: boolean;
    returnType: string | null;
}

function parseSdkModule(abs: string): SdkEntry[] {
    const sf = makeSourceFile(abs);
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    const moduleName = path.basename(abs, '.ts').replace(/Module$/, '');
    const entries: SdkEntry[] = [];

    const visit = (node: ts.Node) => {
        if (ts.isMethodDeclaration(node) && node.body) {
            const sdkMethodName = node.name.getText();
            const bodyVisit = (n: ts.Node) => {
                if (ts.isCallExpression(n)) {
                    const callee = n.expression;
                    // 形态1: this.httpClient.get/post/put/patch/delete/upload(...)
                    // 形态2: this.httpClient.getAxiosInstance().get/post/...(url, {data})
                    let m: string | null = null;
                    if (ts.isPropertyAccessExpression(callee) &&
                        ts.isPropertyAccessExpression(callee.expression) &&
                        /httpClient|client/.test(callee.expression.getText())) {
                        m = callee.name.text.toLowerCase();
                    } else if (ts.isPropertyAccessExpression(callee) &&
                        ts.isCallExpression(callee.expression) &&
                        ts.isPropertyAccessExpression(callee.expression.expression) &&
                        /getAxiosInstance/.test(callee.expression.expression.getText())) {
                        m = callee.name.text.toLowerCase();
                    }
                    if (m && HTTP_METHODS.has(m)) {
                        const firstArg = n.arguments[0];
                        const r = normalizePathPart(firstArg);
                        // upload() 语义为 multipart POST
                        const httpMethod = m === 'upload' ? 'POST' : m.toUpperCase();
                        let returnType: string | null = null;
                        const callText = n.getText();
                        const gt = callText.match(/(?:getAxiosInstance\(\)\.)?(?:get|post|put|patch|delete|upload)<([^>]+)>/);
                        if (gt) returnType = gt[1];
                        entries.push({
                            module: moduleName,
                            method: sdkMethodName,
                            httpMethod,
                            path: cleanFull(r.path ?? '__DYNAMIC__'),
                            file: rel,
                            line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1,
                            hasQuery: httpMethod === 'GET' || httpMethod === 'DELETE',
                            hasBody: ['POST', 'PUT', 'PATCH'].includes(httpMethod),
                            returnType,
                        });
                    }
                }
                n.forEachChild(bodyVisit);
            };
            bodyVisit(node.body);
        }
        node.forEachChild(visit);
    };
    visit(sf);
    return entries;
}

// ---------- main ----------
function main() {
    const { mounts, directRoutes } = parseHttpServer();

    // mount prefix -> router getter
    const getterToPrefix = mounts;
    // router 文件名推断: authRouter.getRouter() -> AuthRouter.ts 等, 直接扫描全部 routes 文件并尝试匹配
    const routeFiles = fs.readdirSync(ROUTES_DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts') && !/\.test\./.test(f));

    const serverManifest: RouteEntry[] = [];
    const unmatchedFiles: string[] = [];

    for (const f of routeFiles) {
        const abs = path.join(ROUTES_DIR, f);
        const sfText = fs.readFileSync(abs, 'utf8');
        // 找到该文件对应的 mount: 通过 getRouter 所在类 -> HttpServer 里 this.xxxRouter.getRouter()
        // 简化: 提取文件中 class XxxRouter / XxxRoutes, 变量名约定为首字母小写 + Router/Routes
        // 优先 export class (跳过文件内辅助类如 AuthService)
        const classMatch = sfText.match(/export\s+class\s+([A-Za-z0-9_]+)/) || sfText.match(/class\s+([A-Za-z0-9_]+)/);
        let prefix: string | null = null;
        if (classMatch) {
            const className = classMatch[1];
            const lower = className[0].toLowerCase() + className.slice(1);
            for (const [getter, p] of Object.entries(getterToPrefix)) {
                const parts = getter.split('.');
                const receiver = parts.length >= 2 && parts[0] === 'this' ? parts[1] : parts[0];
                if (receiver === lower || receiver === lower.replace(/s$/, '')) { prefix = p; break; }
            }
            // 兜底: 按域名词匹配 (AuthRouter -> /api/auth)
            if (!prefix) {
            for (const [getter, p] of Object.entries(getterToPrefix)) {
                const parts = getter.split('.');
                const receiver = parts.length >= 2 && parts[0] === 'this' ? parts[1] : parts[0];
                const base = className.replace(/(Router|Routes)$/, '').toLowerCase();
                const pBase = p.replace(/^\/api\/?/, '').replace(/-/, '');
                if (base === pBase || base.replace(/s$/, '') === pBase.replace(/s$/, '')) { prefix = p; break; }
            }
            }
        }
        if (prefix) {
            serverManifest.push(...parseRouteFile(abs, prefix));
        } else {
            unmatchedFiles.push(f);
        }
    }

    // HttpServer 直接路由
    const directEntries: RouteEntry[] = directRoutes.map((d) => ({
        method: d.method,
        path: d.path.startsWith('__REGEXP__') ? d.path : normalizeExpressPath(cleanFull(d.path)),
        rawPath: d.path,
        dynamic: d.path.startsWith('__REGEXP__'),
        domain: 'http-server-direct',
        file: 'packages/mira-app-server/src/HttpServer.ts',
        line: d.line,
        middlewares: [],
    }));

    const fullServerManifest = [...serverManifest, ...directEntries];
    fs.writeFileSync(path.join(OUT_DIR, 'server-api-manifest.json'), JSON.stringify({
        generatedAt: new Date().toISOString(),
        mounts: getterToPrefix,
        unmatchedRouteFiles: unmatchedFiles,
        routes: fullServerManifest,
    }, null, 2));

    // SDK manifest
    const sdkFiles = fs.readdirSync(SDK_MODULES_DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts') && !/\.test\./.test(f));
    const sdkEntries: SdkEntry[] = [];
    for (const f of sdkFiles) {
        sdkEntries.push(...parseSdkModule(path.join(SDK_MODULES_DIR, f)));
    }
    fs.writeFileSync(path.join(OUT_DIR, 'sdk-api-manifest.json'), JSON.stringify({
        generatedAt: new Date().toISOString(),
        entries: sdkEntries,
    }, null, 2));

    console.log(`server routes: ${fullServerManifest.length} (unmatched files: ${unmatchedFiles.join(', ') || 'none'})`);
    console.log(`sdk calls: ${sdkEntries.length}`);
}

main();
