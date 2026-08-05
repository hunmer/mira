# 欢迎示例插件 (mira-welcome-demo)

Mira 客户端插件市场的演示插件，展示插件系统的基本能力：配置读写、事件监听、UI 交互、日志记录。

## 功能

- 读取/打印配置项（`exampleSetting`、`enableLogging`）
- 监听 `fileOpened` / `fileSelected` 事件
- 通过 `api.ui.showDialog` 弹出示例对话框（快捷键 `Ctrl+Shift+E`）
- 通过 `api.ui.showNotification` 发送初始化通知

## 入口

- `index.js` — 插件主入口
- `plugin.json` — 插件元数据
