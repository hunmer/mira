# Mira 客户端插件市场源仓库

本目录是 **Mira 客户端插件市场** 的源仓库。它通过**静态 HTTP 服务**对外提供内容，客户端运行时从配置的市场源地址拉取 `plugins.json` 索引，并按需把插件目录下载到用户本地的插件目录后加载。

> ⚠️ 这是 **客户端插件**（运行在 Mira 桌面应用渲染进程），不要和仓库根目录 `plugins/` 下的 **服务端插件**（运行在 mira-app-server Node 进程）混淆。

## 目录结构

```
online_client_plugins/
├── README.md                  # 本文件
├── .gitignore
├── plugins.json               # 索引（脚本自动生成，请勿手改）
└── plugins/
    └── <pluginId>/            # 每个插件一个子目录
        ├── plugin.json        # 插件元数据（复用客户端插件规范）
        ├── index.js           # 插件入口
        └── README.md
```

## 插件规范

每个插件目录必须包含 `plugin.json`（必填字段：`pluginName`、`pluginId`、`version`）和入口文件（默认 `index.js`）。
完整字段与可用 API 请参考 `packages/mira-client/plugins/README.md`。

`pluginId` 必须是全局唯一的 UUID。新增插件后请务必运行索引脚本（见下）重新生成 `plugins.json`。

## 索引脚本（自动更新）

本仓库根目录下的 `plugins.json` 由脚本自动生成，**不要手动编辑**。

在仓库根目录运行：

```bash
# 单次生成 / 更新索引
pnpm build:client-plugins-index
# 或： node scripts/build-client-plugins-index.mjs

# 开发模式：监听变化自动重建索引，同时在 8080 端口起静态服务（带 CORS）
pnpm dev:client-plugins
```

脚本会：

1. 扫描 `online_client_plugins/plugins/*/` 下所有含 `plugin.json` 的目录；
2. 校验必填字段，并检测 `pluginId` 重复；
3. 为每个插件计算目录大小与 sha256 校验和；
4. 汇总出 `plugins.json`（原子写入，避免半写状态）。

校验失败时脚本以非零退出码退出，便于接入 CI。

### 构建期文件过滤（不进安装包）

索引脚本默认会**排除构建期文件**，避免把源码、构建配置、锁文件等打进市场安装包。默认排除（相对插件根）：

- `src/`（源码；构建产物应在 `dist/`）
- `vite.config.*`、`tsconfig*.json`（构建 / 类型配置）
- `index.html`、`*.html`（插件根的 HTML 入口；运行时入口是 `dist/index.html`）
- `pnpm-lock.yaml`、`package-lock.json`、`yarn.lock`（锁文件）
- `.gitignore`、`.pluginignore`、`.eslintrc*`、`.prettierrc*`

硬排除（任何情况都不进）：`node_modules`、`.git`、`.DS_Store`、`Thumbs.db`。

> 预构建产物（`dist/`、`build/`）**不在排除列表**——带 SPA 窗口的插件必须把构建好的 `dist/` 一起分发，否则客户端安装后无法加载入口。

**自定义排除**：在插件根目录放一个 `.pluginignore`（gitignore 语法，支持 `!` 取反），按顺序追加在默认规则之后、最后命中的规则生效。例如想保留 `src/`：

```
# .pluginignore
!src/
```

纯 JS 插件（只有 `index.js`）默认不受影响。

> 💡 **本地调试一条命令搞定**：`pnpm dev:client-plugins` 现在同时**监听重建索引**并**在 `http://localhost:8080` 起静态服务**（自带 `Access-Control-Allow-Origin: *`，客户端可直接跨域拉取）。端口可用环境变量 `PORT=9000` 或 CLI `--port 9000` 覆盖。客户端「插件市场源」填 `http://localhost:8080` 即可。
>
> 如只想重建索引不想起服务，用 `pnpm build:client-plugins-index`（单次）或手动 `node scripts/build-client-plugins-index.mjs --watch`（仅监听）；只想起服务，用 `node scripts/build-client-plugins-index.mjs --serve`。

## 如何对外提供静态服务

`plugins.json` 必须可从市场源根目录直接访问，且服务需允许客户端跨域（CORS）。任选一种方式：

### 方式一：本地调试（pnpm dev:client-plugins，推荐）

```bash
# 一条命令：监听重建索引 + 在 8080 起静态服务（带 CORS）
pnpm dev:client-plugins
# 客户端在「设置 → 插件」里把市场源填为 http://localhost:8080
# 端口冲突时换端口：PORT=9000 pnpm dev:client-plugins
```

> 也可以用 `npx serve online_client_plugins -p 8080` 单独起静态服务（需先 `pnpm build:client-plugins-index` 生成索引）。

### 方式二：nginx

```nginx
server {
  listen 80;
  server_name your.market.host;
  root /path/to/online_client_plugins;

  # 允许客户端跨域拉取
  add_header Access-Control-Allow-Origin *;

  location / {
    try_files $uri =404;
  }
}
```

### 方式三：GitHub Pages

把本目录推到仓库的 `gh-pages` 分支或 `docs/` 目录，开启 Pages 后，把 Pages 地址填入客户端设置。

## 客户端使用

1. 打开 Mira 桌面应用 → 设置 → 插件 → 「插件市场源」填写上面的 HTTP 地址；
2. 打开「插件管理」→「插件市场」标签，即可浏览、安装、更新插件。

安装本质上是把远程插件目录下载到用户本地的插件目录（`pluginsDirectory/<pluginId>/`），随后走与本地插件完全一致的加载流程。
