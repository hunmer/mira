# Mira Spine Format

服务端插件：为 Spine `.skel` 和 ZIP 容器 `.spine` 注册格式识别、附属文件访问与 idle 动作首帧 PNG 缩略图生成。

`.spine` 解压到服务端 `data/temp/spine` 缓存，不写入素材库。SDK 通过文件 ID 列出并访问包内 `.atlas/.json/.skel/.png`，HTTP 地址不暴露临时目录。

## 渲染方案

使用官方 [`@esotericsoftware/spine-canvaskit`](https://esotericsoftware.com/spine-canvaskit)（CanvasKit/Skia WASM）无头渲染，**无需任何原生编译**（不依赖 cairo/canvas/gl）。

> ⚠️ **版本限制**：spine-canvaskit 仅支持 Spine **4.2+**（npm 最低 4.2.48，无 3.8 版本）。
> 3.8 资源会渲染失败（仅记日志，不阻断），但仍可在客户端 hovercard 实时预览（客户端用 pixi-spine 3.8）。
> `.skel` 的运行时版本必须与编辑器导出版本精确匹配（4.3 资源用 4.3 运行时）。

本插件当前固定 `@esotericsoftware/spine-canvaskit` 为 `4.2.48`，用于读取 4.2 资源。不要改成 `^4.2.x`，否则 pnpm 会升级到不兼容的 4.3 runtime。

## 缩略图生成流程

1. 查找 `.atlas`（同名优先，否则同目录首个 `.atlas`；png 由 atlas 内容引用自动加载）
2. `spine-canvaskit` 加载 atlas + skeleton
3. 选动画：优先 `idle`，否则首个动画
4. 按 skeleton bounds 适配画布缩放
5. 渲染首帧 → `surface.makeImageSnapshot().encodeToBytes()` → PNG

## 配置（data/config.json）

```json
{
  "animation": "idle",
  "timeoutMs": 60000,
  "width": 512,
  "height": 512,
  "background": "#eef0f3"
}
```

- `animation`：优先渲染的动画名（找不到则回退首个）。
- `timeoutMs`：单次渲染超时（含 CanvasKit WASM 初始化）。
- `width` / `height`：缩略图尺寸。
- `background`：背景色（十六进制）。

## 构建

```powershell
pnpm install --ignore-workspace
pnpm run build
```

依赖仅 `@esotericsoftware/spine-canvaskit`、`canvaskit-wasm` 和纯 JS ZIP 读取器 `yauzl`，无原生模块，安装即用。

## 技术细节

- spine-canvaskit / canvaskit-wasm 为 ESM，CommonJS 插件用动态 `import()` 加载。
- CanvasKit 的 JS glue 与 wasm 必须同一版本（默认 `bin/` 与 `full/` 不可混用，否则 wasm 表索引崩溃）。本插件统一用 `canvaskit-wasm/full`。
- Node 下 `CanvasKitInit` 需 `locateFile` 定位 `bin/full/canvaskit.wasm`。
