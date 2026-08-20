# Checkbox v-model:checked 无效问题

## 现象

shadcn-vue (基于 reka-ui) 的 `Checkbox` 组件使用 `v-model:checked` 绑定 ref 时，勾选/取消勾选不会更新外部 ref 的值，ref 始终保持初始值。

## 根因

reka-ui 的 `CheckboxRoot` 只支持 `modelValue` / `update:modelValue` 双向绑定，内部通过 `useVModel(props, 'modelValue', ...)` 实现。**不存在 `checked` prop 和 `update:checked` 事件。**

`v-model:checked` 会被 Vue 展开为 `:checked` + `@update:checked`，但 CheckboxRoot 从不读取 `checked` prop，也不触发 `update:checked` 事件。点击时内部状态切换了，外部 ref 不受影响。

## 正确写法

```vue
<!-- 错误 -->
<Checkbox v-model:checked="someRef" />

<!-- 正确 -->
<Checkbox :model-value="someRef" @update:model-value="someRef = $event" />

<!-- 或者简写 -->
<Checkbox v-model="someRef" />
```

`v-model` 默认绑定 `modelValue` / `update:modelValue`，所以 `v-model="someRef"` 是最简洁的正确写法。

## 注意

这不是 Vue 的 bug，而是 reka-ui 的 API 设计选择。对比 radix-vue (旧版) 的 Checkbox 同时支持 `checked` 和 `modelValue`，但 reka-ui (新版) 只保留了 `modelValue`。

## 受影响文件

- `src/renderer/components/business/FolderTreeComponent/FolderTreeComponent.vue` — 删除文件夹时 `deleteWithFiles` 始终为 false（已修复）
- `src/renderer/views/settings/pluginPlan.vue` — 「自动扫描插件」「自动更新插件」开关（已修复，含补上 autoLoadPlugins 持久化）
- `src/renderer/views/settings/GeneralPanel.vue` — 「自动启动服务器」「关闭到托盘」开关（已修复）
- `src/renderer/views/settings/NotificationsPanel.vue` — 「启用通知」「导入通知」开关（已修复）
- `src/renderer/views/settings/playground/PageSlidePlayground.vue` — 退出动效开关（已修复，改用 `v-model`）
- `src/renderer/components/business/IntegrationCard.vue` — 插件启用开关（已修复）
- `src/renderer/components/business/ShortcutManagerDialog.vue` — 全局快捷键 Checkbox（已修复）
- `src/renderer/components/business/ServerEditDialog.vue` — 保存登录信息 Checkbox（已修复）
- `src/renderer/components/common/MultiTabFileUpload.vue` — 文件类型 / 上传时间筛选 Checkbox ×2（已修复）

注意：Checkbox 的 `update:modelValue` 载荷类型为 `boolean | 'indeterminate'`，赋给 boolean 字段时用 `Boolean($event)` 归一化。

注意：原生 `<input type="checkbox">` 或自定义组件使用 `:checked` 传参是正确的，不在本问题范围内。
