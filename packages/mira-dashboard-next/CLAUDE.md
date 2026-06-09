# mira-dashboard-next

Web 管理面板（全新版本），替代原 Vben Admin 版本。基于 shadcn-vue + Tailwind CSS 4 构建。提供素材库管理、插件管理、用户管理、文件操作、统计分析等功能。支持中英文 i18n。

## 约定

- shadcn-vue 组件库，不引入其他 UI 框架
- vee-validate + zod 表单验证
- 权限体系：super > admin > user
- API 通过 `src/api/client.ts` 统一 axios 封装

## 文件索引

| 文件 | 说明 |
|------|------|
| [claude/overview.md](claude/overview.md) | 模块总览、认证架构、依赖 |
| [claude/public-interfaces.md](claude/public-interfaces.md) | 页面路由、API 模块、Store |
| [claude/file-map.md](claude/file-map.md) | 全部源文件清单 |
| [claude/changelog.md](claude/changelog.md) | 变更记录 |

## 扫描状态

- **版本**: 0.0.0 (private)
- **扫描时间**: 2026-06-09T11:59:31+08:00
- **测试**: 无
