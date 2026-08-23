# online_client_plugins — 索引构建与发布

## 构建脚本

仓库根 `scripts/build-client-plugins-index.mjs`（零依赖 Node 脚本）：

- 默认：扫描 `plugins/` → 生成/更新 `plugins.json`（原子写入）
- `--watch`：监听变更自动重建
- `--serve`：8080 端口静态服务（带 CORS），本地联调用
- `--sync <installDir>`：按整目录 sha256 增量同步到本地插件安装目录
- CI 环境下索引过期/不一致时以非零码退出

## 根 package.json 入口

- `pnpm run build:client-plugins-index`
- `pnpm run dev:client-plugins`（watch + serve）

## 发布流程（事实上的约定）

改插件 → 重新构建插件 dist → `build:client-plugins-index` 刷新索引与 checksum → 客户端按索引增量下载。
