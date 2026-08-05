# Handoff: 给 reka-ui 弹出层(Dropdown/Popover)加动画 — 仍未生效

## 任务目标
给 `packages/mira-client` 的弹出层(Dropdown / Popover / ContextMenu / Tooltip)加入进入/退出动画,遵循 emil-design-eng skill 的规范(强 ease-out、<300ms、transitions over keyframes)。

## 当前状态:**动画仍不生效**,需要你接手排查

我已用静态分析 + build 产物验证确认 **CSS 侧 100% 正确**,但用户在 dev 运行时仍看不到动画。剩下的疑点几乎肯定在**运行环境/dev 热更新**或**reka-ui Presence 退出时机**,但用户已失去耐心,需要你用更高效的方式定位。

---

## 已完成的改动(都在工作区,部分已 commit)

### 1. 装了依赖(已在 package.json,已 commit)
`packages/mira-client/package.json` 新增 `"tw-animate-css": "^1.4.0"`

### 2. `packages/mira-client/src/renderer/assets/main.css`(未提交,核心改动)
- 第 2 行:`@import "tw-animate-css";`(在 `@import "tailwindcss";` 之后)—— 激活 shadcn-vue 组件里写死的 `animate-in/fade-in-0/zoom-in-95/slide-in-from-*` 这些原本无效的类
- `@theme inline` 块末尾(第 54-55 行)覆盖动画变量:
  ```css
  --animate-in: enter 250ms cubic-bezier(0.23, 1, 0.32, 1) 0s 1 normal both;
  --animate-out: exit 200ms cubic-bezier(0.4, 0, 1, 1) 0s 1 normal both;
  ```
  这会覆盖 tw-animate-css 默认的 150ms/ease。

### 3. `packages/mira-client/src/components/ui/popover/PopoverContent.vue`(未提交)
第 37 行把动画幅度调大以方便肉眼验证:
- `zoom-in-95` → `zoom-in-80`(缩放 0.8)
- `zoom-out-95` → `zoom-out-80`
- `slide-in-from-top-2` → `slide-in-from-top-8`(位移 32px,四个方向同步)

### 4. 已 commit 的其他改动(与此问题无关,但属于同一批"加动画"工作)
- `HomeView/index.vue`:按钮 `:active` 按压反馈、详情侧栏 `<Transition>`、空状态欢迎卡 stagger、`--ease-out` 全局变量
- `HomeHeader.vue`:详情侧栏切换按钮

---

## ★ 关键事实:CSS 侧已确认完全正确 ★

我反复用 build 产物验证,**静态层面没有任何问题**:

| 验证项 | 产物中的实际值 | 状态 |
|---|---|---|
| `@import "tw-animate-css"` | 被 Tailwind 处理 | ✅ |
| `@keyframes enter` | 存在,用 `var(--tw-enter-*)` 做 transform/opacity | ✅ |
| `@keyframes exit` | 存在 | ✅ |
| `.animate-in` 规则 | `animation:enter .25s cubic-bezier(.23,1,.32,1) 0s 1 normal both` | ✅ |
| `.data-[state=open]:animate-in[data-state=open]` | 存在,值同上 | ✅ |
| `zoom-in-80[data-state=open]` | `--tw-enter-scale:.8` | ✅ |
| `fade-in-0[data-state=open]` | `--tw-enter-opacity:0` | ✅ |
| `slide-in-from-top-8[data-side=bottom]` | `--tw-enter-translate-y:calc(8*var(--spacing)*-1)` | ✅ |

用户提供的**运行时 DOM**(选中弹出的 content 元素)证明元素带着全部这些 class 且 `data-state="open"`:
```html
<div data-reka-popper-content-wrapper="" style="position: fixed; transform: translate(1193px, 59px); ...">
  <div data-slot="popover-content"
       class="... data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-80 data-[side=bottom]:slide-in-from-top-8 ..."
       data-state="open" data-side="bottom" ...>
```

**结论:CSS 规则与 DOM 都正确匹配,从纯 CSS 角度进入动画必然在播放。**

---

## ★ 你需要排查的真凶(按可能性排序)★

### 疑点 A(最可能):dev server 没重启 / 热更新没编译 @theme
我多轮修改了 `main.css` 的 `@theme inline` 和新增 `@import`。Tailwind v4 在 Vite dev 模式下,**对 `@theme` 的改动和 import 的增删,HMR 通常不会重新编译**,必须 `Ctrl+C` 完全重启 vite。
- 用户始终在 dev 模式测试,极可能没重启。
- **第一步就让用户:停掉 dev → 重启 → 硬刷新(Ctrl+Shift+R)再测。**
- 我没能强制用户做这一步,这是最大遗漏。

### 疑点 B:退出动画被 reka-ui Presence 瞬间卸载
reka-ui 用 `Presence` 控制弹出层挂载(`node_modules/.pnpm/reka-ui@2.9.7.../dist/Presence/usePresence.js`)。关闭时的逻辑:
```js
const currentAnimationName = getAnimationName(node.value); // 读 computed animation-name
if (currentAnimationName === "none") {
  dispatch("UNMOUNT");  // 立即卸载 → 退出动画来不及播
}
```
- 如果关闭瞬间 `animation-name` 还是 `none`(因为 `data-state=closed` 切换与 computed style 读取有时序竞争),退出动画永远看不到。
- **进入动画不受此影响**(元素全新挂载,`animate-in`+`fill:both` 立即播)。
- 所以若用户说"完全没动画",主要查疑点 A;若"有进入没退出",查这个。

### 疑点 C:某处 CSS 把 animation-name 覆盖成 none(已基本排除)
我搜过 `animation:none`,都在特定组件 scoped 样式里,不影响 Popover。但用户**还没确认运行时 computed `animation-name` 的值**。
- 让用户在 DevTools 选中 `data-slot="popover-content"` 的 div → Computed 面板搜 `animation-name`:
  - 值为 `enter` → 动画在跑(疑点 A:重启即可;或幅度还不够大可继续调)
  - 值为 `none` → 有覆盖规则,从那条规则反查

---

## 重要文件 / 关键路径

- 弹出层动画的 CSS 配置:`packages/mira-client/src/renderer/assets/main.css`(第 1-3 行 import,第 47-55 行 `@theme` 覆盖)
- Popover 渲染出口(动画 class 在这):`packages/mira-client/src/components/ui/popover/PopoverContent.vue`(第 35-40 行 class 串)
- 同类 Content 组件(同样可加动画,但先别动,等 Popover 跑通):`src/components/ui/context-menu/ContextMenuContent.vue`、`src/components/ui/tooltip/TooltipContent.vue`、`src/components/ui/dropdown-menu/*`、`src/components/ui/select/*`、`src/components/ui/hover-card/*`
- 用户最初报告问题的组件:`packages/mira-client/src/renderer/views/HomeView/HomeHeader.vue` 的头像 `<Dropdown>`(第 51 行起),它内部用的是上面的 PopoverContent
- Dropdown 封装:`packages/mira-client/src/renderer/components/common/Dropdown/Dropdown.vue`(把 PopoverContent 包了一层,传 `class="w-auto p-0"`)
- reka-ui 包路径(查 Presence/Popover 源码用):`node_modules/.pnpm/reka-ui@2.9.7_vue@3.5.13_typescript@5.7.3_/node_modules/reka-ui/dist/`
- Tailwind 配置:`packages/mira-client/tailwind.config.js`(v4 项目,主要靠 main.css 的 `@theme`,这个 config 影响有限)
- 构建/运行:`pnpm --filter mira-web dev`(renderer 开发)、`pnpm --filter mira-web build`(验证产物,可用 `grep` 在 `packages/mira-client/dist-renderer/assets/css/index-*.css` 里查规则)

---

## 我踩过的坑(别重复)

1. **Tailwind v4 会 tree-shake 掉它管的所有 CSS 里"未使用"的规则。** 我试过把这几种写法全删了,全部失效:`@layer base` 里的属性选择器、`@layer utilities` 里的属性选择器、裸 CSS、独立 .css 文件、Vue SFC 的非 scoped `<style>`。原因:`[data-state='open'].animate-in` 这种选择器不可能出现在任何 `class="..."` 字面量里,扫描器判它"未使用"。
   - **唯一不被 tree-shake 的方式:`@theme inline` 里重定义 `--animate-in/--animate-out`**(Tailwind 原生机制)。这个**已生效**,产物已验证。
2. **`@property {inherits:false}` 导致 `:root` 变量传不到 Portal 元素。** tw-animate-css 把 `--tw-duration` 等注册成不继承的自定义属性,而弹出层被 `PopoverPortal` 传送到 body,拿不到 `:root` 的值。所以靠设 `:root { --tw-duration }` 来调时长是无效的——这也是为什么改用 `@theme` 重定义整个 `--animate-in`。
3. **build 产物 grep 小坑**:Tailwind v4 会压缩数值,`200ms`→`.2s`、`0.23`→`.23`、`250ms`→`.25s`,grep 时别用完整数字。

---

## 给你的建议下一步(按顺序)

1. **先确认疑点 A**:让用户完全重启 dev server + 硬刷新。80% 概率这就解决了。
2. 若重启后仍无,让用户报 DevTools Computed 的 `animation-name`(疑点 C),据此分流。
3. 若值是 `enter` 但还嫌不明显,继续在 PopoverContent.vue 调幅度(已到 80/32px,可再大)或改 main.css 时长。
4. 若是退出动画问题(疑点 B),考虑给 PopoverContent 包 Vue `<Transition>` 绕过 Presence 时序,或研究 reka-ui 是否有 `forceMount` + 自管动画的选项。
5. Popover 跑通后,把同样的 class 串思路套到 ContextMenuContent/TooltipContent 等其他 Content 组件(它们各自维护 class)。

## 建议加载的 skill
- `emil-design-eng`(动画规范来源,已在仓库 `packages/mira-client/.agents/skills/emil-design-eng/SKILL.md`)
- `diagnose`(若需系统性 debug loop)
