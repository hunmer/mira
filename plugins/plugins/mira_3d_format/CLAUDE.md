# mira_3d_format

GLB/GLTF 3D 格式插件（协议 B）。服务端用 `@gltf-transform` 解析模型统计信息，缩略图由子进程运行 `render-glb` 渲染 GLB；`web/` 为 Vite + Vue 3 的可交互 3D 预览页。

## 约定

- `init(inst)` 内 `registerFileFormat('mira_3d_format', handler)`：extensions `glb`/`gltf`，MIME `model/gltf-binary`、`model/gltf+json`，thumbnailExtensions 仅 `glb`
- `process`：NodeIO 读取 glTF 文档，返回 mesh/node/material/texture/animation/scene 计数与 extensionsUsed
- `thumbnail`：spawn 本进程 node 执行 `render-glb`（原生 gl 依赖，可用 `renderCommand` 配置覆盖），失败仅记日志不阻断
- 配置 `data/config.json`：width/height 512、timeoutMs 120000（越界自动钳制）
- viewer `mira-3d-model`：entry `dist/index.html`、priority 10，query 注入 fileUrl/fileName/mimeType/fileId
- web/ 独立 vite 构建（Vue 3，src/App.vue、ModelScene.vue）；pluginId `d4e5f6a7-…`，permissions ui/dom；`index.js` 客户端注册 hovercard 与预览
- 构建命令：`npm run build`（tsc）；`postinstall` 触发 `rebuild:native` 重建 gl 原生模块（pnpm.onlyBuiltDependencies 仅放行 gl）
- 依赖：@gltf-transform/core、render-glb

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 服务端入口（153 行）：注册格式/缩略图/viewer |
| `web/` | Vite + Vue 3 预览前端（src/App.vue、ModelScene.vue、components/、composables/） |
| `web/plugin.json` | 客户端 manifest（pluginId d4e5f6a7-…） |
| `data/config.json` | 运行时生成的缩略图配置 |

## 扫描状态

- 版本：1.0.2（package.json；web/plugin.json 自标 1.2.1）
- 扫描时间：2026-08-20
- 已扫描：index.ts 全文、package.json、web/plugin.json、web/index.js 头部、目录结构
- 未扫描：web/src 组件实现细节、render-glb 内部
