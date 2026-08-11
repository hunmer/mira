# Skill

Skill 是面向 AI Agent 的「按需加载知识包」约定：每个 skill 是一个目录，内含一份 `SKILL.md`，Agent 框架（如 ZCode、Claude）根据 frontmatter 的 `description` 自动判断何时加载。

> Skill 机制不属于 Mira 业务代码 —— Mira 仓库只是按该约定贡献了若干项目专属 skill。

## 文件结构

每个 skill 一个子目录，放在 `.agents/skills/`：

```
.agents/skills/
└── <skill-name>/
    ├── SKILL.md          # 必需：frontmatter + 正文
    └── references/       # 可选：补充参考文档
```

## SKILL.md 格式

仅需两个 frontmatter 字段，正文为 Markdown：

```markdown
---
name: my-skill
description: 一句话说明能力 + 触发条件（Agent 据此判断是否加载）
---

# 正文

具体步骤、命令、约定……
```

## 项目内置 Skill

Mira 仓库内置三个 skill，位于 `.agents/skills/`：

| Skill | 说明 | 触发场景 |
|-------|------|---------|
| **mira-cli** | 通过 `mira-app-server` CLI 操作 Mira 媒体库服务器 | 管理库/文件/标签/文件夹/插件/设备、查数据库、检查健康度或鉴权 |
| **mira-format-plugin-migration** | 将 Eagle 格式插件迁移为 Mira 服务端/web 插件 | 移植处理文件格式、缩略图、预览 URL、容器资源或共享 viewer 的 Eagle 插件到 `plugins/plugins` |
| **procm-mcp** | procm-mcp 工具不可用时的 HTTP API 降级方案 | procm-mcp MCP 工具连不上/工具缺失/传输错误时，需启停后台进程、读写日志 |

## 使用方式

Skill 由外层 Agent CLI 框架自动发现与触发，无需手动调用。当 Agent 判断某 skill 的 `description` 匹配当前任务时，会自动加载其 `SKILL.md` 并按其中的指引操作。

例如对 ZCode：在项目根目录放置 `.agents/skills/<name>/SKILL.md` 即可被识别（详见用户级 `~/.zcode` 与工作区 `.zcode` 配置）。
