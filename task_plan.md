# Task Plan: Mira Server API 与 SDK 覆盖审计

## Goal
建立可重复执行的 Mira Server HTTP API 覆盖审计流程，按实际使用频率决定 SDK 纳入范围，并按 SDK 模块拆分契约测试。

## Current Phase
Phase 5 Batch B (P0 已全部实现并迁移; 下批: User 账户组 P1×4)

## Deliverables
- `server-api-manifest.json`：method、完整路径、路由域、权限、响应类型、来源文件。
- `sdk-api-manifest.json`：SDK 模块、方法、method、完整路径、请求/返回类型。
- `sdk-coverage-report.md`：covered、partial、missing、excluded、dynamic 五类结果。
- `sdk-inclusion-decisions.json`：频率证据、优先级、纳入/排除决定及理由。
- 每个纳入模块独立的 `<Module>.contract.test.ts`。

## Phases

### Phase 1: 建立接口与 SDK 清单
- [x] 解析 `HttpServer.setupRoutes()` 的 mount prefix 和直接注册路由
- [x] 解析 `src/routes` 中 method、相对 path、权限中间件和来源文件
- [x] 解析 SDK 模块的 HttpClient 调用，保留 query/body 形态
- [x] 将动态参数统一为 `:param`，以 method + 完整路径匹配
- [x] 分类为 covered、partial、missing、excluded、dynamic
- **Status:** complete — 146 路由 (covered 58 / partial 1 / missing 67 / excluded 13 / dynamic 7)，固定 JSON API 126 条 100% 分类

### Phase 2: 统计使用频率
- [x] 扫描 monorepo 中的 SDK 调用与直接 HTTP 调用
- [x] 统计每个接口的静态调用点和消费者包数
- [x] 标记登录、库管理、文件读写等关键业务链路
- [ ] 若有日志，按归一化路径统计最近 7/30 天匿名请求量（无日志可依，跳过）
- [x] 为每个接口记录 F0-F3 频率级别和证据来源
- **Status:** complete — F3×2 / F2×6 / F1×49 / F0×11 (missing+partial 口径)；排除 mira-app-server 自身包内路由定义误报

#### 频率分级
| 级别 | 静态证据 | 可选运行时证据 |
|------|----------|----------------|
| F3 高频 | `>=10` 调用点或 `>=3` 个消费者包 | `>=100` 次/日 |
| F2 中频 | `3-9` 调用点或 `2` 个消费者包 | `10-99` 次/日 |
| F1 低频 | `1-2` 调用点或 `1` 个消费者包 | `1-9` 次/日 |
| F0 未使用 | 无仓库调用点 | 观察窗口为 0 |

运行时日志只记录 method、归一化 path、计数；不得保存 token、query 值、body、Cookie 或用户标识。

### Phase 3: 决定 SDK 纳入范围
- [x] 按以下决策矩阵分为 P0/P1/P2/P3
- [x] 标记公共业务 API、内部运维 API、流式/资源 URL、废弃 API
- [x] 为拟纳入接口确定现有模块或新增模块归属
- **Status:** complete — P0×7 (Batch A) / P1×4 (Batch B) / P2×46 (Batch C) / P3×11 排除；待用户审阅 P0/P1

#### 纳入决策
| 优先级 | 规则 | 动作 |
|--------|------|------|
| P0 | F3，或认证/权限/库/文件写入关键路径 | 当前迭代纳入 SDK 并迁移消费者 |
| P1 | F2，或 F1 但被两个以上产品流程复用 | 下一批纳入 SDK |
| P2 | F1 且单一管理页面使用 | 仅在出现第二消费者或重复封装时纳入 |
| P3 | F0、内部诊断、废弃接口 | 不纳入，记录排除理由 |

无论频率如何，静态文件、头像/缩略图/预览资源 URL、SSE 日志流、插件动态路由默认不生成普通 CRUD 方法；需要时提供 URL builder、stream client 或通用 plugin request API。

### Phase 4: 按模块补契约测试
- [x] 新增 `HttpClient.contract.test.ts` 验证 token、解包和错误对象 (7 tests)
- [x] 新增 `SettingsModule.contract.test.ts`、`PluginModule.contract.test.ts` (6 tests)
- [x] 将真实服务测试改名为 `*.integration.test.ts` 并从默认 test 排除（7 个文件）
- [x] 新增 `pnpm test:integration` 脚本 opt-in 运行集成测试
- [ ] Batch B/C 时按模块继续补: User/Admin/FileSystem/Thumbnail/Statistics 等
- **Status:** in progress — 默认套件 10 文件 26 tests 全部无外部依赖, 1.2s 完成

#### 建议测试文件
```text
src/shared/sdk/client/HttpClient.contract.test.ts
src/shared/sdk/modules/AuthModule.contract.test.ts
src/shared/sdk/modules/UserModule.contract.test.ts
src/shared/sdk/modules/AdminModule.contract.test.ts
src/shared/sdk/modules/LibraryModule.contract.test.ts
src/shared/sdk/modules/PluginModule.contract.test.ts
src/shared/sdk/modules/DatabaseModule.contract.test.ts
src/shared/sdk/modules/FileModule.contract.test.ts
src/shared/sdk/modules/DeviceModule.contract.test.ts
src/shared/sdk/modules/TagModule.contract.test.ts
src/shared/sdk/modules/FolderModule.contract.test.ts
src/shared/sdk/modules/CookieSiteModule.contract.test.ts
src/shared/sdk/modules/SystemModule.contract.test.ts
src/shared/sdk/modules/SettingsModule.contract.test.ts
src/shared/sdk/modules/DownloadModule.contract.test.ts
src/shared/sdk/modules/StatisticsModule.contract.test.ts
src/shared/sdk/modules/ThumbnailModule.contract.test.ts
src/shared/sdk/modules/FileSystemModule.contract.test.ts
```

每个 SDK 方法至少断言一次调用 method、完整 path、query/body/config 和 mock 返回值；模块接入还要断言 `MiraClient` 暴露实例、`index.ts` 导出类型。

### Phase 5: 分批实现与迁移
- [x] Batch A：P0 缺口与现有重复 HTTP 封装 — manifest 修正后 P0 实为 3 条（plugins/:param GET、settings GET/PUT），已全部实现：
  - 新增 `SettingsModule`（get/update）+ `MiraClient.settings()` + index 导出 + `ServerSettings` 类型
  - `PluginModule.getById`/`uninstall` 改为服务端真实单查/删除，支持可选 `libraryId` query
  - 顺带修复 `MiraClient.updateConfig` 重建时遗漏 `_tags`/`_folders` 的既有 bug
  - Dashboard 迁移：`api/modules/settings.ts`、`api/modules/plugin.ts`(get/uninstall)、`views/mira/settings/index.vue` 解包适配
  - 审计修正: 原判 P0 的 files/upload、files/cover、tags/delete、folders/delete 实为 SDK 已覆盖（manifest 漏扫 `httpClient.upload()` 与 `getAxiosInstance()` 两种调用形态，已修复）
- [ ] Batch B：P1 公共查询与管理接口（User 账户组 4 条）
- [ ] Batch C：经复审确认需要的 P2
- [ ] Dashboard/Client/Extension 等消费者迁移到 SDK（本批: settings + plugin get/uninstall）
- [x] 每批执行 Core 测试、Core 构建、消费者构建、Server 依赖刷新（本批完成: test 26 通过, build 通过, vue-tsc 通过, server install + procm 重启验证 8081）
- **Status:** in progress

### Phase 6: 验收与持续审计
- [ ] 输出覆盖率报告和明确排除清单
- [ ] CI 检查新增稳定 Server API 是否已 covered 或显式 excluded
- [ ] 完成全量测试和构建验收
- **Status:** pending

## Acceptance Criteria
- 固定 JSON API 路由 100% 被分类，不允许 unknown。
- P0 接口 SDK 覆盖率 100%，P1 接口有明确实现批次。
- 每个 SDK 模块有独立 contract test，默认测试不依赖本地 Server 或固定库 ID。
- SDK 新增方法全部走统一 HttpClient，不自行处理 token 或重复解包。
- `pnpm -C packages/mira-app-core test` 与 `pnpm -C packages/mira-app-core build` 通过。
- 受影响消费者类型检查/构建通过；Core 改动后 Server 工作区重新安装依赖。

## Key Questions
1. 哪些 Server 路由属于稳定公共业务契约，哪些只应保留为内部接口？
2. 使用频率应如何综合静态调用点、消费者数量和关键业务程度？
3. 哪些现有 SDK 测试依赖真实服务数据，需要拆为 mock 契约测试与显式集成测试？

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 使用 method + normalized path 作为覆盖匹配键 | 避免仅按字符串路径导致动态参数与同路径不同方法误判 |
| 频率不是唯一纳入条件 | 登录、健康检查等低调用次数但属于关键路径，仍应高优先级 |
| 默认测试使用 mock HttpClient | 保证 method/path/body/return 契约稳定且不依赖本地真实库 |
| 动态和资源路由不计入普通 JSON 覆盖率 | 需要专用抽象，避免为每个资源路径创建低价值方法 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| 无 | 1 | - |

## Notes
- 保留当前工作区所有既有未提交修改。
- 不采集或记录令牌、Cookie、密码及完整用户标识。
- 执行前先保存当前 dirty worktree 文件清单，只修改审计和目标模块文件。
- 本计划的执行结果应持续更新 `findings.md` 与 `progress.md`。
