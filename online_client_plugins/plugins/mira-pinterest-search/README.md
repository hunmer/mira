# Pinterest 视觉搜索

从 Eagle 插件 `22069a4c-58e0-44d7-89d9-69f014158acd` 迁移的 Mira 客户端插件。

在 Mira 中选中图片后，从媒体右键菜单选择「Pinterest 视觉搜索」。插件窗口复用原 Pinterest 搜索界面，并通过 `compat.js` 将 Eagle 的窗口、日志、选中素材和外部链接调用映射到 Mira 客户端 API。

搜索结果中的「保存图片」会打开原图 URL；当前版本不直接写入 Mira 素材库，避免绕过宿主上传接口。

## 验证

1. 运行 `node scripts/build-client-plugins-index.mjs`。
2. 将 `online_client_plugins` 作为客户端插件市场源。
3. 在 Mira 选中一张图片，右键执行「Pinterest 视觉搜索」。
