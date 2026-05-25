# 多步骤登录流程

## 概述

客户端登录改为 3 步 Stepper 流程：服务器连接 → 认证 → 素材库选择。服务端新增 settings 管理（认证策略）和素材库角色控制。Dashboard 新增设置对话框和素材库角色配置。

## 整体流程

```
Client (LoginView)          Server (mira-app-server)        Dashboard
─────────────────           ─────────────────────           ──────────
Step 1: 输入服务器地址
  ├─ GET /api/health ──────► 返回 authRequired,
  │                         allowRegistration
  │
  ├─ authRequired=false ──► 跳到 Step 3
  │
  └─ authRequired=true ───► 进入 Step 2

Step 2: 输入用户名密码
  ├─ POST /api/auth/login ─► 验证凭据，返回 accessToken
  ├─ GET /api/auth/verify ─► 返回 user.role (super/admin/user)
  │
  └─ allowRegistration=true 时显示注册入口

Step 3: 选择素材库
  ├─ GET /api/libraries ───► 返回素材库列表 (含 allowedRoles)
  │
  ├─ 按 user.role 过滤: lib.allowedRoles 包含 user.role
  │  无 allowedRoles 字段 = 所有角色可访问
  │
  └─ 选中后连接，写入 authStore + serverListStore，跳转首页
                            配置入口:
                            Overview 页 → Settings Dialog
                            ├─ authRequired (是否需要认证)
                            └─ allowRegistration (是否允许注册)

                            Library 表单 → 角色勾选
                            ├─ super
                            ├─ admin
                            └─ user
```

## 服务端变更

### settings.json

位置: `{DATA_PATH}/settings.json`

```json
{
  "authRequired": true,
  "allowRegistration": true
}
```

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| authRequired | boolean | true | 客户端是否需要认证才能访问 |
| allowRegistration | boolean | true | 是否允许新用户注册 |

### 新增 API

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | /api/settings | 无 | 获取设置 |
| PUT | /api/settings | admin | 更新设置 |

### /api/health 增强

原有响应基础上增加两个字段:

```json
{
  "code": 0,
  "data": {
    "status": "ok",
    "authRequired": true,
    "allowRegistration": true,
    ...
  }
}
```

### 素材库 allowedRoles

素材库 (`librarys.json`) 新增可选字段:

```json
{
  "id": "123",
  "name": "素材库A",
  "allowedRoles": ["super", "admin"]
}
```

| 值 | 含义 |
|----|------|
| 缺失或空数组 | 所有角色可访问 |
| `["super", "admin"]` | 仅 super 和 admin 可访问 |

三个固定角色: `super` / `admin` / `user`。

### 新增文件

| 文件 | 职责 |
|------|------|
| `src/SettingsManager.ts` | 读写 `data/settings.json` |
| `src/routes/SettingsRouter.ts` | GET/PUT `/api/settings` |

### 修改文件

| 文件 | 变更 |
|------|------|
| `src/MiraServer.ts` | 集成 SettingsManager |
| `src/HttpServer.ts` | health 响应增加 authRequired/allowRegistration，注册 SettingsRouter |
| `src/routes/LibraryRoutes.ts` | GET/POST/PUT 支持 allowedRoles |

## Dashboard 变更

### Overview 设置对话框

Overview 页新增 Settings 按钮，弹出对话框含两个 Switch:
- 需要认证 (authRequired)
- 允许注册 (allowRegistration)

保存时调用 `PUT /api/settings`。

### Library 角色勾选

素材库创建/编辑表单新增「允许访问的角色」区域，三个 checkbox: super / admin / user。默认全选。

### 新增文件

| 文件 | 职责 |
|------|------|
| `src/api/modules/settings.ts` | settings API 调用 |

### 修改文件

| 文件 | 变更 |
|------|------|
| `src/types/mira.ts` | Library 增加 allowedRoles，新增 ServerSettings |
| `src/api/index.ts` | 导出 settingsApi |
| `src/views/mira/overview/index.vue` | Settings 按钮和对话框 |
| `src/views/mira/library/LibraryFormDialog.vue` | 角色勾选 |
| `src/views/mira/library/index.vue` | 默认值和编辑映射 |
| `src/i18n/locales/zh-CN.ts` | 中文翻译 |
| `src/i18n/locales/en.ts` | 英文翻译 |

## Client 变更

### 3 步登录

使用 `@/components/ui/stepper/` 组件实现水平 Stepper:

| 步骤 | 内容 | 关键逻辑 |
|------|------|---------|
| 1. 服务器 | 名称 + 地址 + 折叠 WS 地址 | `GET /api/health`，authRequired=false 跳到 Step 3 |
| 2. 认证 | 用户名 + 密码 + 注册入口 | `POST /api/auth/login` + `GET /api/auth/verify`，allowRegistration=false 隐藏注册 |
| 3. 素材库 | 按角色过滤的素材库列表 | 选择后连接，持久化 auth 状态，跳转首页 |

### 角色过滤逻辑

```typescript
libraries.filter(lib => {
  if (!lib.allowedRoles || lib.allowedRoles.length === 0) return true
  return lib.allowedRoles.includes(userRole)
})
```

### 密码存储

凭据明文存储在 serverListStore 的 `savedCredentials.encryptedPassword` 字段（字段名保留兼容）。配合 `persistAuthState()` 保存 token，重启后优先用 token 恢复，token 失效才走 autoLogin。

### 修改文件

| 文件 | 变更 |
|------|------|
| `src/renderer/views/LoginView.vue` | 完整重写为 3 步 Stepper |
| `src/renderer/stores/auth.ts` | 密码明文存储，删除 encrypt/decrypt |

## SDK 类型变更

`mira-server-sdk/src/types.ts`:

- `HealthResponse` 增加 `authRequired?: boolean`, `allowRegistration?: boolean`
- `Library` / `CreateLibraryRequest` / `UpdateLibraryRequest` 增加 `allowedRoles?: string[]`
