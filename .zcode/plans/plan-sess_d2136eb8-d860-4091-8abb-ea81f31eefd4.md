## 实现方案：DeploymentChecklist 真实版本检测 + 更新提示

### 背景
当前 `DeploymentChecklist.vue` 是纯前端动画模拟，不检测已安装版本、不查 npm、不执行任何命令。整个 Electron 主进程也没有 `child_process` 能力。需要新增真实检测。

### 关键发现（影响实现）
1. **`mira-app-server --version` 不可靠**：CLI 用 commander，版本号硬编码为 `1.0.17`/`1.0.0`（package.json 实际是 `2.0.1`）。所以检测已装版本必须走 `npm ls -g mira-app-server --json`（返回 package.json 真实版本），而不是 `--version`。
2. **CLI 启动方式**：实际是 `mira-app-server start` 子命令（commander），需修正 DeploymentChecklist/ManualDeployGuide 文案（当前写的是 `mira-app-server`）。
3. **Windows 下 npm 全局 bin 是 `.cmd` shim**：执行需考虑 `process.platform === 'win32'`，但 `npm ls -g` 与 `npm install -g` 跨平台一致，无需平台分支。
4. **npm registry**：`https://registry.npmjs.org/mira-app-server/latest` 返回 `{ version: "2.0.1", ... }`，可直接 fetch 最新版（已验证，包真实存在）。

### 架构
新增 1 个 IPC handler（主进程）+ preload namespace + 类型声明 + renderer 组合式函数。`exec` 只发生在主进程（通过 IPC），renderer 仅消费结果。

---

### 步骤 1：新建主进程 handler `src/main/ipc/ServerDeployHandlers.ts`
镜像 `SystemHandlers.ts` 结构（class + 无参构造 → `registerHandlers()` → `ipcMain.handle`）。

用 `child_process`（`execFile` 优于 `exec`，避免 shell 注入；直接调用 `npm`/`npm.cmd`）实现 3 个 channel：

| channel | 作用 | 实现 |
|---------|------|------|
| `server-deploy:getInstalledVersion` | 检测已装版本 | `npm ls -g mira-app-server --json --depth=0`，解析 JSON 取 `dependencies["mira-app-server"].version`；未安装返回 `{ installed: false }` |
| `server-deploy:getLatestVersion` | 查 npm 最新版 | 主进程用 `https`/`fetch`（Node 18+ 全局 fetch）请求 registry，解析 `version`；网络失败返回 `{ latest: null, error }` |
| `server-deploy:update` | 一键更新 | `npm install -g mira-app-server@latest`，用 `spawn` + 实时 stdout/stderr 推送进度事件 `server-deploy:update-progress`（经 `BrowserWindow.webContents.send`）；成功后重新检测版本返回 |

返回信封统一 `{ success: boolean; data?: T; message?: string }`（匹配 AppHandlers/FileSystemHandlers 既有约定）。

需注意：handler 需要 `BrowserWindow` 引用来推 progress 事件 → 暴露 `setMainWindow(window)` 方法（匹配 MenuHandlers/ShortcutHandlers 既有模式），由 `handlers.ts` 的 `setMainWindow()` 调用。

### 步骤 2：接入 `handlers.ts`
- import + 声明字段 `serverDeployHandlers`
- 构造函数 `this.serverDeployHandlers = new ServerDeployHandlers()`（构造即自注册）
- `setMainWindow()` 增加 `this.serverDeployHandlers.setMainWindow(window)`
- `removeAllHandlers()` 增加 3 个 `ipcMain.removeAllListeners('server-deploy:...')`

### 步骤 3：preload `src/preload/preload.ts`
新增 `serverDeploy` namespace（镜像 `app` namespace 的写法）：
```ts
serverDeploy: {
  getInstalledVersion: () => ipcRenderer.invoke('server-deploy:getInstalledVersion'),
  getLatestVersion: () => ipcRenderer.invoke('server-deploy:getLatestVersion'),
  update: () => ipcRenderer.invoke('server-deploy:update'),
  onUpdateProgress: (cb) => ipcRenderer.on('server-deploy:update-progress', (_e, ...a) => cb(...a)),
  removeUpdateProgressListener: () => ipcRenderer.removeAllListeners('server-deploy:update-progress'),
},
```

### 步骤 4：类型声明 `src/shared/types.ts`
`ElectronAPI` 接口增加 `serverDeploy` 子接口（返回类型与 handler 一致）。

### 步骤 5：renderer 组合式函数 `src/renderer/composables/useServerDeploy.ts`
封装检测逻辑，供 DeploymentChecklist 调用：
- `status`: `checking` | `not-installed` | `up-to-date` | `update-available` | `error`
- `installedVersion` / `latestVersion`
- `checkVersion()`: 并发调 `getInstalledVersion` + `getLatestVersion`，semver 比较（简单字符串/数字比较即可，避免引 semver 依赖；或用轻量 `compareVersions` 内联）
- `updateInProgress` / `updateLog`: 监听 progress 事件
- `runUpdate()`: 调 `update`，完成后自动 `checkVersion()` 刷新

非 Electron 环境直接短路（status 不可用，DeploymentChecklist 在非 Electron 下本就不展示）。

### 步骤 6：改造 `DeploymentChecklist.vue`
- 顶部新增**状态条**（在任务列表上方）：`onMounted` 调 `useServerDeploy().checkVersion()`，根据 status 展示：
  - `checking` → 「正在检测已安装版本…」+ spinner
  - `not-installed` → 「未安装 mira-app-server」(灰色)
  - `up-to-date` → 「✓ 已安装 vX.Y.Z（最新）」(绿色)
  - `update-available` → 「已装 vX.Y.Z，最新 vZ → [更新]」+ 点击 `runUpdate()`，更新中显示进度日志
  - `error` → 「检测失败：…」+ [重试]
- 保留现有模拟流水线（步骤文案），但**修正步骤 3 文案**为 `mira-app-server start`（commander 子命令）

### 步骤 7：修正 `ManualDeployGuide.vue` 文案
步骤 3「启动服务器」命令改为 `mira-app-server start`（对齐真实 CLI）；dashboard 部分不变。

### 步骤 8：验证
- `vue-tsc --noEmit` 无新增报错
- `vite build`（renderer + main + preload 三段）通过
- 手动验证：Electron 下打开部署 dialog → 顶部状态条应显示真实检测结果

### 涉及文件
- 新增：`src/main/ipc/ServerDeployHandlers.ts`、`src/renderer/composables/useServerDeploy.ts`
- 修改：`src/main/ipc/handlers.ts`、`src/preload/preload.ts`、`src/shared/types.ts`、`src/renderer/components/business/DeploymentChecklist.vue`、`src/renderer/components/business/ManualDeployGuide.vue`

### 不做的事
- 不引入 `semver` npm 依赖（内联轻量版本比较）
- 不改 Electron 的 `child_process` 安全策略（`execFile` 直接执行 `npm`，不拼 shell 字符串）
- 非环境不展示在线部署组件的逻辑保持不变（无需检测）