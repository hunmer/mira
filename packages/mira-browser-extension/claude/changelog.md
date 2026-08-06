# 索引变更记录

> 本文件记录「AI 上下文索引」的生成/更新,与产品功能 Changelog 分开。仅保留最近 5 条。

## 2026-08-06 11:41 — 初始化索引(首次)

- **范围**:全量扫描 `packages/mira-browser-extension/`(单模块),src 54 个文件 + 根配置 + public。
- **生成**:
  - 根 `CLAUDE.md`(轻量索引:简介 + 关键约定 + 文件索引 + 扫描状态)
  - `claude/` 下 11 个详情文件:overview / conventions / module-responsibilities / entrypoints / public-interfaces / dependencies-and-config / data-model / testing-and-quality / file-map / faq / changelog
- **覆盖率**:源码 54/54 文件已读;4 个运行时上下文(background/content/offscreen/ui)+ shared 全覆盖;消息协议/类型/测试/配置均纳入。
- **来源**:基于本会话对全部源文件的实际读取 + 构建产物验证(非臆测)。
- **跳过**:`dist/`(构建产物)、`public/maxurl.user.js` 内容(7.2MB userscript,仅记用途)、`node_modules/`。
- **下一步建议**:
  - 本包内无子模块需深挖;若仓库根要做整体索引,可对 `packages/mira-app-core`(SDK)、`packages/mira-client`(Electron 客户端)、`packages/mira-dashboard-next` 单独 `/init-project`。
  - maxurl.user.js 的具体 site 规则集未展开(超大,按需)。
