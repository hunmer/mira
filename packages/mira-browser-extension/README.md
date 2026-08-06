# mira-browser-extension

Mira 浏览器扩展(Chrome MV3)。网页采集入口:截图、拖拽上传、资源嗅探、自动滚动。

## 开发

pnpm install
pnpm --filter mira-browser-extension dev   # vite + @crxjs HMR,加载 dist/ 到 chrome://extensions

## 构建

pnpm --filter mira-browser-extension build  # 产物在 dist/,可直接加载

## 加载扩展

1. `pnpm --filter mira-browser-extension build`
2. 打开 `chrome://extensions`
3. 开启右上角「开发者模式」
4. 点「加载已解压的扩展程序」,选择 `dist/` 目录
5. 扩展出现在列表中,无报错;点工具栏 Mira 图标即可使用

> 要求 Chrome 116+(offscreen API)。

## 手动验证清单

加载扩展并连接到 Mira 后端后,逐项验证。Chrome API 与 UI 无法自动化测试,以此清单为验收 gate。

### 连接

- [ ] 点图标 → popup 出现 → 显示连接表单
- [ ] 输入服务器地址 + 账密 → 连接 → 状态灯变绿 → 出现素材库下拉
- [ ] 错误账密 → 显示错误信息,不崩溃

### 上传

- [ ] 拖文件到拖放区 → 进入队列 → 上传成功 → 10s 后移除
- [ ] 网页拖起图片 → 出现「上传到 Mira」按钮 → 拖到按钮 → 上传
- [ ] 右键图片 → 「Mira · 上传此图片」→ 上传
- [ ] 上传中点取消 → 任务停止

### 截图

- [ ] 可视区域截图 → 上传队列出现 `screenshot-xxx.png`
- [ ] 整页截图 → 滚动后上传拼接图(fixed 元素重复为已知限制)
- [ ] 选区截图 → 框选后上传裁剪图;Esc 取消
- [ ] chrome:// 页截图 → 提示不支持

### 嗅探

- [ ] 开启嗅探 → 资源列表出现图片/视频/音频
- [ ] 多选 → 「上传选中」→ 队列出现
- [ ] 关闭嗅探 → 列表不再增长

### 自动滚动

- [ ] 开启自动滚动 → 页面自动滚到底 → 停止
- [ ] 无限流页面 → 滚到 50 屏上限停止

### 设置

- [ ] 切换 UI 模式 → side panel / popup 生效
- [ ] 改默认标签 → 上传的文件带标签
- [ ] 关闭拖拽按钮 → 页面拖图不弹 popover

