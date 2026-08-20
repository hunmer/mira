# 入口与启动

> 仓库级编排入口。各包独立入口见对应包 `claude/entrypoints.md`。

## 根级编排脚本(package.json)

| 脚本 | 作用 |
|------|------|
| `pnpm run build:core` | 构建 mira-app-core(`pnpm -C packages/mira-app-core run rebuild`) |
| `pnpm run build:server` | 构建 mira-app-server |
| `pnpm run build:plugins` | 构建客户端插件集合 |
| `pnpm run build:client-plugins-index` | 生成客户端插件索引(`scripts/build-client-plugins-index.mjs`) |
| `pnpm run dev:client-plugins` | 监听式重建客户端插件索引 |
| `pnpm run start:server` | 一键构建并启动:`build:core && build:server && build:plugins` |

## 工作区发现

- 工具:pnpm workspace(`pnpm-workspace.yaml`),**无** turbo / nx / lerna
- `tsconfig.json`(根)使用 project references 指向 mira-app-core 与 mira-app-server
- 根目录无应用入口,实际运行入口在各包内

## 各包入口速查

| 包 | 入口 | 启动命令 |
|----|------|----------|
| mira-app-core | `src/index.ts` | `pnpm run dev`(ts-node)/ `start`(dist) |
| mira-app-server | `src/index.ts` | `pnpm run dev`(--inspect)/ `start`;CLI `src/cli.ts`;MCP `--mcp` |
| mira-client | `src/main/main.ts`(主进程)+ `src/renderer/main.ts`(渲染) | `pnpm run electron:dev` |
| mira-dashboard-next | `src/main.ts` | `pnpm run dev`(vite) |
| mira-browser-extension | `src/background/index.ts` + `src/manifest.ts` | `pnpm run dev`(crx)/ `chrome` 加载 |
| mira_mobile | `lib/main.dart` | `flutter run` |
| mira-plugin-ui | `src/index.ts` | `pnpm --filter mira-plugin-ui build`(vite 库模式) |
| mira-scripts-core | `index.ts` | `pnpm run dev`(ts-node) |
| mira-doc | `.vitepress/` | `pnpm run docs:dev` |

## 客户端插件构建

`scripts/build-client-plugins-index.mjs` 扫描 `online_client_plugins/` 生成索引,供 Electron 渲染进程动态加载客户端插件。该脚本由根 `build:client-plugins-index` / `dev:client-plugins` 触发。
