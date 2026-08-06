## TabBar 图标化 + 接入 vue-i18n

### 决策（已与用户确认）
- i18n 语言包：zh-CN + en 全量翻译
- 语言切换：Settings 加语言下拉，存到 ExtensionSettings.locale
- TabBar：纯图标 + title tooltip（无文字）

### 一、i18n 基础设施（4 个新文件）

**1. 依赖** — `package.json` 加 `vue-i18n: ^11.4.4`（对齐 mira-dashboard-next），`pnpm install`

**2. `src/ui/i18n/index.ts`** — createI18n 实例
- `legacy: false`（Composition API），`fallbackLocale: 'zh-CN'`，初始 locale `'zh-CN'`
- App.vue 通过 watch settings.locale 同步切换 i18n.global.locale

**3-4. `src/ui/i18n/locales/zh-CN.ts` + `en.ts`** — 按模块组织（common/tab/connection/header/settings/sniffer/screenshot/upload/library/app），覆盖全部约 70-80 条文案，含带参数的动态文案（搜索{type}、{label}中...、上传选中{n}、{n}{unit} 等）

### 二、Settings 持久化 locale
**5. `src/shared/types.ts`** — `ExtensionSettings` 加 `locale: string`，`DEFAULT_SETTINGS.locale: 'zh-CN'`

### 三、入口接入
**6. `src/ui/main.ts`** — `import i18n` + `app.use(i18n)`
**7. `src/ui/App.vue`** — `watch(() => settings.value.locale, l => i18n.global.locale.value = l)`

### 四、TabBar 图标化
**8. `src/ui/components/TabBar.vue`** — 4 个 tab 改纯 SVG 图标（folder/tag/radar/gear），`:title="t('tab.x')"` 作 tooltip，active 高亮

### 五、13 个组件文案 i18n 化
App.vue、GlobalHeader、ConnectionForm、TabBar、SettingsView（+新增语言下拉）、SnifferView、ResourceItem、ScreenshotView、LibraryTreeView、UploadItem、UploadQueue、UploadQueueButton、Dropzone —— 硬编码中文全替换为 `t('key')` 或 `t('key', {var})`

### 验证
`pnpm run type-check`（vue-tsc）+ `pnpm build`

### 不改动
- background / message-router / storage（透传存储）、composables 业务逻辑、注释