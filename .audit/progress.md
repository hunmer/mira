## 2026-08-24 设备间分享票据（增量）

- 新增 server 路由：`POST /api/devices/share-tickets`（创建票据，认证）→ SDK `DeviceModule.createShareTicket` 覆盖（covered，contract test 已加）；`GET /api/devices/share/:ticketId`（免认证下载，PUBLIC_PREFIXES 放行）→ P3 排除（文件流响应，URL 由调用方拼接）。
- 流水线重跑：P0/P1 清零，无未编码决策；顺带补 `GET /api/plugins/store`（F1 dashboard 插件商店页）为 P2 待纳入。
- 测试基线更新：81 tests（DeviceModule 契约 +1）。
