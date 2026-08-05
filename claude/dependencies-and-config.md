# 依赖与配置(全仓聚合)

## 包管理

- pnpm workspace,`pnpm-workspace.yaml` 列出 6 个实际包 + 2 个陈旧条目(磁盘不存在)
- 根 `package.json` 名 `@hunmer/mira-monorepo`,private
- `pnpm.onlyBuiltDependencies`:electron、esbuild、sqlite3、sharp(允许原生构建)
- `pnpm.overrides`:`mira_duplicate_scanner` 链接到全局 pnpm 目录(本地开发 override)

## TypeScript 配置

- 根 `tsconfig.json` 用 project references 指向 mira-app-core / mira-app-server
- 客户端使用独立 tsconfig + vue-tsc
- 全仓 strict mode

## 环境变量(运行时)

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MIRA_SERVER_HTTP_PORT` / `HTTP_PORT` | 8081 | 服务端 HTTP 端口 |
| `MIRA_SERVER_WS_PORT` / `WS_PORT` | 8018 | 服务端 WebSocket 端口 |
| `DATA_PATH` | `./data` | 数据目录 |
| `FFMPEG_PATH` | -- | ffmpeg 路径(缩略图) |
| `MAGICK_PATH` | -- | ImageMagick 路径(专业格式缩略图) |

## 平台依赖切换

根目录存在 `dependency-switch-config-macos.json` 与 `dependency-switch-config-windows.json`,用于跨平台原生依赖(esbuild/electron/sqlite3)切换。

## 共享依赖版本(各包对齐)

| 依赖 | 版本 | 备注 |
|------|------|------|
| TypeScript | ~5.7 | 全仓 |
| Vue | 3.5.13 | client / dashboard |
| Tailwind CSS | 4.0.17 | client / dashboard(v4,`@import "tailwindcss"`) |
| reka-ui | ^2.9.7 | client / dashboard(shadcn-vue 底层) |
| Electron | ^38.8.6 | client |
| Vite | ^6.2 | client / dashboard |

## 客户端 UI 框架迁移要点(mira-client)

- 当前分支 `chore/shadcn-vue-migration` 已到**晚期**:`volt/` 自研库已删,`--mira-*`/`--surface-*` 自定义变量已全部迁到 shadcn 语义 token
- `components.json`(shadcn-vue 配置)位于 `packages/mira-client/`,style=`new-york`,css 指向 `src/renderer/assets/main.css`
- **死文件警告**:`packages/mira-client/tailwind.config.js` 是 Tailwind v3 遗留,**未被任何 vite/postcss 引用**,实际主题源是 `main.css` 的 `@theme`
- 残留技术债:2 处 `radix-vue` 直引待清理;弹出层动画在 dev 下未生效(见 `handoff-dropdown-animation.md`)

## 其它根级产物目录

- `dist/`:构建输出
- `data/`:运行时数据(SQLite 等)
- `docs/`:文档产物(含 typedoc / dependency-cruiser 输出)
- `test/`:仓库级测试(若有)
- `scripts/`:构建辅助脚本
