---
name: extract-21st-dev-ui
description: 从 21st.dev 复刻 UI 组件到本仓库（手机壳、卡片、Hero、动效块等任意 React/Tailwind 组件）。使用场景：用户给出 21st.dev 组件页链接、cdn.21st.dev 的 bundle 链接、"21st.dev/xxx" 片段、"复刻这个组件"、"把 21st.dev 上的 XX 组件搬过来"、或粘贴了带 ImageItem/PhoneCarousel 之类 21st 典型结构的代码却缺少实现时。覆盖：抓取 bundle、逆向还原压缩源码、决定 next/image vs img、Tailwind v4 兼容、按项目既有路径落盘。即使用户没明说"21st"，只要来源是 21st.dev/solaceui/magicui 等同站作者也应触发。
---

# 从 21st.dev 提取 UI 组件

把 21st.dev 上的任意组件原样复刻进当前项目，保证可直接 import、无样式缺失、无类型错误。

## 核心认知

21st.dev 的组件**源码不公开**，但每个组件页都有一个**公开的 CDN bundle**：

```
https://cdn.21st.dev/<author>/<component-id>/<variant>/bundle.<timestamp>-<uuid>.html
```

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

bundle 里的 JS 是**压缩但未深度混淆**的 —— 变量名被缩短（`s`、`p`、`rt`），但：
- **字符串字面量原样保留**：所有 className、SVG path `d`、props、示例数据 URL、aria-label 都在
- **函数名通过 `i(fn,"OriginalName")` 保留**：每个函数结尾都有这个调用，能还原原名
- **JSX 结构完整**：`X.jsx` / `X.jsxs` 就是 React 的 `jsx`/`jsxs`

提取策略（写个一次性 python 脚本，跑完就删）：

```python
import re
s = open("bundle_tmp.html", encoding="utf-8", errors="ignore").read()

# 用一个组件里独有的字符串定位，向前找最近的 'function '，向后取定长片段
anchor = "roundedCorners"          # 例：手机壳组件独有的 clipPath id
i = s.find(anchor)
j = s.rfind("function ", 0, i)
print(s[j : i + 4500])             # 打印出整个组件函数体
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

### 4. 还原成可读 TSX

把压缩 JS 翻译回正常 React。对照规则：

| bundle 里 | 还原成 |
|---|---|
| `X.jsx(Tag,{...})` | `<Tag {...} />` |
| `X.jsxs(Tag,{children:[...]})` | `<Tag>...</Tag>` |
| `i(fn,"Name")` | `fn` 的原名是 `Name`（给函数命名用） |
| `In(...)` / `cn(...)` | `cn()` from `@/lib/utils`（clsx+tailwind-merge） |
| `Pn` 配 `variant:"outline"` | shadcn `Button` |
| `Qh` 配 `fill:!0` | `next/image` 的 `Image`（见下方决策） |
| `$h`/`Ph`/`ev`/`tv` 等 | lucide 图标 —— 从用法（`ChevronLeft`/`Play`/`Pause`）反推 |
| `ft.useState` | React `useState` |
| `Tf-1` 之类常量 | 找定义处，通常是断点数值（如 768） |

**识别示例数据 vs 组件 props**：bundle 末尾通常有 `const xxx=[{src:"...",alt:"..."}]` 紧跟一个 `function yyy(){return X.jsx(Iv,{images:xxx})}` —— 那个常量数组就是 demo 数据，那个函数是 demo 入口。真正的组件是接受 props 的那个（如 `({images:s,...})=>...`）。

### 5. 关键决策点

#### CSS 要不要提取？
**通常不需要。** bundle 里的 `<style>` 是 Tailwind 编译产物（几万字符），复制进来反而冲突。21st 组件几乎全用标准 Tailwind 类 + 少量任意值（`fill-[#DADADA]`、`h-[410px]`），只要目标项目是 **Tailwind v4**，这些类开箱即用。

**仅在以下情况才需要从 bundle 抽 CSS**：
- 用到了 `@keyframes` 自定义动画（bundle 里搜 `@keyframes` / `animation:`）
- 有非 Tailwind 的原生 CSS（搜 `<style>` 里不以 `--tw-` 开头的规则）
- 用了项目没装的工具类（如 `tw-animate-css` 的特定类）

抽取时只挑这几条规则，加到组件同目录的 `.css` 文件或项目 `globals.css`，**不要整段复制 Tailwind 产物**。

#### next/image 还是普通 img？
21st 原组件多用 `next/image`。但外部图片域名（cloudinary 等）在 Next 16+ 需要 `next.config.ts` 配 `images.remotePatterns`，否则运行时报错。

**决策树**：
- 图片是项目内部/同源 → 用 `next/image`
- 图片是外部域名 + 用户没要求配 next.config → **改用普通 `<img>`**（最小改动，避免动配置文件）。多数项目已全局关闭 biome `noImgElement` 规则，无 lint 负担
- SVG 内嵌截图（`<foreignObject>` 里）→ **必须用 `<img>`**，next/image 在 SVG foreignObject 里行为异常

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

#### 依赖检查
复刻前 grep 确认项目已有依赖，缺的再装：
- `lucide-react`（图标）
- shadcn `Button` 等组件（`@/components/ui/button`）
- `motion` / `framer-motion`（动效组件）
- `cn` 工具函数位置（可能是 `@/lib/utils` 或 `@/lib/utils/index`，**先 grep 确认**）

### 6. 落盘 + 集成

1. 按用户给的 import 结构创建文件
2. 在目标页面 import 并放置到合适位置
3. `npx tsc --noEmit -p tsconfig.json` 过一遍，grep 自己的新文件名确认无类型错误
4. 清理临时文件（`bundle_tmp.html`、提取脚本）—— **别忘了删，否则污染 git status**

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
- **`id` 冲突**：SVG 里硬编码的 `id="roundedCorners"` / `clipPath` 引用，如果同一页放多个实例会冲突。单实例场景忽略；多实例需把 id 改成 `useId()` 生成
- **`i(fn,"name")` 的 `i`** 是 bundle 自定义的命名辅助函数，不是 React API，还原时直接删掉这个包裹，用 `"name"` 给函数命名即可
- **压缩后的模板字符串**：`` `translateY(0px) ${a?"x":"y"}` `` 这种，还原时注意是反引号模板，别误读成普通字符串
- **示例图片是别人的 cloudinary 账号**（`harshitproject`），复刻完提醒用户换成自己的图

## 完成检查清单

- [ ] 用户给的 import 路径都能解析（无 `Cannot find module`）
- [ ] `tsc --noEmit` 对新文件无错误
- [ ] 临时文件（bundle、提取脚本）已删除
- [ ] 如改用 `<img>` 替代 next/image，已说明原因
- [ ] 提醒用户：示例数据（图片/文案）需替换为自己的内容
