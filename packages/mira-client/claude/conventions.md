# mira-client 约定与规则

## 编码约定

- Vue 3 Composition API(`<script setup>`)
- 组件按功能分层:views / components / composables / services / stores / controllers / modules
- 文件:PascalCase(类/组件)、camelCase(函数/变量);目录 camelCase 或 kebab-case

## UI 约定(迁移后强制)

- **只用** `@/components/ui/*`(shadcn-vue,new-york 样式)的组件
- **禁止**使用原生 HTML 控件替代(`<select>` / `<dialog>` / `<input type=checkbox>` 等)
- **禁止**直接 `import ... from 'reka-ui'`(必须经 ui 封装层)
- **禁止**重新引入 `volt/` 库或 `--mira-*` / `--surface-*` 自定义变量(已全部迁到 shadcn 语义 token)
- 新增基础组件:`npx shadcn-vue@latest add <name>`(配置见 `components.json`)

## 状态管理

- Pinia 3,11 个 Store(见 public-interfaces.md)
- 持久化由各 Store 自行决定

## Electron 安全

- Context Isolation 启用,Node Integration 禁用
- IPC 通信必须经 `contextBridge.exposeInMainWorld` 暴露的安全 API,不直接用 `require`
- 自定义协议 `mira://` 处理本地资源/缩略图

## 路径别名

```typescript
"@/*":        ["./src/*"]
"@renderer/*":["./src/renderer/*"]
"@main/*":    ["./src/main/*"]
```

`components.json` 额外定义:`@/components`、`@/lib`、`@/components/ui`、`@/renderer/composables`。

## 命令

```bash
pnpm run dev                 # Vite 开发服务器(渲染)
pnpm run electron:dev        # Electron 开发模式(Win 下含 chcp 65001)
pnpm run build               # 构建渲染进程
pnpm run build:all           # 构建所有进程(renderer + main + preload + float)
pnpm run build:prod          # 生产构建(cross-env NODE_ENV=production)
pnpm run electron:build:win  # Windows 打包(electron-builder)
pnpm run electron:build:mac  # macOS 打包
pnpm run type-check          # vue-tsc 类型检查(无独立测试,这是主门禁)
pnpm run lint                # ESLint 9 --fix
pnpm run clean               # 清理 dist*/build/docs 产物
```

## 注意事项

- `tailwind.config.js` 是 **v3 死文件**,改样式请改 `src/renderer/assets/main.css`
- 弹出层动画变量 `--animate-in/out` 已在 `main.css` 的 `@theme` 中覆盖 `tw-animate-css` 默认值;dev 下可能不生效(已知技术债),生产正常
- `__VUE_OPTIONS_API__: true`:Options API 与 Composition API 并存,新代码用 `<script setup>`
