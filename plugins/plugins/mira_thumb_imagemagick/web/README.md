# PSD 分层预览（Mira 客户端插件）

为 Mira 增加 `.psd` / `.psb` 文件的浏览器本地分层预览能力。基于 **ag-psd + Vue 3 + Tailwind**。

## 功能

- **悬停预览（hovercard）**：媒体网格中鼠标悬停 PSD 文件，弹出分层预览卡（左图层树 + 右合成画布），可实时切换图层可见性。
- **双击打开**：打开独立窗口，展示完整预览界面（顶栏 + 图层树 + 棋盘格背景合成）。
- **纯浏览器本地解析**：通过 `ag-psd` 解析 PSD 二进制，不上传文件；复杂混合模式/图层样式仅作近似还原（normal + opacity 合成）。
- **缩略图**：走宿主默认（服务端已支持 PSD 缩略图生成）。

## 工作原理

```
index.js (IIFE)
  ├─ renderHoverCard: iframe 加载 dist/index.html?embed=1&psdUrl=<file.path>&fileId=<id>
  │                   加载完成 / 失败 → postMessage 通知父级（父级据此决定是否回退缩略图）
  └─ open: openPluginWindow(dist/index.html?psdUrl=...&fileName=...)  // 双击打开独立窗口

dist/index.html (App.vue)
  ├─ embed 模式(hovercard): 全屏紧凑布局（左图层树 + 右画布），postMessage 通知父级
  └─ 独立模式(open): 完整布局，无 psdUrl 时显示拖放/上传区（dev 调试 fallback）
```

PSD 二进制由 iframe 内 `fetch(file.path)` 获取 —— `file.path` 已被宿主（`MiraSDKService`）构建为带认证 token 的完整 URL。

## 构建

```powershell
cd "D:/mira_typescript/plugins/plugins/mira_thumb_imagemagick/web"
pnpm install
pnpm exec vue-tsc --noEmit -p "tsconfig.json"
pnpm run build
```

## 目录结构

```
├── plugin.json              插件清单（pluginId / version / enable …）
├── index.js                 IIFE 入口：注册 .psd/.psb 格式 + hovercard + open
├── dist/                    vite 构建产物（运行时入口 index.html）
└── src/
    ├── App.vue              双模式主界面（embed 紧凑 / 独立窗口完整）
    ├── composables/usePsd.ts   ag-psd 解析 + 简单合成
    ├── components/
    │   ├── LayerTree.vue    递归图层树 + 可见性 Checkbox（组联动子层）
    │   └── ui/              精简 shadcn-vue 风格组件（Button / Checkbox / Card）
    └── types.ts
```

## 局限

1. 仅近似还原合成：不支持复杂混合模式、图层样式、智能对象、矢量蒙版。
2. 大文件解析在主线程进行，建议后续把 `readPsd` 迁移到 Web Worker。
3. 文字层仅作为普通图层参与合成，不展示文字元数据。
