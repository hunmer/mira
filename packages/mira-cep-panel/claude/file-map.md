# mira-cep-panel — 文件地图

```text
mira-cep-panel/
  CLAUDE.md
  package.json        mira-cep-panel@0.1.0
  src/                6 文件，约 958 行
    main.ts           入口（6 行）
    App.vue           三栏布局 + 置入/导出交互（约 260 行）
    services.ts       useMira()：MiraClient 连接、素材/文件夹数据（约 271 行）
    cep.ts            ExtendScript 桥：置入/导出活动图层/临时目录预取（约 215 行）
    polyfills.ts      ResizeObserver/Array.at 等 Chromium 61 polyfill（约 206 行）
    style.css         手写 sRGB 暗色调色板 + 布局样式
  public/
    CSXS/manifest.xml CEP 清单（--disable-web-security）
    js/CSInterface.js Adobe 官方桥
    jsx/host.jsx      ExtendScript 宿主脚本
    .debug            远程调试端口 8899
  scripts/
    compat-css.mjs    oklch/@layer CSS 降级
    sync.mjs          dist 镜像到 PS 扩展目录（MIRA_CEP_EXTENSION_DIR 可覆盖）
    dev.mjs           开发流程
```
