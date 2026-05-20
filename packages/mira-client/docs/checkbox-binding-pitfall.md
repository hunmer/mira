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
