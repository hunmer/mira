# src/renderer/views/LoginView - 登录页面

[根目录](../../../../CLAUDE.md) > [src/renderer](../../../CLAUDE.md) > [views](../CLAUDE.md) > **LoginView**

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-08-07 | 按功能拆分多文件 | 由单文件 LoginView.vue 拆为 index.vue + 子组件 + 组合式函数 |

## 概述

登录 / 服务器连接页面，是应用首次启动或断开后重新连接的入口。通过三步向导完成：
1. **服务器连接**：从已保存列表选择或新增服务器（含后端可用性检测）
2. **认证**：登录 / 注册（若后端 `authRequired === false` 可跳过）
3. **素材库选择**：选择有权限的素材库并完成连接

布局参照 `HomeView/` 的拆分约定：`index.vue` 作为编排层，子组件承载 UI 区域，组合式函数承载业务逻辑。

## 文件列表

### 子组件（UI 区域，props/emits 通信）

| 文件 | 行数 | 描述 |
|------|------|------|
| `index.vue` | ~170 | 编排层：背景/容器/关闭/错误横幅 + 接线子组件与组合式函数 |
| `LoginStepper.vue` | ~40 | 顶部三步进度条 |
| `ServerStep.vue` | ~180 | 步骤 1：服务器列表 + 添加表单 + 删除确认 |
| `AuthStep.vue` | ~120 | 步骤 2：登录 / 注册 Tab 表单 |
| `LibraryStep.vue` | ~70 | 步骤 3：素材库选择 |
| `DeployGuideDialog.vue` | ~80 | 部署指南入口 + 两层对话框（在线 / 手动） |

### 组合式函数（业务逻辑）

| 文件 | 行数 | 描述 |
|------|------|------|
| `useLoginState.ts` | ~60 | 共享 UI 状态：步骤序号 / 加载 / 错误 / 各步表单字段 |
| `useBackendStatus.ts` | ~85 | 后端可用性并发检测 + 徽标 class/文案计算 |
| `useSavedCredentials.ts` | ~40 | 登录凭据 localStorage 存取（按 serverUrl 归档） |
| `useConnectionFlow.ts` | ~200 | 连接流程核心：测试连接 / 登录 / 注册 / 拉取库 / 连接库 |

## 使用方式

```typescript
// 在 index.vue 中
import { useLoginState } from './useLoginState'
import { useBackendStatus } from './useBackendStatus'
import { useConnectionFlow } from './useConnectionFlow'

const state = useLoginState()
const { backendStatus, checkAllBackends, ... } = useBackendStatus()
const { quickConnect, testConnection, handleLogin, ... } = useConnectionFlow(state)
```

## 数据流

```
index.vue (编排)
  ├─ useLoginState        ──┐ 共享 refs/reactive（currentStep/loading/error/表单字段）
  ├─ useBackendStatus       │ 后端检测状态 + class 计算函数
  └─ useConnectionFlow  ◀───┘ 接收 state，返回流程方法
        │
        ▼
  子组件 (props ↓ / emits ↑)
   ServerStep / AuthStep / LibraryStep / LoginStepper / DeployGuideDialog
```

## 依赖

- **Stores**：`auth`、`serverList`、`library`
- **外部组件**：`Aurora.vue`、`DeploymentChecklist.vue`、`ManualDeployGuide.vue`
- **SDK**：`mira-app-core/shared/sdk`（MiraClient、HealthResponse、Library 类型）
- **服务**：`MiraSDKService`（最终连接）
