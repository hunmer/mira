[根目录](../../CLAUDE.md) > [packages](..) > **mira-doc**

# mira-doc

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-20 | 初始化 | 首次生成模块文档 |

## 模块职责

Mira 系统完整文档站，使用 VitePress 驱动。提供项目文档、API 文档、使用指南等内容。

## 入口与启动

- **文档目录**: 按标准 VitePress 项目组织
- **开发命令**: `pnpm run docs:dev` -- VitePress 开发服务器
- **构建命令**: `pnpm run docs:build` -- 生成静态站点
- **预览命令**: `pnpm run docs:preview`

## 关键依赖与配置

- **框架**: VitePress 2.0.0-alpha.12
- **包管理**: pnpm

## 相关文件清单

| 文件 | 说明 |
|------|------|
| `package.json` | 包配置 (v1.0.0, MIT) |
| `.vitepress/` | VitePress 配置和主题 |
