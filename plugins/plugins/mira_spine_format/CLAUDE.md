# mira_spine_format

Spine 骨骼动画格式插件（协议 B）。支持散装 `.skel`（同目录 .atlas/.png）与 `.spine` 打包容器两种形态；服务端用 spine-canvaskit 渲染 idle 动画首帧缩略图（仅 Spine 4.2+），`web/` 为 Vite + Vue 3 交互预览（骨骼树/动画/皮肤切换）。

## 约定

- `registerFileFormat`：extensions `skel`/`spine`，MIME `application/x-spine`，thumbnailExtensions 同
- `.spine` 经 SpineBundleCache（spineBundle.ts）解包到 server `temp/spine` 并暴露 extraFiles；`.skel` 查同目录同名（否则首个）.atlas，png 由 atlas 引用
- `thumbnail`：renderIdle.ts 的 renderIdleFrame（@esotericsoftware/spine-canvaskit 4.2.48）；3.8 资源报版本错，仅记日志不阻断（客户端 hover 仍可实时预览）
- viewer `mira-spine`：entry `dist/index.html`、priority 10、`extensions: ['spine']`（仅 .spine 文件走 viewer）；getQuery 从 bundle 挑 skeleton/atlas/png 注入 skelUrl/atlasUrl/pngUrl，缺一抛错
- 配置 `data/config.json`：animation=idle、timeoutMs=60000、width/height=512、background=#eef0f3（越界钳制）
- web/ 独立 vite 构建（Vue 3，src/App.vue、SpineCanvas.vue、spine/）；pluginId `e5f6a7b8-…`；web/index.js 客户端注册 hovercard(iframe)+独立窗口打开
- 构建命令：`npm run build`（tsc）；`npm run render` = node dist/renderIdle.js（独立渲染脚本）
- 依赖：@esotericsoftware/spine-canvaskit、canvaskit-wasm、yauzl

## 关键文件

| 文件 | 说明 |
|------|------|
| `index.ts` | 服务端入口（246 行） |
| `renderIdle.ts` / `spineBundle.ts` | idle 首帧渲染 / .spine 容器解包 |
| `web/` | Vite + Vue 3 预览前端（骨骼树、动画/皮肤切换） |
| `test_assets/` | 测试资源 |

## 扫描状态

- 版本：1.1.1
- 扫描时间：2026-08-20
- 已扫描：index.ts 全文、package.json、web/plugin.json、web/index.js 头部、目录结构
- 未扫描：renderIdle.ts、spineBundle.ts、web/src 组件实现
