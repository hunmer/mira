# 为 mira-app-core SDK 添加集成测试

## 目标
在 `packages/mira-app-core/src/shared/sdk` 下添加多个 vitest 测试脚本，连接运行中的 `http://localhost:8081`，用 `admin/admin123` 真实验证 SDK 各模块。**所有测试必须绿灯。**

## 现状结论（已探明）
- **SDK 结构**：`MiraClient` + 10 个模块（Auth/User/Library/System/Plugin/File/Database/Device/Tag/Folder），HttpClient 带 token 拦截 + `extractData`（自动剥外层 `data`）。
- **测试环境**：server 在 8081 运行中；admin/admin123 可登录；有 1 个 active 库 `1779810479725`（123 文件 / 3 文件夹 / 1 标签）。
- **测试框架**：项目已有 vitest 先例（mira-browser-extension）；mira-app-core 当前未装任何测试框架。
- **发现 1 个源码 bug**：`DatabaseModule` 的 `getTables/getTableData/getTableSchema` 不带 `libraryId`，但后端强制要求该参数（CLI/MCP 都已绕过它）。需修复。

## 实施步骤

### 第 1 步：安装 vitest 依赖
在 `packages/mira-app-core` 安装：`pnpm add -D vitest`（workspace 会复用根 store）。在 `package.json` 的 `scripts` 增加 `"test": "vitest run"`、`"test:watch": "vitest"`。

### 第 2 步：修复 DatabaseModule（最小改动）
给 3 个底层方法补 `libraryId` 参数，与 CLI 现有用法一致：
- `getTables(libraryId: string)` → `/api/database/tables?libraryId=...`
- `getTableData(libraryId, tableName)` → 拼 libraryId
- `getTableSchema(libraryId, tableName)` → 拼 libraryId
- 内部派生方法（`tableExists/getTableRowCount/getTableDetails/...`）随之加 `libraryId` 形参并透传。
> 注：这是 **API 兼容性破坏**（旧无参调用会报错），但当前无任何代码调用 SDK 的这些方法（CLI/MCP 都绕过了它），且现状方法本就无法工作，属必要修复。

### 第 3 步：新增 vitest 配置
新建 `packages/mira-app-core/vitest.config.ts`：
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'], testTimeout: 15000 },
});
```

### 第 4 步：编写测试文件（7 个，放 `src/shared/sdk/` 下）
所有测试通过**环境变量** `MIRA_BASE_URL`（默认 http://localhost:8081）和固定凭据 `admin/admin123` 创建 client；每个文件开头 `beforeAll` 登录。统一辅助逻辑放 `test-helpers.ts`。

| 文件 | 覆盖模块 | 断言要点（基于已探明真实响应） |
|------|---------|------------------------------|
| `AuthModule.test.ts` | Auth + MiraClient 工具 | login 返回 accessToken 且 token 自动写入；verify 的 `data.user.username==='admin'`；getCodes 返回字符串数组；错误密码抛错；retry/safe/batch 工具方法 |
| `UserModule.test.ts` | User | getInfo 的 username/role/realName/roles[]；updateProfile 改 realName 后再改回（回滚） |
| `SystemModule.test.ts` | System | getHealth status/version；getSimpleHealth（精简版 4 字段）；isServerAvailable===true；waitForServer；isConnected |
| `LibraryModule.test.ts` | Library | getAll 返回数组含 id 字符串 `1779810479725`；getById；getActive（status active）；getByStatus |
| `PluginModule.test.ts` | Plugin | getAll 返回 ≥1；status ∈ active/inactive；getByLibrary；getActive/getInactive 互斥；search 命中 |
| `DatabaseModule.test.ts` | Database（修复后） | getTables(libraryId) 返回含 files/folders/tags；tableExists；getTableRowCount；getNonEmptyTables |
| `TagAndFolder.test.ts` | Tag + Folder | **只读** getAll/query（断言根节点 parent_id 为 null）；**CRUD 闭环** create（`__sdk_test__` 前缀唯一）→ update → query 校验 → delete，afterEach 兜底清理 |

**FileModule 不写真实数据**（避免污染 123 个真实文件），仅做只读：`getFiles` 断言返回 `{result, limit, offset, total}` 结构、total≥1；`getFile` 取一个真实 id。

### 第 5 步：运行验证
```
cd packages/mira-app-core && pnpm test
```
修复任何红灯，直到全部绿灯。

## 关键技术处理（避坑）
1. **HttpClient.extractData 自动剥 `data`**：测试断言的是剥壳后的内层结构（如 login 直接拿 `{accessToken}`，getFiles 直接拿 `{result,limit,offset,total}`）。
2. **根节点 parent_id 为 null 非 0**：query 测根节点用 `parent_id:null`。
3. **files.tags 是 JSON 字符串**：需 `JSON.parse`。
4. **CRUD 测试用唯一标题 + 清理**：`__sdk_test_<timestamp>_<random>`，afterEach 按前缀查并删，杜绝垃圾。
5. **server 不可用时友好失败**：beforeAll 检测 `isServerAvailable`，否则 `skip` 并提示，而非挂整批。

## 不做的事
- 不写 FileModule 上传/删除（避免副作用）。
- 不改后端、不动现有 CLI/MCP（它们已正确）。
- 不引入 jest/mocha（统一用 vitest，与既有先例一致）。