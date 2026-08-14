---
name: mira-sdk-coverage-audit
description: 审计 mira-app-server HTTP API 与 mira-app-core SDK 的覆盖状态并增量更新。Use whenever 用户提到 SDK 覆盖率/覆盖审计/manifest、server 新增或修改了 API 路由、要把 axios/fetch 直调迁移到 MiraClient、为某接口决定是否进 SDK、生成 server-api-manifest 或 sdk-coverage-report，或 decide.ts 报"未编码决策"错误。
---

# Mira SDK 覆盖审计与增量更新

对齐 `mira-app-server` 固定 HTTP API 与 `mira-app-core/src/shared/sdk` 的覆盖状态。
匹配键 = HTTP method + 归一化路径（动态参数统一 `:param`，query 不参与）。

## 产物与工具位置

全部在仓库根 `.audit/`，按执行顺序：

| 脚本 | 产物 | 作用 |
|------|------|------|
| `gen-manifests.ts` | `server-api-manifest.json` / `sdk-api-manifest.json` | AST 枚举 Server 全部路由与 SDK 全部 HTTP 调用 |
| `classify.ts` | `coverage-classified.json` / `sdk-coverage-report.md` | 匹配分类 covered/partial/missing/excluded/dynamic |
| `scan-usage.ts` | `usage-stats.json` | 扫描 monorepo 消费者，产出 F0-F3 频率 |
| `decide.ts` | `sdk-inclusion-decisions.json` | 应用 P0-P3 决策矩阵（决策人工编码在脚本内 DECISIONS 表） |

计划文件（事实来源）：根目录 `task_plan.md`、`findings.md`、`progress.md`，执行后同步更新。

## 增量更新流程

### Step 1 重跑流水线

```bash
cd packages/mira-app-core
./node_modules/.bin/ts-node-script -T -O '{"module":"commonjs"}' ../../.audit/gen-manifests.ts
./node_modules/.bin/ts-node-script -T -O '{"module":"commonjs"}' ../../.audit/classify.ts
./node_modules/.bin/ts-node-script -T -O '{"module":"commonjs"}' ../../.audit/scan-usage.ts
./node_modules/.bin/ts-node-script -T -O '{"module":"commonjs"}' ../../.audit/decide.ts
```

`decide.ts` 对未编码的 missing 路由抛 `未编码决策: METHOD path` —— 这就是新增路由检测器：Server 加了新路由而没人做决策时会在这里炸出来。逐条补 DECISIONS 后重跑。

### Step 2 分类解读

- **covered**：SDK 已有等价 method+path，无需动作。
- **partial**：path 匹配但 method 不同，通常是 SDK 缺某个动词（如已有 DELETE 缺 GET）。
- **missing**：无对应方法 → 进入决策。
- **excluded**：资源/流式/SPA/通配。判定必须核实 handler 真实响应形态（`grep createReadStream|sendFile|text/event-stream`），不能凭路径猜。
- **dynamic**：HttpRouter 插件运行时注册，无法静态枚举，永远归此类。

### Step 3 频率分级与决策矩阵

频率（静态证据，scan-usage.ts 自动算）：

| 级别 | 规则 |
|------|------|
| F3 | ≥10 生产调用点 或 ≥3 消费者包 |
| F2 | 3-9 调用点 或 2 包 |
| F1 | 1-2 调用点 或 1 包 |
| F0 | 无仓库消费者 |

决策（编码进 `decide.ts` 的 `DECISIONS`，key 为 `"METHOD path"`）：

| 优先级 | 规则 | 动作 |
|--------|------|------|
| P0 | F3，或认证/权限/库/文件写入关键路径 | 当前迭代纳入 |
| P1 | F2，或 F1 但同组功能有 F2 锚点 | 下一批 |
| P2 | F1 单一管理页面 | 复审后批量纳入 |
| P3 | F0、内部诊断、危险接口（任意 SQL）、图片/文件资源响应 | 不纳入，写明理由 |

无论频率：静态文件、缩略图/预览/原文件流、SSE、头像等图片资源、插件动态路由不建普通 CRUD 方法；图片资源提供 URL builder（参考 `UserModule.getAvatarUrl`）。

### Step 4 实现 SDK 缺口

规范（全部走统一 HttpClient，不自行处理 token 或解包）：

- multipart 上传 → `httpClient.upload()`（语义为 POST）
- DELETE 带 body → `httpClient.delete(url, { data: body })`（axios config.data 原生支持）
- POST 返回文件流 → `httpClient.post(url, data, { responseType: 'blob' })`，extractData 对 Blob 原样返回
- 图片资源（img src 消费）→ `httpClient.getUrl()` 生成鉴权 URL，不建 GET 方法
- base64 JSON 上传不是 multipart（`POST /user/avatar` body 是 `{image}`）
- Server 响应 `{code,data}` / `{success,data}` 由 `HttpClient.extractData` 自动解包；裸数组原样返回。SDK 方法的返回类型 = 解包后的内层，不是 axios response
- 新模块接入三处都不能漏：`MiraClient` 构造器、`updateConfig` 重建段（历史上漏过 `_tags`/`_folders` 导致换 baseURL 后模块挂旧连接）、`index.ts` 导出
- 路径参数一律 `encodeURIComponent()`，可选 query 用 `params: x ? { x } : undefined`

### Step 5 契约测试

- 命名 `modules/<Module>.contract.test.ts`，mock 注入 HttpClient，断言 method、完整 path、params/body 与返回值透传：

```ts
const http = { get: vi.fn().mockResolvedValue(data) };
const module = new XxxModule(http as unknown as HttpClient);
await expect(module.getAll()).resolves.toEqual(data);
expect(http.get).toHaveBeenCalledWith('/api/xxx');
```

- 每个 SDK 新方法至少一条断言；真实服务测试命名 `*.integration.test.ts`（vitest 默认 exclude），显式运行用 `pnpm test:integration`
- 不要在默认测试里连真实 Server 或依赖固定 Library ID

### Step 6 消费者迁移（dashboard）

- `api/modules/<x>.ts` 函数签名保持不变，内部换 `getMiraClient().xxx()`，视图层调用点按三类模式适配：
  1. `res.data`（数组/对象）→ `res`
  2. `res.data?.success` + `res.data.data`（`{success,data}` 包裹）→ 直接 `res`，失败走 catch
  3. `res.data?.success` + `res.data.message`（`{success,message}` 无 data 字段，extractData 原样返回）→ `res?.success` / `res?.message`
- 手拼资源 URL 改 SDK URL builder
- 认证流程（login/logout/me/register）敏感，单独批次迁移，不顺手

### Step 7 验收链

1. `pnpm -C packages/mira-app-core test`（全过、秒级完成、无外部依赖）
2. `pnpm -C packages/mira-app-core build`
3. core 有变更时：`cd packages/mira-app-server && pnpm install` 刷新依赖
4. 用 procm-mcp 重启 mira-app-server dev 进程，日志确认 8081 端口启动
5. dashboard：`npx vue-tsc -b --force` 无错误
6. 重跑 Step 1 流水线，确认目标优先级清零、无 `未编码决策` 报错
7. 同步更新 `task_plan.md` / `findings.md` / `progress.md`

## 已知坑（历史上真实发生过，勿重蹈）

1. **SDK 调用形态漏扫**：`gen-manifests.ts` 的 `parseSdkModule` 必须覆盖 HttpClient 全部公开方法（`get/post/put/patch/delete/upload` + `getAxiosInstance()` 直调）。漏扫会把已覆盖接口误判成缺口（upload 和 getAxiosInstance 都栽过）。新增 HttpClient 方法时同步该函数。
2. **短路径双前缀**：dashboard axios baseURL 以 `/api` 结尾，代码写 `'/settings'`。`scan-usage.ts` 正则必须 `(?:/api)?` 可选前缀 + 引号边界 `['"\`]`，否则系统性漏报（曾把 40+ 调用点漏成 F0）。
3. **Vue Router path 误报**：`'/settings'` 同时是前端路由 path。复核调用点时区分 HTTP 调用与 router 配置。
4. **提供方排除**：`mira-app-server` 包内路由定义/挂载行会被误计为调用点，`scan-usage.ts` 已按包排除。
5. **SSE/资源误判**：`install/stream` 名字不带 stream 语义但 是 SSE；判定 excluded 必须看 handler 响应代码。

## 现状基线（2026-08-14，Batch A/B/C 完成后）

- covered 114 / partial 0 / missing 12（全部 P3 显式排除）/ excluded 13 / dynamic 7
- SDK 模块：Auth、User、Library、Plugin、File、Database、Device、System、Tag、Folder、CookieSite、Settings、Admin、Download、FileSystem、Statistics、Thumbnail
- 排除理由与证据见 `sdk-inclusion-decisions.json`；测试基线 17 文件 68 tests
- `mira_mobile` 有行为对齐的 Dart 版 SDK（`lib/mira_sdk/`），TS 新增方法未同步，按需补齐
