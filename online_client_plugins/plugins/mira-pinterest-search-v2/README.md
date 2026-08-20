# Pinterest 视觉搜索 v2

原 `mira-pinterest-search`（Eagle 插件迁移的编译产物）的 **shadcn-vue 重写版**。
UI 全部改用 `packages/mira-plugin-ui`（shadcn-vue / reka-ui + tailwind token），
源码工程化（Vite + TS），`pnpm dev` 即可启动开发服务器。

## 功能

- 从 Mira 选中图片右键「Pinterest 视觉搜索 v2」打开窗口（`query.media` 传入选中项）
- 多任务队列（并发 3），左栏任务列表 / 中栏种子图裁剪 / 右栏瀑布流结果
- 局部裁剪搜索：中栏拖动框选画面区域，仅搜索该区域
- 瀑布流复用 `mira-plugin-ui/library` 通用 `MediaWaterfall` 组件（自 MediaBrowser 抽离，
  新增列宽模式与触底加载）：列宽即缩放值，触底以结果图作为新种子 + bookmark 分页持续加载
- 保存图片：探测原图（originals PNG/JPG）后经宿主 `item.addFromURL` 写入素材库（旧版只打开 URL）
- 反向搜索（F）：把任意结果作为新任务继续搜图
- 大图预览（Space）、在 Pinterest 打开（O）、窗口置顶（Shift+T）
- 缩放：+/-、Ctrl/Alt/⌘+滚轮、顶栏滑杆（160~720px 列宽，localStorage 记忆）
- 拖拽图片文件 / Ctrl+V 粘贴图片新建任务；超过 5 张弹窗确认
- 空态 / 搜索中 / 无结果 / 网络错误 / 未登录（401）分态展示，失败可重试
- 暗色模式跟随宿主主题

相对旧版修复的缺陷：分页 bookmark 按任务隔离（旧版全局共享会串任务）；
内置中文文案（旧版 i18n 被剥离显示裸 key）；不再无条件把种子图 canvas 转 JPEG
（旧版逻辑恒真，PNG 透明变黑底、GIF 丢帧）。

## 开发

```bash
pnpm install            # mira 仓库根目录执行（workspace 链接 mira-plugin-ui）
pnpm dev                # http://localhost:5174，宿主 API 自动降级为 dev mock
```

浏览器开发调试：`http://localhost:5174/?demo=1` 加载示例图任务。
注意：Pinterest API 的登录态依赖插件窗口（Electron）session 中的 Cookie，
纯浏览器 dev 下搜索请求可能 401/跨域失败，属预期；UI 交互仍可完整验证。

## 构建与安装

```bash
pnpm build              # 产物输出 dist/
node scripts/build-client-plugins-index.mjs   # mira 仓库根目录刷新插件索引
```

将 `online_client_plugins` 作为客户端插件市场源，在 Mira 中安装/启用
「Pinterest 视觉搜索 v2」，选中图片右键即可使用。原 v1 编译产物版已卸载（目录移除并重建索引）。

## 结构

```
index.js            宿主侧脚本：注册 UI 贡献 + 媒体右键菜单，开窗传 query.media
plugin.json         插件清单（pluginId 7c1f9e2a-…）
src/main.ts         SPA 入口（mira-plugin-ui.css + tailwind 环境）
src/lib/mira.ts     宿主桥接（window.mira，dev 下自动 mock）
src/lib/pinterest.ts  视觉搜索 API（PUT /v3/visual_search/extension/image/）
src/stores/tasks.ts 任务队列 / 分页 / 裁剪搜索 / 反向搜索 / 保存
src/components/     HeaderBar / TaskList / ImagePreview / ResultCard(MdiaWaterfall 插槽) / 对话框
```
