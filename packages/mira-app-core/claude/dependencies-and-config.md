# 依赖与配置

## 运行时依赖（dependencies）

| 依赖 | 版本 | 用途 |
|------|------|------|
| axios | ^1.11.0 | HTTP 请求（SDK 的 HttpClient） |
| queue | ^7.0.0 | 队列管理 |
| sqlite3 | ^5.1.7 | SQLite 驱动（存储层 LibraryServerDataSQLite） |
| ws | ^8.18.3 | WebSocket 客户端（SDK 的 WebSocketClient） |

## 开发依赖（devDependencies）

| 依赖 | 版本 | 用途 |
|------|------|------|
| @types/node | ^20.10.0 | Node 类型 |
| ts-node | ^10.9.2 | dev / start:ts 直接跑 TS |
| typescript | ^5.3.3 | 编译 |
| vite | ^6.2.0 | 打包 SDK ESM bundle |

## 配置文件

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### vite.sdk.config.ts（SDK 打包）

- entry: `src/shared/sdk/index.ts`
- library name: `MiraSDK`，fileName: `mira-sdk.esm`，format: `es`
- 输出: `dist/shared/sdk/mira-sdk.esm.mjs`
- target: es2020，minify: false，sourcemap: true
- `inlineDynamicImports: true`，`emptyOutDir: false`
- define: `process.env.NODE_ENV = "production"`

## 包元信息

- name: mira-app-core
- version: 2.0.1
- main: dist/index.js
- types: dist/index.d.ts
- author: hunmer，license: ISC
- publishConfig.access: public
- typesVersions 为 `storage/sqlite` 与 `shared/sdk` 单独映射 .d.ts 路径。

## 未发现

- 环境变量配置文件（.env 等）未扫描到。
- CI / lint / prettier 配置未在包内发现（可能在 monorepo 根）。
