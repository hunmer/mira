---
name: extract-21st-dev-ui
description: 从 21st.dev 复刻 UI 组件到本仓库（手机壳、卡片、Hero、动效块等任意 React/Tailwind 组件）。使用场景：用户给出 21st.dev 组件页链接、cdn.21st.dev 的 bundle 链接、"21st.dev/xxx" 片段、"复刻这个组件"、"把 21st.dev 上的 XX 组件搬过来"、或粘贴了带 ImageItem/PhoneCarousel 之类 21st 典型结构的代码却缺少实现时。覆盖：抓取 bundle、逆向还原压缩源码、决定 next/image vs img、Tailwind v4 兼容、按项目既有路径落盘。即使用户没明说"21st"，只要来源是 21st.dev/solaceui/magicui 等同站作者也应触发。
---

# 从 21st.dev 提取 UI 组件

把 21st.dev 上的任意组件原样复刻进当前项目，保证可直接 import、无样式缺失、无类型错误。

## 核心认知

21st.dev 的组件**源码不公开**，但每个组件页都有一个**公开的 CDN bundle**。URL 有两种形态，**都合法**：

```
https://cdn.21st.dev/<author>/<component-id>/<variant>/bundle.<timestamp>-<uuid>.html   # 长格式
https://cdn.21st.dev/bundled/<id>.html                                                  # 短格式（也真实存在）
```

> ⚠️ 别凭 URL「长得像不像」判断真假——短路径 `bundled/1111.html` 也可能是 200 OK 的真 bundle。**不确定就先 `curl -sIL` 验证**：`content-type: text/html` + 体积 100KB–500KB + 首部 `<!DOCTYPE html>` 才是真 bundle。

这个 bundle 是 Vite 打包产物（一个 HTML，内含 React + 全部依赖 + 压缩 JS + 编译后的 Tailwind CSS）。**抓它、逆它、复刻它**，是本 skill 的全部工作。

> 不要去试 `https://21st.dev/registry/...` / `https://21st.dev/api/...` 之类的 JSON 端点 —— 21st 没有公开 registry API，这些全是 404（已验证）。bundle HTML 是唯一的源码来源。

## 工作流

### 1. 拿到 bundle URL

如果用户直接给了 `cdn.21st.dev/...bundle....html` 链接 → 直接用。

如果用户给的是组件页 `https://21st.dev/@<author>/components/<component-id>` 或 `https://21st.dev/<author>/<component-id>`：
- WebFetch 该页面，页面的 `<iframe>` / 预览区的 `src` 就是 bundle URL
- 或从页面 HTML 里 grep `cdn.21st.dev` 拿到 bundle 路径

### 2. 下载 bundle（curl，不要 WebFetch）

**用 curl 下到磁盘**，WebFetch 会把它当网页解析、丢失 JS：

```bash
curl -sL "https://cdn.21st.dev/<...>/bundle.<...>.html" -o bundle_tmp.html
wc -c bundle_tmp.html   # 通常 100KB-500KB
```

⚠️ **Windows 路径陷阱**：在 Git Bash 里 `curl -o /tmp/x.html` 下载的文件，Windows 原生 `python`（不经 bash）可能找不到 `/tmp`。**把临时文件下到项目根目录**（相对路径），别用 `/tmp`。

### 3. 逆向：提取组件源码

bundle 里的 JS 是**压缩但未深度混淆**的 —— 变量名被缩短（`s`、`p`、`rt`、`$g`、`Ng`），但：
- **字符串字面量原样保留**：所有 className、SVG path `d`、props、示例数据 URL、aria-label 都在
- **部分 bundle 用 `i(fn,"OriginalName")` 保留原名**：有的 bundle 每个函数结尾都有；有的**完全没有**，函数名就是压缩符号（`$g`/`Ng`/`a3`）。后者靠 **registry 映射表**（见步骤 3）还原语义，别死等 `i(fn,...)`
- **JSX 结构完整**：`X.jsx` / `X.jsxs` 就是 React 的 `jsx`/`jsxs`

提取策略：**优先用本 skill 自带的 `scripts/extract.py`**（固化了下面四类高频操作，省去每次手写一次性脚本）。四个子命令对应提取的四个阶段：

| 子命令 | 作用 | 何时用 |
|---|---|---|
| `names` | 扫描 `s(sym,"OriginalName")` 模式，输出 压缩符号→原名 映射表 | 第一步：识别 `$g`/`Ng`/`Sr` 这些短符号到底是啥 |
| `find` | 用 anchor 字符串定位，向前找最近的 `function`，打印片段 | 不确定函数名时，先用独有 className/SVG id 探路 |
| `fn` | 平衡括号提取整个函数体（自动跳过参数解构陷阱）| 定位到函数名后，取干净完整的函数体 |
| `jsx` | 解析代码里所有 `F.jsx("tag",{...})` 的直属属性 | 解析 SVG / 复杂 JSX，避免固定字符窗口跨节点 |

脚本完整路径 `.agents/skills/extract-21st-dev-ui/scripts/extract.py`。**下文命令示例统一简写为 `python3 scripts/extract.py`，实际在项目根执行时应写全路径，或先 `cd .agents/skills/extract-21st-dev-ui`**（bundle 若在项目根，传绝对/相对路径均可）。`python3 scripts/extract.py --help` 看完整用法。

#### 0. 先跑 `names` 看哪些原名被保留了

```bash
python3 scripts/extract.py bundle_tmp.html names
# 输出示例：
#   Sr  →  useMotionValue
#   gg  →  useSpring
#   ke  →  cn
```

> 部分 bundle **完全没有** `s(sym,"Name")` 模式 —— `names` 会提示未发现。此时只能靠下面的 registry 映射表（手读）还原语义。

#### 1. `find`：用 anchor 探路（定位函数名）

```bash
# 用组件独有的字符串定位，脚本会自动向前找最近的 'function ' 并提示函数名
python3 scripts/extract.py bundle_tmp.html find "roundedCorners" --after 4500
# 输出：# 最近 function: sM @ 359988 (offset 64) + 代码片段
```

常用 anchor（每个组件都有的特征字符串）：
- **className 片段**：从预览里看到的独特 tailwind 类，如 `"flex justify-center items-start"`
- **示例数据**：图片 URL、文案（grep 这些 URL 还能确认是不是示例常量）
- **SVG path 数据**：`roundedCorners`、`viewBox="0 0 433 882"` 等
- **aria-label**：`"Previous image"` / `"Next image"`

grep 快速定位关键片段：

```bash
# 找所有 className 字符串（组件的 tailwind 类全在这）
grep -oE '"[a-z][a-z0-9-]*( [a-z0-9:[\]\/()._-]+){3,}"' bundle_tmp.html | sort -u

# 找示例数据 URL（确认哪些是写死的 demo 数据）
grep -oE "res\.cloudinary\.com[^\"']*" bundle_tmp.html | head

# 找 JSX 上下文（看某个 className 周围的结构）
grep -oE '.{80}rounded-full bg-black/60.{120}' bundle_tmp.html
```

#### 定位「组件主体」的递进链路（关键）

bundle 末尾的渲染入口几乎都是 **21st 预览外壳**（全屏 `h-screen` 容器 + 主题/demo 切换），不是组件本体。从外壳到真正组件常要走两步：

1. **找 demo 外壳**：grep `h-screen` / `bg-background text-foreground`，里面 `jsx(选中组件,{})` 动态渲染。
2. **找 registry 映射表**（外壳上方必有）：`const 名称=["SafariDemo"],映射={SafariDemo:$g}; 选中组件=Object.values(映射)[i]` —— 顺符号引用（`$g`）找下一定义。
3. **demo 入口常是薄包装**：`function $g(){return jsx(Ng,{url:"...",src:"..."})}` —— 它只传示例数据，**真正实现是内部的 `Ng`**。别停在 `$g`，继续追 `Ng`。

> 渲染入口 → registry 映射 → demo 包装 → 真正组件，**常两层间接**。停在哪一层都会拿到残缺 / 带示例数据的代码。

#### 2. `fn`：平衡括号提取整个函数体（已处理参数解构陷阱）

脚本内置的 `balanced_from` 处理字符串/转义/模板字符串，并自动从**函数体的 `{`**（即 `){` 之后那个）开始平衡，跳过参数解构 —— 不会在 `{src,...}` 的 `}` 处提前停止。

```bash
# 直接传函数名
python3 scripts/extract.py bundle_tmp.html fn sM

# 不知道函数名？传 anchor 也行：脚本会向前找最近的 function 并自动定位其函数体
python3 scripts/extract.py bundle_tmp.html fn "lensStrength"

# 想看长度：--stats 在 stderr 输出字符数
python3 scripts/extract.py bundle_tmp.html fn sM --stats
```

> 仍需理解陷阱原理（见上）：脚本已规避，但你读输出时要确认拿到的是**完整函数体**（结尾应是 `}` 且长度合理，几十字就是被解构截断了）。

#### 3. `jsx`：精确提取每个 JSX 节点的属性（别用固定字符窗口）

解析 SVG/复杂 JSX 时，**别用** `grep -oE '.{N}xxx.{M}'` 或 `s[i:i+400]` 抓 props —— 固定窗口会跨到下一个节点，把别人的属性算到当前节点头上。`jsx` 子命令用平衡括号定每个 `F.jsx("tag",{...})` 的 props 对象边界，**只在 `children:` 之前**提 `key:"value"`，同时识别 `aria-hidden:!0` / `fill:!0` 这类动态布尔/表达式属性。

```bash
# 典型流水线：fn 取函数体 → 管道喂给 jsx 解析属性
python3 scripts/extract.py bundle_tmp.html fn sM \
  | python3 scripts/extract.py jsx --stats

# 或从文件读
python3 scripts/extract.py bundle_tmp.html fn sM > /tmp/fn.txt
python3 scripts/extract.py jsx --input /tmp/fn.txt
```

输出形如（每个 JSX 节点的直属属性，已剔除 children）：
```
<div>
  className='pointer-events-none absolute inset-0 opacity-80'
  borderRadius='inherit'
  background='conic-gradient(from 0deg ...)'
  animation='iris-spin 14s linear infinite'
  padding={1}              # ← 动态属性自动用 {} 标注
```

### 4. 还原成可读 TSX

把压缩 JS 翻译回正常 React。对照规则：

| bundle 里 | 还原成 |
|---|---|
| `X.jsx(Tag,{...})` | `<Tag {...} />` |
| `X.jsxs(Tag,{children:[...]})` | `<Tag>...</Tag>` |
| `i(fn,"Name")` | `fn` 的原名是 `Name`（**部分 bundle 才有**；没有时靠 registry 映射表还原） |
| `In(...)` / `cn(...)` | `cn()` from `@/lib/utils`（clsx+tailwind-merge） |
| `Pn` 配 `variant:"outline"` | shadcn `Button` |
| `Qh` 配 `fill:!0` | `next/image` 的 `Image`（见下方决策） |
| `$h`/`Ph`/`ev`/`tv` 等 | lucide 图标 —— 从用法（`ChevronLeft`/`Play`/`Pause`）反推 |
| `ft.useState` | React `useState` |
| `Tf-1` 之类常量 | 找定义处，通常是断点数值（如 768） |

**识别示例数据 vs 组件 props**：bundle 末尾通常有 `const xxx=[{src:"...",alt:"..."}]` 紧跟一个 `function yyy(){return X.jsx(Iv,{images:xxx})}` —— 那个常量数组就是 demo 数据，那个函数是 demo 入口。真正的组件是接受 props 的那个（如 `({images:s,...})=>...`）。

更可靠的标志是 **registry 映射表**：`const 名称=["XxxDemo"],映射={XxxDemo:$g}` —— `$g` 是 demo 入口（传示例数据），它 `return jsx(真正的组件,{...})` 里那个才是要复刻的组件。

### 5. 关键决策点

#### CSS 要不要提取？
**通常不需要。** bundle 里的 `<style>` 是 Tailwind 编译产物（几万字符），复制进来反而冲突。21st 组件几乎全用标准 Tailwind 类 + 少量任意值（`fill-[#DADADA]`、`h-[410px]`），只要目标项目是 **Tailwind v4**，这些类开箱即用。

**先判断动画属于组件还是预览外壳**：bundle 里搜到的 `@keyframes`（如 `ripple`）常常属于 **21st 预览外壳**（全屏 `h-screen` 容器 + `lab-bg` 这类背景效果），不是组件本身。外壳整段丢弃，**别把它误当组件 CSS 抽进来**。判断方法：动画的选择器/类名若出现在那个 `h-screen` demo 容器或它的背景层上，就是外壳的。

**仅在以下情况才需要从 bundle 抽 CSS**：
- 用到了属于**组件自身**的 `@keyframes` 自定义动画（搜 `@keyframes` / `animation:`，并确认挂在组件元素上而非外壳背景）
- 有非 Tailwind 的原生 CSS（搜 `<style>` 里不以 `--tw-` 开头的规则）
- 用了项目没装的工具类（如 `tw-animate-css` 的特定类）

抽取时只挑这几条规则，加到组件同目录的 `.css` 文件或项目 `globals.css`，**不要整段复制 Tailwind 产物**。

#### next/image 还是普通 img？
21st 原组件多用 `next/image`。但外部图片域名（cloudinary 等）在 Next 16+ 需要 `next.config.ts` 配 `images.remotePatterns`，否则运行时报错。

**决策树**：
- 图片是项目内部/同源 → 用 `next/image`
- 图片是外部域名 + 用户没要求配 next.config → **改用普通 `<img>`**（最小改动，避免动配置文件）。多数项目已全局关闭 biome `noImgElement` 规则，无 lint 负担
- SVG 内嵌截图（`<foreignObject>` 里）→ **必须用 `<img>`**，next/image 在 SVG foreignObject 里行为异常
- **SVG 原生 `<image href={src}>`**（整个组件本身就是个 `<svg>` mockup）→ 原样保留 `<image>`，**不走 next/image、无需配 `remotePatterns`**（SVG 渲染不经过 Next 图片优化管线，外部域名直接加载）

如果决定配 next/image，加配置：

```ts
// next.config.ts
images: {
  remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
}
```

#### 路径与文件结构
**先看用户给的 import 路径**，严格按它落盘。典型 21st 结构：

```
components/ui/<component-id>/index.tsx              # 默认导出（demo 入口）
components/ui/<component-id>-utils/<子模块>.tsx      # 工具/子组件
```

如果用户只给了 `import X from "@/components/ui/<component-id>"` 而没给内部结构，则把所有逻辑塞进 `components/ui/<component-id>/index.tsx` 一个文件即可，别自创 utils 目录。

#### 客户端组件
21st 组件几乎都有交互（useState/useEffect/事件），TSX 顶部加 `"use client";`。

**例外：纯 SVG mockup**（手机壳、浏览器外框、设备框架这类整张图就是一个 `<svg>`）—— 无 useState、无事件、无 cn、无 lucide。这类**不需要 `"use client"`**（可作 Server Component），也不需要下述任何依赖。识别信号：组件 body 里全是 `F.jsx("path"/"circle"/"rect"/"image", ...)` 且没有任何 hook 调用。

#### 依赖检查
复刻前 grep 确认项目已有依赖，缺的再装：
- `lucide-react`（图标）
- shadcn `Button` 等组件（`@/components/ui/button`）
- `motion` / `framer-motion`（动效组件）
- `cn` 工具函数位置（可能是 `@/lib/utils` 或 `@/lib/utils/index`，**先 grep 确认**）
- **纯 SVG mockup 零依赖**：图标全内联成 path、无 className 合并、无动效 → 上面这些一个都不需要，只要 React + Tailwind v4 任意值类

### 6. 落盘 + 集成

1. 按用户给的 import 结构创建文件
2. 在目标页面 import 并放置到合适位置
3. `npx tsc --noEmit -p tsconfig.json` 过一遍，grep 自己的新文件名确认无类型错误
4. 清理临时文件（`bundle_tmp.html`）—— **别忘了删，否则污染 git status**。
   `scripts/extract.py` 是 skill 自带工具，**不要删**，下次复用

## 速查：一个典型提取过程的产物

输入：用户给了 bundle 链接 + 一段带 `ImageItem`/`PhoneCarousel` 的示例代码

产物：
```
components/ui/phone-mockups-1-utils/phone-carousel.tsx   # PhoneCarousel + Iphone15Pro + useIsMobile + ImageItem 类型
components/ui/phone-mockups-1/index.tsx                  # 默认导出 PhoneMockupBasic（含 demo 数据）
```

phone-carousel.tsx 骨架（还原自压缩 JS 的模式）：

```tsx
"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ImageItem { src: string; alt: string }

function useIsMobile() { /* matchMedia 监听 */ }

function Iphone15Pro({ width, height, src, alt, className, ...props }) {
  return (
    <div className={cn("relative", className)}>
      <svg viewBox="0 0 433 882" ...>
        {/* 从 bundle 逐条复制的 <path d="..." className="..."/> */}
        {src && (
          <foreignObject ... clipPath="url(#roundedCorners)">
            <img src={src} alt={alt} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
          </foreignObject>
        )}
        <defs><clipPath id="roundedCorners"><rect ... rx="55.75" ry="55.75"/></clipPath></defs>
      </svg>
    </div>
  );
}

export function PhoneCarousel({ images }: { images: ImageItem[] }) {
  const [index, setIndex] = useState(0);
  /* 自动轮播 + prev/next/pause 按钮 */
}
```

## 常见坑

- **bundle URL 的 query 参数**（`?theme=dark&dark=true`）保留，它影响预览样式；下载时可带可不带，源码一样
- **`id` 冲突**：SVG 里硬编码的 `id="path0"` / `id="roundedCorners"` / `clipPath` 引用，复制进项目后可能和别的组件撞名。**推荐默认就加组件前缀**（`safari-path0`、`safari-roundedBottom`），比事后再用 `useId()` 改更省事，且静态 SVG / Server Component 也适用（`useId()` 得是 client 组件）
- **`i(fn,"name")` 的 `i`** 是 bundle 自定义的命名辅助函数，不是 React API，还原时直接删掉这个包裹，用 `"name"` 给函数命名即可
- **压缩后的模板字符串**：`` `translateY(0px) ${a?"x":"y"}` `` 这种，还原时注意是反引号模板，别误读成普通字符串
- **示例图片是别人的账号**（cloudinary 的 `harshitproject`、utfs.io 的各种链接），复刻完提醒用户换成自己的图
- **平衡括号的参数解构陷阱**：从 `function Foo({a,b,...c})` 取函数体，必须从 `){` 之后的函数体 `{` 开始平衡，否则在解构对象的 `}` 处提前停止（见步骤 3）
- **固定字符窗口抓 props 会跨节点**：`grep -oE '.{N}xxx.{M}'` 或 `s[i:i+400]` 会把下一个节点的属性也算进来；用平衡括号定每个 `jsx("tag",{...})` 边界，只在 `children:` 之前取直属属性
- **别凭先验 grep 色值**：例如找 macOS 信号灯去 grep `#fc615d/#ff5f57` 可能根本找不到 —— 有的组件把信号灯画成中性灰圆点。以 bundle 实际内容为准，别套经验色值
- **预览外壳的动画/背景不是组件**：`@keyframes ripple`、`lab-bg` 圆点背景等常属于 21st 预览外壳，复刻时丢弃，别抽进组件 CSS

## 完成检查清单

- [ ] 用户给的 import 路径都能解析（无 `Cannot find module`）
- [ ] `tsc --noEmit` 对新文件无错误
- [ ] 临时文件（`bundle_tmp.html`）已删除（`scripts/extract.py` 是常驻工具，勿删）
- [ ] SVG 的 `id` / `clipPath` 已加组件前缀，避免跨组件撞名
- [ ] 如改用 `<img>` / 原生 `<image>` 替代 next/image，已说明原因
- [ ] 提醒用户：示例数据（图片/文案）需替换为自己的内容
