# dependencies-and-config

## 运行时依赖

来自 `package.json`：

| 依赖 | 版本 | 说明 |
|------|------|------|
| `mira-app-core` | `workspace:*` | monorepo 内核心库，提供存储层 |

两个脚本均直接从 `mira-app-core/storage/sqlite` 导入 `LibraryServerDataSQLite`：
- `scripts/convertLibraryData.ts`
- `scripts/pathFilesToLibrary.ts`

脚本中其他 Node 内置依赖：`path`、`fs`，以及 `import { Database } from 'sqlite3'`（出现在 `convertLibraryData.ts`，类型来源，未发现加入 `dependencies`，推断由 `mira-app-core` 间接提供或为类型引用）。

> `sqlite3` 未在 `package.json` 的 `dependencies` 中显式声明（未发现），实际可用性依赖 workspace 顶层或 `mira-app-core`。

## devDependencies / 构建

- `package.json` 中**未声明** `devDependencies`（未发现 `typescript` / `ts-node` / `@types/node` 等条目），构建依赖 workspace 顶层安装。
- 构建工具：`tsc`（TypeScript 编译），入口为 `pnpm run build`。

## package.json 关键字段

| 字段 | 值 |
|------|-----|
| `name` | `mira-scripts-core` |
| `version` | `1.0.5` |
| `main` | `index.js`（指向 `tsc` 产物，源入口为 `index.ts`） |
| `license` | `ISC` |
| `author` | `hunmer` |
| `description` | （空字符串） |
| `publishConfig.access` | `public` |
| `scripts` | 见 `conventions.md` |

## tsconfig.json

- `compilerOptions`：
  - `target: ES2020`、`lib: ["ES2020"]`
  - `module: commonjs`、`moduleResolution: node`
  - `strict: true`
  - `declaration: true`（产物含 `.d.ts`）
  - `outDir: ./dist`
  - `esModuleInterop: true`、`allowSyntheticDefaultImports: true`
  - `skipLibCheck: true`、`forceConsistentCasingInFileNames: true`、`resolveJsonModule: true`
- `include`：`["*.ts", "scripts/pathFilesToLibrary.ts", "scripts/convertLibraryData.ts"]`
- `exclude`：`["node_modules", "dist"]`

## 其他配置

- `start.bat` / `start.ps1`：Windows 启动脚本，未扫描内容。
- 未发现：lint / format / test 相关配置文件与脚本。
