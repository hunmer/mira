# Task Plan: Mira Server API 与 SDK 覆盖审计

## Goal
建立可重复执行的 Mira Server HTTP API 覆盖审计流程，按实际使用频率决定 SDK 纳入范围，并按 SDK 模块拆分契约测试。

## Current Phase
Phase 1

## Phases

### Phase 1: 建立接口与 SDK 清单
- [ ] 从 Server 路由注册提取 method、path、所属模块、权限要求
- [ ] 从 Core SDK 提取模块方法及其 method、path
- [ ] 生成 Server API -> SDK 方法映射表
- **Status:** in_progress

### Phase 2: 统计使用频率
- [ ] 扫描 monorepo 中的 SDK 调用与直接 HTTP 调用
- [ ] 统计静态调用点、调用包数、UI/CLI/插件关键路径
- [ ] 可选读取匿名化服务端访问日志补充运行时频次
- **Status:** pending

### Phase 3: 决定 SDK 纳入范围
- [ ] 按 P0/P1/P2/P3 规则分级
- [ ] 标记公共业务 API、内部运维 API、流式/资源 URL、废弃 API
- [ ] 为拟纳入接口确定现有模块或新增模块归属
- **Status:** pending

### Phase 4: 按模块补契约测试
- [ ] 为每个 SDK 模块创建独立 contract test 文件
- [ ] 覆盖 HTTP method、path、query/body、响应解包与错误透传
- [ ] 消除依赖固定真实库 ID 的默认单元测试
- **Status:** pending

### Phase 5: 分批实现与迁移
- [ ] 先实现 P0，再实现 P1
- [ ] Dashboard/Client/Extension 等消费者迁移到 SDK
- [ ] 每批执行 Core 测试、Core 构建、消费者构建、Server 依赖刷新
- **Status:** pending

### Phase 6: 验收与持续审计
- [ ] 输出覆盖率报告和明确排除清单
- [ ] 在 CI 中加入路由覆盖差异检查
- [ ] 完成全量测试和构建验收
- **Status:** pending

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

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| 无 | 1 | - |

## Notes
- 保留当前工作区所有既有未提交修改。
- 不采集或记录令牌、Cookie、密码及完整用户标识。
- 本计划的执行结果应更新 `findings.md` 与 `progress.md`。
