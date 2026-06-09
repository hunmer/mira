# Progress: Package Consolidation

## 2026-06-09
- 创建规划文件，开始调研包边界与依赖关系。
- 完成初步包配置与引用扫描，准备读取源码入口与 TS 配置。
- 读取核心入口、SQLite 入口、SDK 入口与 TS 配置；确认需要用子入口隔离 SQLite 与 SDK。
- 将 SQLite 源码迁入 `packages/mira-app-core/src/storage/sqlite`。
- 将 SDK shared 源码迁入 `packages/mira-app-core/src/shared/sdk`。
- 更新 `mira-app-core` 子入口、依赖与 SDK ESM 构建配置。
- 更新服务端、客户端、脚本与插件运行时代码导入路径。
- 移除旧 workspace 包配置与旧包目录。
- 运行 `pnpm install --lockfile-only` 同步 lockfile，未执行构建或测试。
- 完成最终旧包名导入与配置残留扫描。
