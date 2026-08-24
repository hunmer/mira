/**
 * Phase 3: 按决策矩阵生成 sdk-inclusion-decisions.json
 * P0 = F3 或 认证/权限/库/文件写入关键路径 -> Batch A
 * P1 = F2, 或 F1 但同组功能有 F2 锚点 -> Batch B
 * P2 = F1 单一管理页面 -> Batch C (复审确认后纳入)
 * P3 = F0/内部诊断/危险接口 -> 不纳入, 记录理由
 * 用法: cd packages/mira-app-core && ./node_modules/.bin/ts-node-script -T -O '{"module":"commonjs"}' ../../.audit/decide.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const DIR = __dirname;
const usage = JSON.parse(fs.readFileSync(path.join(DIR, 'usage-stats.json'), 'utf8'));
const classified = JSON.parse(fs.readFileSync(path.join(DIR, 'coverage-classified.json'), 'utf8'));

// 人工决策编码: key = "METHOD path"
const DECISIONS: Record<string, { priority: 'P0' | 'P1' | 'P2' | 'P3'; module: string; reason: string }> = {
    // --- P0: F3 或 文件/配置写入关键路径 ---
    'POST /api/files/upload': { priority: 'P0', module: 'File', reason: 'F3 8pt/3pkg; 文件写入关键路径' },
    'GET /api/plugins/:param': { priority: 'P0', module: 'Plugin', reason: 'F3 14pt/3pkg; SDK 已有 DELETE 缺 GET 单查(partial)' },
    'POST /api/files/cover/:param/:param': { priority: 'P0', module: 'File', reason: 'F2 2pkg + 文件元数据写入路径' },
    'GET /api/settings': { priority: 'P0', module: 'Settings', reason: 'F2 7pt/2pkg; 服务端核心配置, 新增 SettingsModule' },
    'PUT /api/settings': { priority: 'P0', module: 'Settings', reason: 'F2 7pt/2pkg; 服务端核心配置, 新增 SettingsModule' },
    'DELETE /api/folders/delete': { priority: 'P0', module: 'Folder', reason: 'F2 2pkg; 库数据删除关键路径, SDK Folder 缺删除能力' },
    'DELETE /api/tags/delete': { priority: 'P0', module: 'Tag', reason: 'F2 2pkg; 库数据删除关键路径, SDK Tag 缺删除能力' },

    // --- P1: F2 锚点 + 同组账户功能整批 ---
    'GET /api/user/avatar/:param': { priority: 'P3', module: 'User', reason: '头像为图片资源响应(sendFile); SDK 已提供 getAvatarUrl() URL builder, 按资源接口决策不建普通 GET 方法' },
    'POST /api/user/avatar': { priority: 'P1', module: 'User', reason: '同组账户功能(头像上传), 与 avatar GET 同批成本最低' },
    'PUT /api/user/change-password': { priority: 'P1', module: 'User', reason: '同组账户功能(安全), UserModule 扩展' },
    'GET /api/user/tokens': { priority: 'P1', module: 'User', reason: '同组账户功能(token 管理), UserModule 扩展' },

    // --- P2: 单一 dashboard 管理页消费, Batch C 复审 ---
    'GET /api/admins': { priority: 'P2', module: 'Admin', reason: 'F1 1pkg 管理员页; AdminModule 候选' },
    'POST /api/admins': { priority: 'P2', module: 'Admin', reason: 'F1 1pkg 管理员页' },
    'PUT /api/admins/:param': { priority: 'P2', module: 'Admin', reason: 'F1 1pkg 管理员页' },
    'DELETE /api/admins/:param': { priority: 'P2', module: 'Admin', reason: 'F1 1pkg 管理员页' },
    'GET /api/admins/:param/tokens': { priority: 'P2', module: 'Admin', reason: 'F1 1pkg 管理员页' },
    'POST /api/admins/:param/tokens': { priority: 'P2', module: 'Admin', reason: 'F1 1pkg 管理员页' },
    'PUT /api/admins/:param/tokens/:param': { priority: 'P2', module: 'Admin', reason: 'F1 1pkg 管理员页' },
    'DELETE /api/admins/:param/tokens/:param': { priority: 'P2', module: 'Admin', reason: 'F1 1pkg 管理员页' },
    'POST /api/database/query': { priority: 'P2', module: 'Database', reason: 'F1 1pkg 数据库页; DatabaseModule 补 query' },
    'POST /api/devices/broadcast': { priority: 'P2', module: 'Device', reason: 'F1 1pkg 设备页' },
    'POST /api/devices/:param/disconnect': { priority: 'P2', module: 'Device', reason: 'F1 1pkg 设备页' },
    'GET /api/download/progress/:param': { priority: 'P2', module: 'Download', reason: 'F1 1pkg; 与 covered 的 download/start 同组' },
    'POST /api/fs/mkdir': { priority: 'P2', module: 'FileSystem', reason: 'F1 1pkg 文件管理页; FsModule 候选' },
    'GET /api/fs/dirs': { priority: 'P2', module: 'FileSystem', reason: 'F1 1pkg 文件管理页(路径选择组件复用)' },
    'GET /api/fs/list': { priority: 'P2', module: 'FileSystem', reason: 'F1 1pkg 文件管理页' },
    'POST /api/fs/move': { priority: 'P2', module: 'FileSystem', reason: 'F1 1pkg 文件管理页' },
    'POST /api/fs/remove': { priority: 'P2', module: 'FileSystem', reason: 'F1 1pkg 文件管理页' },
    'POST /api/fs/sync': { priority: 'P2', module: 'FileSystem', reason: 'F1 1pkg 文件管理页' },
    'GET /api/fs/database/missing': { priority: 'P2', module: 'FileSystem', reason: 'F1 1pkg 文件管理页(库一致性)' },
    'DELETE /api/fs/database/missing': { priority: 'P2', module: 'FileSystem', reason: 'F1 1pkg 文件管理页' },
    'POST /api/fs/database/new': { priority: 'P2', module: 'FileSystem', reason: 'F1 1pkg 文件管理页' },
    'POST /api/fs/database/new/import': { priority: 'P2', module: 'FileSystem', reason: 'F1 1pkg 文件管理页' },
    'DELETE /api/fs/database/new': { priority: 'P2', module: 'FileSystem', reason: 'F1 1pkg 文件管理页' },
    'POST /api/fs/database/duplicates': { priority: 'P2', module: 'FileSystem', reason: 'F1 1pkg 文件管理页' },
    'DELETE /api/fs/database/duplicates': { priority: 'P2', module: 'FileSystem', reason: 'F1 1pkg 文件管理页' },
    'POST /api/fs/download': { priority: 'P2', module: 'FileSystem', reason: 'F1 1pkg 文件管理页' },
    'POST /api/plugins/sync-meta': { priority: 'P2', module: 'Plugin', reason: 'F1 1pkg 插件页' },
    'POST /api/plugins/upload': { priority: 'P2', module: 'Plugin', reason: 'F1 1pkg 插件页' },
    'POST /api/plugins/toggle-status': { priority: 'P2', module: 'Plugin', reason: 'F1 1pkg 插件页' },
    'POST /api/plugins/disable-all': { priority: 'P2', module: 'Plugin', reason: 'F1 1pkg 插件页' },
    'GET /api/plugins/:param/config': { priority: 'P2', module: 'Plugin', reason: 'F1 1pkg 插件页' },
    'PUT /api/plugins/:param/config': { priority: 'P2', module: 'Plugin', reason: 'F1 1pkg 插件页' },
    'GET /api/statistics/:param/upload': { priority: 'P2', module: 'Statistics', reason: 'F1 1pkg 统计页; StatisticsModule 候选' },
    'GET /api/statistics/:param/upload/daily': { priority: 'P2', module: 'Statistics', reason: 'F1 1pkg 统计页' },
    'GET /api/statistics/:param/file-types': { priority: 'P2', module: 'Statistics', reason: 'F1 1pkg 统计页' },
    'GET /api/statistics/:param/recent-uploads': { priority: 'P2', module: 'Statistics', reason: 'F1 1pkg 统计页' },
    'GET /api/thumb/scan': { priority: 'P2', module: 'Thumbnail', reason: 'F1 1pkg 缩略图管理页; ThumbnailModule 候选' },
    'GET /api/thumb/progress': { priority: 'P2', module: 'Thumbnail', reason: 'F1 1pkg 缩略图管理页' },
    'GET /api/thumb/cancel': { priority: 'P2', module: 'Thumbnail', reason: 'F1 1pkg 缩略图管理页' },
    'GET /api/thumb/stats': { priority: 'P2', module: 'Thumbnail', reason: 'F1 1pkg 缩略图管理页' },
    'GET /api/thumb/generators': { priority: 'P2', module: 'Thumbnail', reason: 'F1 1pkg 缩略图管理页' },
    'GET /api/thumb/sync': { priority: 'P2', module: 'Thumbnail', reason: 'F1 1pkg 缩略图管理页' },
    'GET /api/thumb/metadata/stats': { priority: 'P2', module: 'Thumbnail', reason: 'F1 1pkg 缩略图管理页' },
    'GET /api/thumb/metadata/scan': { priority: 'P2', module: 'Thumbnail', reason: 'F1 1pkg 缩略图管理页' },
    'GET /api/thumb/metadata/progress': { priority: 'P2', module: 'Thumbnail', reason: 'F1 1pkg 缩略图管理页' },
    'GET /api/plugin-routes/:param': { priority: 'P2', module: 'Plugin', reason: 'F1 1pkg 插件页; 若建通用 plugin request API 则配套' },

    // --- P3: F0 无消费者 / 内部诊断 / 危险接口 ---
    'POST /api/devices/:param/message': { priority: 'P3', module: '-', reason: 'F0 无仓库消费者' },
    'POST /api/devices/:param/test': { priority: 'P3', module: '-', reason: 'F0 无仓库消费者' },
    'GET /api/devices/:param/messages': { priority: 'P3', module: '-', reason: 'F0 无仓库消费者' },
    'GET /api/libraries/:param/stats': { priority: 'P3', module: '-', reason: 'F0; 内部诊断, 与 statistics 域重复' },
    'POST /api/libraries/:param/query': { priority: 'P3', module: '-', reason: 'F0; 任意 SQL 直查, 内部诊断能力, database/query 已覆盖等价需求' },
    'POST /api/libraries/:param/execute': { priority: 'P3', module: '-', reason: 'F0; 任意 SQL 执行, 危险接口不纳入' },
    'GET /api/libraries/:param/schema/:param': { priority: 'P3', module: '-', reason: 'F0; database/tables 已覆盖等价需求' },
    'PUT /api/libraries/:param/record/:param/:param': { priority: 'P3', module: '-', reason: 'F0; 任意记录写入, 危险接口不纳入' },
    'POST /api/plugins/:param/start': { priority: 'P3', module: '-', reason: 'F0 无仓库消费者' },
    'POST /api/plugins/:param/stop': { priority: 'P3', module: '-', reason: 'F0 无仓库消费者' },
    'GET /api/plugin-routes': { priority: 'P3', module: '-', reason: 'F0; 插件动态路由发现端点, 建通用 plugin request 时再评估' },
    'GET /api/devices/share/:param': { priority: 'P3', module: 'Device', reason: '文件流响应(createReadStream/zip); 票据免token下载, 创建侧已由 DeviceModule.createShareTicket 覆盖(P0 组), 下载 URL 由调用方拼接' },
    'GET /api/plugins/store': { priority: 'P2', module: 'Plugin', reason: 'F1 1pkg dashboard 插件商店页; PluginModule 候选(与 store 安装同组)' },
};

function main() {
    const usageByKey = new Map<string, any>();
    for (const r of usage.results) usageByKey.set(`${r.method} ${r.path}`, r);

    const out: any[] = [];
    let missing = 0;
    for (const r of classified.routes) {
        if (r.category === 'covered') continue; // 已覆盖无需纳入决策
        if (r.category === 'excluded' || r.category === 'dynamic') {
            out.push({ method: r.method, path: r.path, category: r.category, priority: '-', module: '-', reason: r.note || 'resource/stream/dynamic' });
            continue;
        }
        missing++;
        const key = `${r.method} ${r.path}`;
        const d = DECISIONS[key];
        const u = usageByKey.get(key);
        if (!d) throw new Error(`未编码决策: ${key}`);
        out.push({
            method: r.method,
            path: r.path,
            category: r.category,
            frequency: u?.frequency ?? 'F0',
            prodSites: u?.prodSites ?? 0,
            pkgCount: u?.pkgCount ?? 0,
            packages: u?.packages ?? [],
            priority: d.priority,
            module: d.module,
            batch: d.priority === 'P0' ? 'A' : d.priority === 'P1' ? 'B' : d.priority === 'P2' ? 'C' : null,
            reason: d.reason,
            evidence: (u?.sites ?? []).filter((s: string) => !s.includes('mira-app-server')).slice(0, 8),
        });
    }

    const summary: Record<string, number> = {};
    for (const o of out) {
        const k = o.category === 'missing' || o.category === 'partial' ? o.priority : o.category;
        summary[k] = (summary[k] || 0) + 1;
    }
    const doc = { generatedAt: new Date().toISOString(), summary, decisions: out };
    fs.writeFileSync(path.join(DIR, 'sdk-inclusion-decisions.json'), JSON.stringify(doc, null, 2));

    console.log('summary:', summary);
    console.log('\n=== P0 (Batch A) ===');
    for (const o of out.filter((x) => x.priority === 'P0')) console.log(`  ${o.method.padEnd(7)}${o.path.padEnd(45)}-> ${o.module}`);
    console.log('=== P1 (Batch B) ===');
    for (const o of out.filter((x) => x.priority === 'P1')) console.log(`  ${o.method.padEnd(7)}${o.path.padEnd(45)}-> ${o.module}`);
    console.log('=== P2 模块分组 (Batch C) ===');
    const byMod: Record<string, number> = {};
    for (const o of out.filter((x) => x.priority === 'P2')) byMod[o.module] = (byMod[o.module] || 0) + 1;
    console.log(' ', JSON.stringify(byMod));
    console.log('=== P3 (排除) ===', out.filter((x) => x.priority === 'P3').length, '条');
}

main();
