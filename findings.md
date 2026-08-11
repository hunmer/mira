# 发现

- maxurl 运行在网页 MAIN world，扩展 MV3 禁止 eval/Function；可编辑规则必须是数据。
- 当前 Pinterest 快速规则位于 `src/shared/imu.ts` 的 `pinterestOriginalUrl`。
- 设置持久化统一走 `ExtensionSettings`、`DEFAULT_SETTINGS`、`mergeWithDefaults`。
- 设置页面入口位于 `src/ui/components/settings/SettingsView.vue`，已有 `useSettings`、`useDialog` 模式。
- 规则选择采用结构化 JSON：`name/host/path/replacement`，运行时只编译正则并调用 `replace`。
- `upgradeImageUrl` 的三类调用（网页拖拽、嗅探、库面板 URL 拖拽）都可传入设置中的规则。
- `DialogHost` 已增加 textarea 类型，用于格式化 JSON 编辑；Enter 保留换行，Escape 取消。
- 存储层会过滤字段不完整的规则；运行时会跳过正则无效的规则并记录警告。
