# src/renderer/config - 应用配置

[根目录](../../../CLAUDE.md) > [src/renderer](../CLAUDE.md) > **config**

## 变更记录

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-12 | 新建文档 | 首次创建 |

## 模块职责

存放应用级静态配置，目前仅包含默认快捷键定义。

## 文件清单

| 文件 | 行数 | 描述 |
|------|------|------|
| `defaultShortcuts.ts` | 704 | 默认快捷键动作和绑定配置 |

## defaultShortcuts.ts

导出 `defaultShortcutConfig: ShortcutConfig`，被 `ShortcutService` 加载。

### 动作分类 (defaultActions)

| 分类 | 动作 ID | 描述 |
|------|---------|------|
| general | `app.search` | 全局搜索 |
| general | `app.settings` | 打开设置 |
| general | `app.help` | 帮助文档 |
| general | `app.quit` | 退出应用 |
| navigation | `nav.home` | 返回首页 |
| navigation | `nav.activate-last-tab` | 激活上次 Tab |
| navigation | `nav.reopen-closed-tab` | 重开关闭的 Tab |
| file | `file.upload` | 上传文件 |
| file | `file.import` | 导入文件 |
| media | `media.play-pause` | 播放/暂停 |
| media | `media.next` | 下一个 |
| media | `media.previous` | 上一个 |

完整动作和绑定定义参见源文件。

### 通信方式

动作回调通过 `CustomEvent` 触发（如 `shortcut:global-search`），由各组件监听执行实际逻辑。

## 测试与质量

无独立测试。
