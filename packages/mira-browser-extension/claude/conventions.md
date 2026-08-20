# 开发约定

## 命令

| 命令 | 用途 |
|------|------|
| `pnpm --filter mira-browser-extension dev` | vite + @crxjs HMR 开发 |
| `pnpm --filter mira-browser-extension build` | 类型检查 + 生产构建(`vue-tsc --noEmit && vite build`),产物在 `dist/` |
| `pnpm --filter mira-browser-extension type-check` | 仅类型检查(`vue-tsc --noEmit`) |
| `pnpm --filter mira-browser-extension test` | vitest 单测(目前 19 个测试文件,约 137 用例) |
| `pnpm --filter mira-browser-extension test:watch` | vitest watch |

**加载到 Chrome**:`chrome://extensions` → 开发者模式 → 加载已解压 → 选 `dist/`。改代码后必须 build + 重新加载扩展 + 刷新目标页。

## 代码风格

- TypeScript strict(`tsconfig.json`),`moduleResolution: bundler`。
- 路径别名 `@/* → src/*`(tsconfig + vite + vitest 三处都配)。
- Vue3 `<script setup lang="ts">` + scoped CSS。
- 注释用中文(与现有代码一致),日志前缀 `[mira-ext][tag]`。
- 文件名:ts/vue 用 kebab/camel(见现有),claude 文档用 kebab-case。

## 关键约定(MV3 坑,务必遵守)

1. **不要用裸 ArrayBuffer 或 Uint8Array 跨 sendMessage 传文件** → 用 `fileToStaged`(转 `number[]`)。详见 [data-model.md](data-model.md)。
2. **offscreen reason 必须用 `chrome.offscreen.Reason.BLOBS`**(枚举成员,非字符串字面量;非 `IMAGE_PROCESSING`)。
3. **offscreen HTML 与 upload HTML 都必须在 `vite.config.ts` 的 `rollupOptions.input` 声明**,否则不进 dist。
4. **向 content script 发消息用 `sendToContent`**(`background/inject.ts`),它会程序化注入兜底;不要直接 `chrome.tabs.sendMessage` 后不处理 reject。
5. **扩展环境禁止 eval/Function**:动态代码(maxurl)只能注入页面 MAIN world。
6. **`chrome` 在测试环境不存在**:任何顶层(模块加载时)访问 `chrome.*` 必须 `typeof chrome !== 'undefined'` 守卫(见 `shared/debug.ts`)。
7. **新加 offscreen/content/UI 之间的消息**:在 `shared/messages.ts` 的 Request/Event/ContentCommand 联合类型 + `REQUEST_TYPES`/`COMMAND_TYPES`/`EVENT_TYPES` 集合里都登记,`isRequest`/`isContentCommand` 才能识别。
8. **不要动 `vite.config.ts` 的 `vue` 单路径 alias**:`mira-plugin-ui` 是 npm 实体目录,不钉死会出现双 vue 实例(slot/inject 崩溃)。

## 设计规范

- 设置全走 `ExtensionSettings`(`shared/types.ts`)+ `chrome.storage.local`,默认值在 `DEFAULT_SETTINGS`。
- 跨上下文状态用「消息驱动」:UI/content 发 Request,SW 处理 + 广播 Event。
- 上传统一进 `uploader` 队列(`createUploader`,并发 3、重试 2、成功 10s 移除),所有来源(screenshot/dragdrop/sniffer/dropzone)汇入。
- 截图/嗅探/拖拽功能在受限页(`chrome://` 等)要优雅降级,不崩。

## 调试

- 设置页有「调试日志」开关 → `chrome.storage.local` 的 `mira_debug`。
- 开启后 `console` 过滤 `mira-ext`:
  - **网页功能(截图/嗅探/拖拽/maxurl)**:在**网页** F12 看。
  - **SW 功能(上传/截图编排)**:扩展页 → Service Worker 链接 → 看 `[bg]/[capture]/[router]/[upload]`。
  - **弹窗 UI**:右键扩展图标 → 检查弹出内容。
