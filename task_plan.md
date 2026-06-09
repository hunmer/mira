# Task Plan: Package Consolidation

## Goal
将 `packages/mira-storage-sqlite` 合并进 `packages/mira-app-core`；将 `packages/mira-server-sdk` 的 shared 能力合并进 `packages/mira-app-core`，并移除 `mira-server-sdk` 对 `mira-app-server` 的依赖。

## Principles
- 保持改动范围聚焦于包边界、导出入口、依赖声明与引用路径。
- 优先复用现有目录结构与构建方式，不引入新的抽象或构建工具。
- 删除被合并包中不再需要的工作区依赖声明，避免重复职责。

## Phases

| Phase | Status | Scope |
| --- | --- | --- |
| 1. Inspect package boundaries | complete | 读取 workspace、包配置、导入关系与导出入口 |
| 2. Move SQLite storage into app-core | complete | 迁移源码、导出入口、依赖与引用 |
| 3. Move server-sdk shared code into app-core | complete | 迁移 shared 能力，解除对 app-server 的依赖 |
| 4. Update workspace references | complete | 更新 package.json、tsconfig、构建脚本、包名引用 |
| 5. Manual verification guidance | complete | 不执行测试，输出具体测试步骤 |

## Decisions
- SQLite 存储入口迁移为 `mira-app-core/storage/sqlite`，避免从 `mira-app-core` 根入口加载 `sqlite3`。
- SDK shared 入口迁移为 `mira-app-core/shared/sdk`，并在 `mira-app-core` 内保留 ESM 构建产物入口。
- `mira-server-sdk` 和 `mira-storage-sqlite` 不再作为 workspace 包维护。
- 不手工编辑 `pnpm-lock.yaml`；后续由 `pnpm install --lockfile-only` 生成一致锁文件。

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| PowerShell 解析包含 `['\"]` 的 `rg` 正则失败 | 1 | 改用固定字符串或简化正则分别扫描 |
