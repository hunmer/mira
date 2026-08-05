# 测试与质量(全仓聚合)

## 测试现状

| 包 | 测试方案 | 命令 |
|----|----------|------|
| mira-app-core | 无 | -- |
| mira-app-server | Jest(`sdk/` 目录) | `pnpm run test`(= `jest --config sdk/jest.config.js`) |
| mira-client | 无独立测试;以类型检查 + 三段构建为门禁 | `pnpm run type-check`、`pnpm run build:all` |
| mira-dashboard-next | 无 | -- |
| mira-scripts-core | 无 | -- |
| mira-doc | 无 | -- |

> 全仓整体测试覆盖率偏低,仅 server 的 SDK 层有 Jest。多数包以"能构建通过"作为回归门禁。

## 类型检查

- 客户端:`vue-tsc --noEmit`(`pnpm run type-check`)
- 其它包:`tsc`(经 build 流程隐式执行)

## Lint

- mira-client:ESLint 9,`pnpm run lint`(`eslint . --ext .vue,.js,.ts... --fix`)
- 全仓无统一 lint 根脚本

## 依赖分析工具(仅客户端)

- `dependency-cruiser`:`pnpm run analyze:deps`(输出 `docs/dependencies.html`)
- `vite-bundle-analyzer`:`pnpm run analyze:bundle`
- `typedoc`:`pnpm run docs`(生成 API 文档)

## 质量风险

- 客户端无单测,shadcn-vue 迁移期依赖人工视觉回归 QA
- 服务端原生依赖(sqlite3 / sharp / ffmpeg)跨平台安装易出错,有 `dependency-switch-config-{macos,windows}.json` 缓解
- `pnpm-workspace.yaml` 含 2 个磁盘不存在的陈旧包条目,可能引发 install 警告
