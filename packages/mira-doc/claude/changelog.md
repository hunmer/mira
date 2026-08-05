# 变更记录

> 倒序排列（最新在前）。

## 2026-08-05

- **类型**: 重新初始化 / 全量重写
- **操作**:
  - 重写 `CLAUDE.md` 为轻量索引（项目介绍 / 约定规则 / 文件索引表 / 扫描状态）。
  - 重写 `claude/overview.md`：补充项目定位、模块职责、顶层目录树、入口命令。
  - 新建 `claude/conventions.md`：scripts 约定、VitePress 配置约定、文档编写约定、忽略规则、部署约定。
  - 新建 `claude/entrypoints.md`：VitePress 配置入口、站点级与主题配置字段、命令入口。
  - 新建 `claude/public-interfaces.md`：完整导航（6 项）与侧边栏（4 分区）结构，标注占位链接。
  - 新建 `claude/dependencies-and-config.md`：依赖清单（仅 vitepress）、package.json 关键字段、CI/部署、忽略规则。
  - 新建 `claude/file-map.md`：完整文件清单（含占位链接标注）。
- **关键发现**:
  - `package.json` 的 `main: index.js` 文件实际不存在（遗留字段）。
  - `repository.url` 指向 `hunmer/mira-doc`，但 `editLink`/`socialLinks` 使用 `hunmer/mira_typescript`。
  - 侧边栏存在多个占位链接（guide/api/n8n 下共约 13 个 Markdown 文件未创建），依赖 `ignoreDeadLinks: true` 跳过。

## 2026-06-09

- **类型**: 结构重构
- **操作**: 重构文档为索引+详情分离。

## 2026-05-25

- **类型**: 增量更新
- **操作**: 补充文档目录结构。

## 2026-05-20

- **类型**: 初始化
- **操作**: 首次生成模块文档。
