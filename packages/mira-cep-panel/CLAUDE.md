# mira-cep-panel

Adobe **CEP 面板**（v0.1.0）：在 Photoshop 2020（CEP 9，Chromium 61）内以三栏界面浏览/管理 Mira 素材库，支持把素材**拖拽置入 PS 画布**、导出活动图层到素材库。技术栈 Vite 6 + Vue 3.5（`<script setup>`）+ Tailwind 4，UI 复用 `mira-plugin-ui` 的 `MediaLibraryView` 三栏组件；数据层经 `MiraClient`（`mira-app-core/shared/sdk`）直连 Mira Server。

包极小（src 仅 6 文件/约 958 行），重点在 **Chromium 61 兼容**（oklch/@layer CSS 降级、ResizeObserver 等 polyfill）与 **ExtendScript 桥**（`cep.ts` ↔ `jsx/host.jsx`）。

## 约定的规则

- 目标运行时是 Chromium 61：**禁用**现代 CSS/JS 特性（oklch、`:has`、Array.at 等需 polyfill 或降级）；样式经 `scripts/compat-css.mjs` 后处理
- 与 PS 交互只经 `cep.ts` 封装的 ExtendScript 桥（`evalScript` → `jsx/host.jsx`），不要在 Vue 组件里直接调 CSInterface
- 服务端连接：`services.ts` 的 `useMira()` 用 `MiraClient` 默认 `http://127.0.0.1:8081`，token 存 localStorage；无 vite 代理，跨域靠 manifest `--disable-web-security`
- 同步到 PS：`node scripts/sync.mjs` 把 dist 镜像到扩展目录（默认 Windows `D:\Adobe_Photoshop_2020_...` 下 `CEP\extensions\com.hunmer.mira`，可用 `MIRA_CEP_EXTENSION_DIR` 覆盖）
- 远程调试：面板加载后访问 CEF 调试端口 **8899**（`.debug`）

## 文件索引

| 文件 | 用途 | 何时阅读 |
|------|------|----------|
| [claude/overview.md](claude/overview.md) | 定位、结构、与 server/plugin-ui 关系 | 首次了解 |
| [claude/entrypoints.md](claude/entrypoints.md) | 入口、manifest、构建与同步流程 | 构建/部署 |
| [claude/conventions.md](claude/conventions.md) | Chromium 61 兼容与 CEP 桥约定 | 改代码前 |
| [claude/file-map.md](claude/file-map.md) | 全部文件清单与职责 | 找文件 |
| [claude/dependencies-and-config.md](claude/dependencies-and-config.md) | 依赖与配置 | 排查依赖 |
| [claude/changelog.md](claude/changelog.md) | 文档变更记录 | 看更新历史 |

## 扫描状态

- **版本**: 0.1.0
- **更新时间**: 2026-08-23（首建文档）
- **已扫描**: package.json、src 全部 6 文件结构、public/（manifest.xml、CSInterface.js、host.jsx、.debug）、scripts/ 三件套；git 历史（2026-08-20 16:52 `cdbf096c` 全量入库，随后 7 笔均为 Chromium 61 兼容修补）
- **跳过**: 各文件实现体细节（仅读头部与结构）
- **下一步建议**: 拖拽置入/导出行为有 bug 时深读 `src/cep.ts` 与 `public/jsx/host.jsx`
