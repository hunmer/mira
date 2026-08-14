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
