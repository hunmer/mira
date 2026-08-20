# 依赖与配置(全仓聚合)

## 包管理

- pnpm workspace,`pnpm-workspace.yaml` 当前显式声明 9 个包 + 2 个 glob(`online_client_plugins/plugins/*`、`plugins/plugins/*/web`)
- 根 `package.json` 名 `@hunmer/mira-monorepo`,private
- `pnpm.onlyBuiltDependencies`:electron、esbuild、sqlite3、sharp(允许原生构建)

```yaml
# pnpm-workspace.yaml(当前)
packages:
  - 'packages/mira-app-core'
  - 'packages/mira-app-server'
  - 'packages/mira-client'
  - 'packages/mira-dashboard-next'
  - 'packages/mira-scripts-core'
  - 'packages/mira-browser-extension'
  - 'packages/mira-plugin-ui'
  - 'packages/vue-masonry'
  - 'packages/vue-selection-box'
  - 'online_client_plugins/plugins/*'
  - 'plugins/plugins/*/web'
```

> **历史清理**(2026-08-11):已删除陈旧条目 `packages/mira-server-sdk-examples`、`packages/n8n-nodes-mira-ws-trigger`(磁盘不存在)。`packages/landing-page`(efferd-ui)未在 workspace.yaml 显式声明,使用独立 lockfile 管理。

## TypeScript 配置

- 根 `tsconfig.json` 用 project references 指向 mira-app-core / mira-app-server
- 客户端使用独立 tsconfig + vue-tsc
- 全仓 strict mode
- landing-page 使用独立 `tsconfig.json` + Next.js

## 环境变量(运行时)

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MIRA_SERVER_HTTP_PORT` / `HTTP_PORT` | 8081 | 服务端 HTTP 端口 |
| `MIRA_SERVER_WS_PORT` / `WS_PORT` | 8018 | 服务端 WebSocket 端口 |
| `DATA_PATH` | `./data` | 数据目录 |
| `FFMPEG_PATH` | -- | ffmpeg 路径(缩略图) |
| `MAGICK_PATH` | -- | ImageMagick 路径(专业格式缩略图) |
| `PAG_BROWSER_PATH` | -- | PAG 插件缩略图渲染所需的 Chrome/Chromium 路径 |

## 平台依赖切换(已移除)

原根目录的 `dependency-switch-config-macos.json`、`dependency-switch-config-windows.json` 及消费它们的 `tool.js` 已从仓库移除(2026-08-20 核实),不再存在悬空引用。

## 共享依赖版本(各包对齐)

| 依赖 | 版本 | 备注 |
|------|------|------|
| TypeScript | ~5.7 | 全仓(landing-page 独立) |
| Vue | 3.5.x | client / dashboard / browser-extension |
| Tailwind CSS | 4.x | client / dashboard(v4,`@import "tailwindcss"`) |
| reka-ui | ^2.x | client / dashboard(shadcn-vue 底层) |
| Electron | ^38 | client |
| Vite | ^6.x | client / dashboard |
| Next.js | 16.x | landing-page(React 19,独立技术栈) |

## 客户端 UI 框架状态(mira-client)

- shadcn-vue 迁移**已完成**,分支 `chore/shadcn-vue-migration` 已合并回 `main`
- `components.json` 位于 `packages/mira-client/`,style=`new-york`,css 指向 `src/renderer/assets/main.css`
- 残留技术债:少量 `radix-vue` 直引待清理;`packages/mira-client/tailwind.config.js` 是 Tailwind v3 死文件(实际主题源是 `main.css` 的 `@theme`)

## 其它根级产物目录

- `dist/`:构建输出
- `data/`:运行时数据(SQLite 等)
- `docs/`:文档产物(含 typedoc / dependency-cruiser 输出)
- `test/`:仓库级测试(若有)
- `scripts/`:构建辅助脚本
