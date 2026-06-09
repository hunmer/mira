# 常见问题

**Q: 如何添加新的 API 路由？**
A: 在 `src/routes/` 下创建新的 Router 文件（可继承 `BaseRouter`），在 `HttpServer.ts` 中 import 并注册。

**Q: 如何添加新的 WebSocket 消息处理？**
A: 在 `src/handlers/` 下创建 Handler，在 `routes/WebSocketRouter.ts` 中注册路由。

**Q: 如何开发服务端插件？**
A: 继承 `ServerPlugin` 抽象类，在 `plugins.json` 中注册，导出 `init(inst)` 函数。参考 `plugins/plugins/` 下现有插件。

**Q: 如何拦截 HTTP 请求？**
A: 在插件构造函数中调用 `pluginManager.registerHttpHook({ method, path, handler })`。

**Q: 如何扩展缩略图支持更多格式？**
A: 实现 `ThumbnailGenerator` 接口，通过 `thumbnailService.registerGenerator()` 注册。参考 `mira_thumb_imagemagick` 插件。
