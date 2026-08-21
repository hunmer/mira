# 源码消费 mira-plugin-ui 组件指南

本文记录在**独立插件 SPA**（Vite + Tailwind v4）中消费 `mira-plugin-ui` 组件的正确姿势，以及踩过的坑。适用于 `plugins/plugins/<插件>/web/`（服务端插件的客户端部分）和 `online_client_plugins/plugins/<插件>/` 两类场景。

参考实现：`plugins/plugins/mira_image_cropper/web/`（完整模板，含弹窗/批量上传/素材选择器）、`online_client_plugins/plugins/image-search/`。

## 为什么是「源码消费」而不是用 dist

`mira-plugin-ui` 的组件样式全部是 Tailwind 原子类字符串。Tailwind 的机制是**只编译「扫描到的类名」**——扫描范围是消费方（你的插件）的构建，而不是组件库自己。若直接 `import` 组件库 dist：

- dist 的 JS 里类名字符串存在，但对应的 CSS 类**没有编进你的产物**（此前实测 dist 产物不含 alert-dialog 的 Action/Cancel 与 empty 等子组件的类）；
- 你的插件运行在独立窗口（`file://` 或 server 托管页），宿主页面的样式帮不上忙。

因此约定：**JS 部分按源码 alias 消费，CSS 部分由消费方的 Tailwind 入口扫描组件源码一并编译**。

## 必做清单（缺一不可）

以下以插件 web 包位于 `<plugin>/web/`、Tailwind 入口位于 `<plugin>/web/src/tailwind.css` 为例。

### 1. workspace 依赖

`<plugin>/web/package.json`：

```json
{
  "dependencies": {
    "mira-plugin-ui": "workspace:*",
    "mira-app-core": "workspace:*"
  }
}
```

- `mira-plugin-ui`：组件本体（`pnpm install` 后在 `node_modules/mira-plugin-ui` 生成 workspace symlink）。
- `mira-app-core`：仅当用到 `library/` 子入口的组件（MediaPickerDialog / MediaBrowser / LibraryTreeView 等）——它们内部 `import { MiraClient } from 'mira-app-core/shared/sdk'`。

### 2. vite alias —— 必须配，且指向 node_modules

`<plugin>/web/vite.config.ts`：

```ts
resolve: {
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
    'mira-plugin-ui/src': fileURLToPath(new URL('./node_modules/mira-plugin-ui/src', import.meta.url)),
    // library/ 组件引用 SDK，按已构建的 esm 产物消费（避免引入 mira-app-core 的 node 端依赖）
    'mira-app-core/shared/sdk': fileURLToPath(
      new URL('./node_modules/mira-app-core/dist/shared/sdk/mira-sdk.esm.mjs', import.meta.url),
    ),
  },
},
```

**坑 A：不能省 alias 直接走 package.json exports。** `mira-plugin-ui` 的 exports 虽然声明了 `"./src/*": "./src/*"`，但 exports 子路径是**严格匹配**，不做目录/扩展名推断——`import ... from 'mira-plugin-ui/src/components/ui/button'`（目录）会直接 Rollup resolve 失败。alias 优先于 exports 且支持目录解析。

**坑 B：不要用 `../../../../packages/...` 拼仓库相对路径。** 层级随插件目录深度变化（`<plugin>/src/` 与 `<plugin>/web/src/` 差一级），迁移出仓库即失效。一律走 `./node_modules/...`，插件目录整体搬到任何位置，`pnpm install` 后即可构建。

### 3. Tailwind 入口 —— @source 扫描组件源码（最大坑）

`<plugin>/web/src/tailwind.css`：

```css
@import "tailwindcss";
@import "tw-animate-css";

/* 相对本 CSS 文件；node_modules 需显式声明（自动检测默认排除 node_modules） */
@source "../node_modules/mira-plugin-ui/src";
```

**坑 C：@source 路径错一级 = Tailwind 静默忽略，无任何报错。** 后果极具迷惑性：

- 你自己模板里写过的类（`bg-background`、`border` 等）正常 → 界面「看起来基本正常」；
- 只在 mira-plugin-ui 组件里出现的类缺失。普通组件（Button 等）因类名重叠不易察觉；
- **Portal 类弹窗（Dialog/AlertDialog）是重灾区**：定位类（`fixed`、`top-[50%]`、`translate`、`z-50`）与动画类（`animate-in`、`fade-in-0`）缺失时，弹窗 DOM 已渲染、受控 open 已为 true、组件日志正常输出，但**视觉上完全不可见**。

**判断 @source 是否生效的试金石**：构建后检查产物 CSS 是否包含弹窗独有规则（注意产物里类名带反斜杠转义，直接搜值更可靠）：

```bash
# 搜编译后的规则值（而非类名字符串）
grep -c 'top:50%' dist/assets/*.css      # 应 ≥1（Dialog 居中）
grep -c 'animate-in' dist/assets/*.css   # 应 ≥1（弹窗入场动画）
```

CSS 体积也是信号：@source 生效后通常从 ~25KB 涨到 ~80KB（组件全量类）。

### 4. shadcn token + 暗色 + 动画库

Tailwind 只生成类，**设计变量的值由消费方提供**（复制自 `packages/mira-plugin-ui/src/assets/tailwind.css`，与库保持一致）：

- `@theme inline` 把 `--color-*` 映射到语义 token；
- `:root` / `.dark` 定义 `--background`、`--primary`、`--border`、`--radius` 等全部 token；
- `@custom-variant dark (&:is(.dark *))` —— 暗色类切换依赖它；
- `@import "tw-animate-css"` —— 弹窗 `animate-in/fade-in-0/zoom-in-95` 等出自这里。

漏掉 token 的症状：类存在但颜色/圆角不生效；漏掉 dark variant：插件窗口暗色模式下组件仍是亮色样式。

### 5. tsconfig paths（类型检查用）

`<plugin>/web/tsconfig.json`（`baseUrl: "."`）：

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "mira-plugin-ui/src/*": ["node_modules/mira-plugin-ui/src/*"]
    }
  }
}
```

vite 构建不依赖它，但 `.ts` 里 import 组件类型时 `tsc --noEmit` 需要它才不报 TS2307。

## 排查流程（弹窗不显示 / 样式异常）

1. **控制台看组件日志**：Dialog 类弹窗打开时会输出 `[mira-batch-upload] open` 等日志；`dialog open = true` 但看不见 → 大概率是样式问题而非逻辑问题。
2. **DevTools 检查 DOM**：Portal 弹窗挂在 `document.body` 末尾。元素存在但没有 `fixed/top:50%` 计算样式 → 定位类缺失 → @source 没生效。
3. **grep 产物 CSS**（见上文试金石），修正 `@source` 相对层级后重新构建。
4. **确认加载的是新产物**：插件窗口 Ctrl+R 刷新，或关窗重开；server 托管路径（`/server-plugins/...`）读磁盘，构建完即可用，无需重启服务。

## 其他注意

- **单文件产物**：插件窗口可能经 `file://` 加载，动态 import 分包 chunk 会被拦截，`build.rollupOptions.output.inlineDynamicImports: true`；`base: './'`。
- **组件内部依赖**（reka-ui、@vueuse/core、@hunmer/vue-selection-box 等）经 mira-plugin-ui 的依赖链解析，消费方无需重复声明。
- **token 化样式约定**：自己的界面也用语义 token 类（`bg-background`、`text-muted-foreground`），跟随宿主明暗主题（`html.dark` + `resolveMiraServerConfig`/宿主 theme API 切换）。
