---
name: port-react-to-vue
description: 把 React/TSX 组件移植为 Vue 3 SFC 并加入 mira-client 组件库（src/components/ui）。覆盖 shadcn/ui、framer-motion 动效、21st.dev 复刻物、任意粘贴的 React 代码。Use whenever 用户粘贴 TSX/JSX 说"转成 vue"、"转成 vue 组件"、"加到组件库"、"把 XX 组件搬过来"，或涉及 framer-motion → motion-v 映射、React hooks → Composition API 改写、next/image / lucide-react 替换 —— 即使没明说 "React" 也适用。
---

# Skill: port-react-to-vue

把任意 React 组件代码移植成 Vue 3 SFC，落进 mira-client 的 shadcn-vue 组件库，要求 type-check / build / Tailwind 类三重验证通过。

本 skill 的经验全部来自实际移植（ChapterScrubber、Folder、ExpandableGallery），每条坑都踩过。

## 核心认知

- 目标位置：`packages/mira-client/src/components/ui/<kebab-name>/`，一个目录 = 一个组件：
  ```
  ui/<kebab-name>/
  ├── <PascalName>.vue        # 主组件（类型 export 放独立的普通 <script lang="ts"> 块）
  ├── <PascalName>Xxx.vue     # 内部子组件（React.memo 子组件的对应物，不导出）
  └── index.ts                # export { default as X } + export type { ... }
  ```
- 动画用 **motion-v**（仓库已装 ^2.2.1，framer-motion 的 Vue 移植），不要新装依赖
- 底座是 **shadcn-vue + reka-ui + Tailwind v4.0.17**，语义 token（`bg-background`、`text-muted-foreground`…）直接可用
- 代码风格跟库内现有文件：双引号、无分号、`defineOptions({ name: "X" })`、中文 JSDoc 头注释（来源 + 用法示例）

## 工作流

1. **先探库再动手**：看 `src/components/ui/` 相邻组件（如 glowing-button、stepper）确认 index.ts 导出写法与代码风格；`grep` 确认 `cn` 在 `@/lib/utils`
2. **依赖映射**（见下表），缺依赖先报告而不是静默替换
3. **逐块转换**：props → defineProps、回调 → emits、hooks → composition API、JSX → template
4. **落盘**：按上面的目录结构
5. **三重验证**（见文末），全部通过才算完成

## 依赖映射表

| React 侧 | Vue 侧（mira-client） |
|---|---|
| `framer-motion` 的 `motion.div` | motion-v 的 `<Motion as="div">`（默认 div；span 必须 `as="span"`） |
| `useMotionValue/useSpring/useTransform/useReducedMotion/useMotionTemplate` | motion-v 同名导出，语义一致 |
| `AnimatePresence` | motion-v 同名组件（dialog 组件已在用） |
| variants + `whileHover` 父子传播 | **不要**依赖传播：根节点 `@mouseenter/@mouseleave` 切 `hovered` ref，子元素 `:animate` 用 computed 按状态切换（Folder 案例） |
| `layout` / `layoutId` / `whileHover` / `whileTap` props | motion-v 原生支持，直接传 |
| `next/image` | 原生 `<img>`（Electron/Vite 无 Next 图片管线）；`fill` 模式手写 `absolute inset-0 w-full h-full object-cover` |
| `lucide-react` 图标 | `@lucide/vue` 同名图标，`:size="20"` 代替 width/height |
| shadcn React 组件（Button 等） | `@/components/ui/<name>` 的 shadcn-vue 对应组件 |
| `cn`（clsx+tailwind-merge） | `@/lib/utils` 的 `cn`，签名一致 |
| `React.memo` 子组件 | 独立 SFC（Vue 无 memo 需求，MV 驱动的渲染天然跳过组件更新） |

## motion-v 关键行为（与 framer-motion 的差异）

- **`useTransform(fn)` 回调形式可用且自动收集依赖**：回调里 `.get()` 过的 MotionValue + 访问过的 Vue ref/computed/props 都会被追踪（内部是 collectMotionValues + watchEffect），无需手动声明依赖
- **`useReducedMotion()` 返回 `Ref<boolean>`**：要 `.value`；条件选 MV（reduce 时用 raw 跳过弹簧）写成 `computed(() => reduce.value ? rawPointer : springPointer)`，传给子组件用 **getter**（`:pointer="() => pointer"` + 子组件 `toValue()`），否则模板自动解包会丢失热切换
- **style 里的非 transform 键（width/top/left）数值不自动补 px**：framer 会推断单位，motion-v 不保证 —— 一律输出字符串 MV：`` useTransform(() => `${n}px`) ``；`x/scale/scaleY/rotate/opacity` 是 transform 键，数值安全
- `originY: 1` → Tailwind `origin-bottom` 类
- `:style` 传 MotionValue 时类型必须匹配 motion-v 的 style 类型（`Record<string, unknown>` 会报错，用具体键类型的对象字面量）

## React → Vue 语法陷阱（每条都踩过）

- **`<script setup>` 里不能 `export`**：props 用的 interface/type 放同级普通 `<script lang="ts">` 块再 export，两个块共享模块作用域
- **模板属性引号**：`:class="cn('single quotes', props.class)"` —— 属性用双引号时内部只能单引号
- **Vue style 不给数值补单位**（React 会）：`:style="{ width: n }"` 无效，要 `${n}px`
- **React `useEffect` → `watch`**：默认 flush 是 `pre`（DOM 更新前），凡 effect 里**测量 DOM**（offsetHeight、getBoundingClientRect）必须 `{ flush: "post" }`；mount 时也要跑一次就加 `immediate: true`
- **React onBlur（currentTarget.contains(relatedTarget)）→ `@focusout`**（focusout 冒泡，语义等价）
- **模板函数 ref 要标类型**：`:ref="(el: any) => setRef(i, el)"`，否则 vue-tsc 报 implicit any
- **组件实例 ref**：`:ref` 拿到的是组件实例，取 `$el`：`cardRef.value = node?.$el ?? node`
- **React useId → Vue 3.5 `useId`**（`import { useId } from "vue"`）；layoutId/SVG id 要拼 uid 前缀防多实例撞名
- **回调 props → defineEmits**：`onSelect` → `select` 事件（模板 `@select`）；kebab-case 事件名配 camelCase emits 声明
- **ReactNode props（label/description）→ `string`**；确需富文本再加 slot，默认最小方案
- a11y 原样保留：`role=listbox/option`、`aria-activedescendant`、roving tabindex、键盘导航（ArrowDown/Up/Home/End + preventDefault）；Vue 里 `:aria-selected="bool"` 同样渲染 "true"/"false"
- React 在组件内用 ref 镜像状态避免重渲染（`activeRef.current`）→ Vue setup 里普通 `let` 变量即可

## Tailwind v4.0.17 检查

- `mask-[...]` 是 **v4.1 特性，4.0.17 没有** → 改内联 style（`maskImage` + `-webkit-mask-image`）。其他新工具类同理，不确定就 grep `node_modules/tailwindcss/dist` 确认
- v4 可用：动态间距（`h-5.5`、`w-3.25`、`h-30`）、`bg-linear-to-b`（v3 的 bg-gradient-to-b 改名）、`size-*`、任意值 `rounded-[2.5rem]`
- 未被任何页面引用的新组件类**也会**进主 CSS（tailwind v4 按源码扫描，不走 JS 模块图）

## 验证（三重，缺一不可）

```bash
cd packages/mira-client
pnpm run type-check    # vue-tsc；仓库有 3 个既有错误（DownloadService/TrayService/ServerEditDialog），只看自己文件的
pnpm run build

# CSS 类抽查 —— 注意必须用 grep -F（类在 CSS 里是转义形态，正则匹配会误报 0）
cd dist-renderer
css=$(find . -name "main-*.css" -size +100k | head -1)
grep -Fc 'rounded-\[2\.5rem\]' "$css"   # 任意值类
grep -Fc 'h-5\.5' "$css"                # 动态间距类
```

ESLint 单跑会失败（仓库 legacy 配置 + npx 解析到 eslint 9），别浪费时间，type-check + build 就是回归门禁。

## 完成检查清单

- [ ] 目录结构、index.ts 导出、命名与库内组件一致
- [ ] `type-check` 对新文件 0 错误
- [ ] `build` 通过，且抽查的 Tailwind 类（尤其任意值/动态间距）在产物 CSS 中
- [ ] 原组件的交互（hover/键盘/外点关闭等）逐条对照原版确认移植
- [ ] 带示例数据的 demo（21st.dev 等）提醒用户替换为自己的图片/文案
- [ ] 验收步骤里给出可直接粘贴的挂载示例代码
