# Findings & Decisions: Mira Server API 与 SDK 覆盖审计

## Requirements
- 枚举 `mira-app-server` 暴露的 HTTP 接口。
- 判断 `mira-app-core/shared/sdk` 是否存在等价方法。
- 按实际使用频率和业务关键程度决定是否纳入 SDK。
- SDK 测试按模块拆分为多个文件。
- 测试至少覆盖 method、path、请求参数/请求体、返回值。

## Research Findings
- Server 路由主要位于 `packages/mira-app-server/src/routes`，还需检查插件和动态路由注册。
- SDK 入口位于 `packages/mira-app-core/src/shared/sdk/index.ts`，模块位于 `src/shared/sdk/modules`。
- Dashboard 已开始迁移 CookieSite、Library 和 System health；工作区存在其他并行未提交修改，审计不得覆盖。
- 现有部分 SDK 测试访问真实 Server 和固定 Library ID，不适合作为稳定默认单元测试。
- `HttpServer.setupRoutes()` 固定挂载 16 个 `/api` 路由域：auth、admins、user、libraries、plugins、database、files、devices、tags、folders、fs、settings、cookie-sites、download、statistics、thumb。
- `HttpServer.ts` 还直接注册 `/api/plugin-routes*`、`/api/health`、`/api/logs/stream`、`/health` 和静态资源路由；静态资源与流式端点不应默认计入普通 JSON SDK 覆盖率。
- `HttpRouter` 暴露插件运行时动态路由，无法只靠静态路径一对一纳入 SDK；应以通用插件请求能力或明确排除记录处理。
- 当前 SDK 固定模块为 Auth、CookieSite、Database、Device、File、Folder、Library、Plugin、System、Tag、User；Server 的 Admin、Settings、Statistics、Thumbnail、Fs、Download 尚无独立对应模块。
- 现有测试文件包括 Auth、CookieSite、Database、Library、Plugin、System、TagAndFolder、User、File；其中 CookieSite 与 Library contract 使用 mock，Auth/Database/Library/Plugin/TagAndFolder/User 多数访问真实 Server。
- Dashboard 仍有数据库页、插件路由、路径选择组件直接使用 Axios，不能只扫描 `src/api/modules`。

### 审计执行发现 (2026-08-14 Phase 1-3)
- AST 脚本（`.audit/gen-manifests.ts`）枚举 Server 146 条路由：covered 58 / partial 1 / missing 67 / excluded 13 / dynamic 7；固定 JSON API 126 条 100% 分类，无 unknown。
- partial 唯一一条：`GET /api/plugins/:param`，SDK 有同路径 DELETE（uninstall）但缺 GET 单查。
- 权限不在路由级中间件：全部走全局 `createHttpPermissionMiddleware` + settingsManager 运行时配置，AST 无法静态判定每路由权限，manifest 记录 `middlewares: []`。
- 资源/流式端点（thumb/preview/file/extra 为 createReadStream，install/stream 与 logs/stream 为 SSE，icon 为文件响应）按决策归 excluded，不占普通 CRUD 覆盖率；SDK FileModule 现有 `extra` 方法属资源 URL 访问，一并归 excluded 复核。
- BaseRouter（基类）与 WebSocketRouter（非 HTTP）不参与清单。
- Dashboard axios client baseURL 以 `/api` 结尾，模块代码写短路径（`'/settings'`），频率扫描必须同时匹配带/不带 `/api` 前缀两种形态并加引号边界，否则系统性漏报（初版扫描把 40+ 调用点漏成 F0）。
- `mira-app-server` 包内出现的 API 路径多为路由定义/挂载行，频率统计需按"提供方"排除，否则 `HttpServer.ts` 的 `app.use('/api/settings',...)` 会被误计为调用点。
- mira_mobile、mira-browser-extension、landing-page 等包在直接 HTTP 调用上贡献为 0（或走 SDK），当前直接调用消费者只有 mira-client、mira-dashboard-next、mira-app-core。
- 频率分布（missing+partial 67 条）：F3×2（files/upload、plugins/:param GET）、F2×6（files/cover、folders/delete、settings×2、tags/delete、user/avatar/:param）、F1×49（几乎全部为 dashboard 单包管理页）、F0×11（devices 消息×3、libraries SQL 直查×5、plugins start/stop、plugin-routes）。
- 决策结果：P0×7（upload、cover、folders/delete、tags/delete、plugins/:param GET、settings GET/PUT）、P1×4（user 账户组）、P2×46（Admin×8、FileSystem×14、Thumbnail×9、Plugin 管理×7、Statistics×4、Device×2、Database×1、Download×1）、P3×11。

### Batch A 执行发现 (2026-08-14 Phase 4-5)
- **manifest 漏扫修正**：SDK 侧 `httpClient.upload()`（multipart POST，FileModule.upload/setCover/writeFile 用）与 `getAxiosInstance().METHOD()`（TagModule.delete 用）两种调用形态初版未扫到，导致 4 条 P0 误判为缺口；修复后 P0 实为 3 条，全部在本批实现。教训：SDK 调用形态枚举必须覆盖 HttpClient 全部公开方法。
- 短路径频率扫描的固有误报：Vue Router 的路由 path（如 `'/settings'`）与 API 短路径同名，mira-client 三处 settings 命中全是前端路由；复核调用点时需人工区分（HTTP 调用上下文 vs router 配置）。
- `PluginModule.getById` 原实现是 getAll+客户端过滤（非服务端单查）；Server `GET/DELETE /api/plugins/:id` 均接受可选 `libraryId` query 定位同名多库插件，SDK 两个方法都补了该参数。
- `MiraClient.updateConfig` 重建模块时遗漏 `_tags`/`_folders`（既有 bug，updateConfig 后 tags/folders 仍挂旧 httpClient），已顺带修复。
- 测试拆分落地：7 个依赖真实 Server 的测试改名 `*.integration.test.ts`，vitest 默认 exclude；`pnpm test` 10 文件 26 tests 1.2s 无外部依赖通过；新增 `pnpm test:integration`。
- `GET /api/settings` 真实响应 `{"code":0,"data":{authRequired,allowRegistration}}`（无需 token），HttpClient extractData 自动解包，与 SettingsModule 契约一致（已对运行中 server 验证）。
- mira_mobile 存在与 TS SDK 行为对齐的 Dart 版 SDK（`lib/mira_sdk/`），TS SDK 新增方法暂未同步 Dart 版，列为后续优化。
- 最新覆盖：covered 65 / partial 0 / missing 61，P0 清零；P1×4（User 账户组）为 Batch B。

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| 输出机器可读 JSON/CSV 清单和人工可读 Markdown 报告 | 支持 CI 差异检查和人工决策 |
| 路径归一化动态参数为 `:param` | 便于 Server 与 SDK 模板字符串匹配 |
| 使用四级优先级 P0-P3 | 兼顾频率、消费者广度、业务关键性与维护成本 |
| 测试文件命名 `<Module>.contract.test.ts` | 与现有真实服务集成测试区分 |
| 流式、静态资源、插件动态路由单独分类 | 这类端点不适合强行建普通 JSON CRUD SDK 方法 |
| 默认 `pnpm test` 仅运行无外部依赖测试 | 保证 CI 可重复；真实服务测试改为显式 integration 脚本 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| 真实服务测试受本地库数据影响 | 计划拆分为 mock contract tests 与 opt-in integration tests |

## Resources
- `packages/mira-app-server/src/routes`
- `packages/mira-app-core/src/shared/sdk`
- `packages/mira-dashboard-next/src/api/modules`
- `C:/Users/ADMINI~1/AppData/Local/Temp/mira-dashboard-sdk-api-handoff.md`

## Visual/Browser Findings
- 未使用浏览器或视觉材料。
