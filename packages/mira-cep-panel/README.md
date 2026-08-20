# mira-cep-panel

Mira 素材库的 Adobe CEP 面板(Photoshop 2020 / CEP 9):连接 Mira Server 后在 PS 内以三栏视图
(文件夹/标签树 · 文件列表 · 详情)浏览与管理素材,UI 复用 [mira-plugin-ui](../mira-plugin-ui) 的
`MediaLibraryView`(接线方式同其 demo App.vue)。

## 目录结构

```
packages/mira-cep-panel/
├── CSXS→public/CSXS/manifest.xml   # 扩展清单(PHXS/PHSP 21.0+,CSXS 9)
├── public/.debug                   # 远程调试端口(PHXS 8899)
├── public/js/CSInterface.js        # Adobe 官方 CEP 9 桥接库
├── index.html / src/               # 面板应用(Vite + Vue3)
├── scripts/
│   ├── compat-css.mjs              # 构建后把 Tailwind v4 CSS 降到 Chromium 61 可用
│   ├── sync.mjs                    # dist/ 镜像同步到 PS 扩展目录(支持 watch)
│   └── dev.mjs                     # build --watch + 降级 + 同步 一条龙
└── dist/                           # 构建产物 = 扩展目录内容(直接同步)
```

## CEP 9(Chromium 61)兼容措施

- 构建目标 `chrome61`(esbuild 降级新语法);`src/polyfills.ts` 补 ResizeObserver/`Array.at` 等方法
- `scripts/compat-css.mjs`:postcss 展开 `@layer`、oklch/color-mix/嵌套转译
- `src/style.css`:把 `.dark` 调色板以换算后的 sRGB 值写进 `:root`(Chromium 61 不支持 oklch,
  且 `:is()` 选择器失效导致 `dark:` 变体不可用,面板恒为暗色)
- manifest `CEFCommandLine` 含 `--disable-web-security`:mira server 无 CORS,CEP 内无代理可走

## 使用

```powershell
# 1. 安装依赖(仓库根目录)
pnpm install

# 2. 首次部署:构建 + CSS 降级 + 同步到 PS 扩展目录
pnpm -C packages/mira-cep-panel run deploy

# 3. 未签名扩展需开启调试模式(一次性)
pnpm -C packages/mira-cep-panel run enable-debug

# 4. 重启 Photoshop → 窗口 > 扩展功能 > Mira 素材库
```

联调(改代码自动重新构建并同步,PS 内重开面板生效):

```powershell
pnpm -C packages/mira-cep-panel run dev
```

远程调试:面板打开后用 Chrome 访问 `http://localhost:8899`(端口见 `public/.debug`)。

## 同步目标

默认 `D:\Adobe_Photoshop_2020_v21.2.12.215_2021-09\Photoshop\Required\CEP\extensions\com.hunmer.mira`,
可用环境变量 `MIRA_CEP_EXTENSION_DIR` 覆盖。
