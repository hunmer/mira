# Reka UI 状态绑定陷阱

本文记录 Mira Client 使用 `reka-ui 2.9.7` 时已确认的状态绑定问题。业务代码应通过 `@/components/ui/*` 使用 shadcn-vue 封装组件，不要直接导入 `reka-ui`。

## 核心问题：不要沿用 `checked` API

`SwitchRoot` 和 `CheckboxRoot` 使用 Vue 默认的双向绑定协议：

- prop：`modelValue`
- event：`update:modelValue`
- 简写：`v-model`

它们不支持旧写法中的 `checked` prop 和 `update:checked` 事件。

### 错误写法

```vue
<Switch
  :checked="enabled"
  @update:checked="enabled = $event"
/>

<Checkbox v-model:checked="selected" />
```

### 正确写法

```vue
<Switch
  :model-value="enabled"
  @update:model-value="enabled = $event"
/>

<Checkbox v-model="selected" />
```

需要调用异步方法或写入 store 时，使用显式事件：

```vue
<Switch
  :model-value="settingsStore.settings.networkProxyEnabled"
  @update:model-value="enabled => settingsStore.updateSetting('networkProxyEnabled', enabled)"
/>
```

## 为什么界面看起来正常

错误绑定不会一定产生运行时异常。`checked` 会作为未识别属性继续传递，而组件内部仍可维护自己的状态，所以点击后开关可能发生视觉变化。

但外部 ref 或 Pinia store 不会更新。依赖外部状态的其他控件仍保持旧状态，例如：

```vue
<Input :disabled="!settingsStore.settings.networkProxyEnabled" />
```

此时 Switch 看起来已开启，input 实际仍带有 `disabled`，表现为无法聚焦或输入。

## 根因确认方法

遇到“组件视觉已变化，但业务状态未变化”时，按以下顺序检查：

1. 查看项目封装组件，例如 `src/components/ui/switch/Switch.vue`。
2. 查看其 `defineProps`、`defineEmits` 和 `useForwardPropsEmits` 使用的类型。
3. 必要时查看 `node_modules/reka-ui/src/<Component>/<Component>Root.vue`，以当前安装版本源码为准。
4. 在业务代码中搜索旧 API：

```powershell
rg -n "update:checked|v-model:checked|:checked=" "packages/mira-client/src"
```

不要仅根据旧版 radix-vue 示例、记忆或组件视觉状态判断 API 是否正确。

## 开发检查清单

- 新增或迁移状态组件时，优先使用无参数 `v-model`。
- 需要副作用时，使用 `:model-value` 和 `@update:model-value`。
- 复制旧代码后，检查是否残留 `checked/update:checked`。
- 联动控件必须验证真实外部状态，而不只观察开关动画。
- 提交前运行 `pnpm --dir "packages/mira-client" run type-check` 和 `pnpm --dir "packages/mira-client" run build`。

## 已确认案例

- `NetworkPanel.vue`：Switch 使用旧 API，导致 `networkProxyEnabled` 始终未更新，代理地址 Input 持续禁用。
- `FolderTreeComponent.vue`：Checkbox 使用 `v-model:checked`，导致外部 ref 未更新。详见 [Checkbox v-model:checked 无效问题](./checkbox-binding-pitfall.md)。

