# mira-cep-panel — 入口、清单与部署

## 入口

- `src/main.ts`（6 行）→ `App.vue`（约 260 行，三栏布局 + 拖拽）
- Vite 构建 → `dist/`，由 `scripts/sync.mjs` 镜像到 PS 扩展目录

## CEP 清单（public/）

| 文件 | 作用 |
|---|---|
| `CSXS/manifest.xml` | 面板清单：PHXS/PHSP 21+、CEFCommandLine 含 `--disable-web-security`（放开跨域直连 server）、MinSize/MaxSize |
| `js/CSInterface.js` | Adobe 官方 CEP JS 桥（勿改） |
| `jsx/host.jsx` | ExtendScript 侧：置入画布、导出活动图层、临时目录预取 |
| `.debug` | CEF 远程调试端口 **8899** |

## 构建与同步

- 开发：`node scripts/dev.mjs`
- CSS 兼容降级：`node scripts/compat-css.mjs`
- 部署到 PS：`node scripts/sync.mjs`——默认镜像到 Windows `D:\Adobe_Photoshop_2020_...` 下 `CEP\extensions\com.hunmer.mira`，用环境变量 `MIRA_CEP_EXTENSION_DIR` 覆盖目标目录
