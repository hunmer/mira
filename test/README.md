# 测试脚本

本目录存放功能验证脚本，用于回归验证关键改动的端到端行为。

## 脚本

### `verify-trash.ts` — 回收站（.trash）功能验证

验证「软删除文件移入 `<素材库>/.trash/`」「清空回收站才物理删除」「删除文件夹(勾选删除文件)整目录进 .trash」这套改动。

**前置条件：**

1. `mira-app-core` 已 build（`pnpm run build:core`）
2. `mira-app-server` 已启动（`pnpm start:server` 或 procm-mcp），默认 HTTP 端口 8081
3. 管理员账号可用（默认 `admin / admin`，可用环境变量覆盖）

**运行：**

```bash
# Node 22+ 原生 TS 类型擦除，无需安装 tsx
node --experimental-strip-types test/verify-trash.ts

# 自定义参数（均可选）
MIRA_API=http://127.0.0.1:8081 \
MIRA_USER=admin MIRA_PASS=admin \
MIRA_LIBRARY_ID=1785462412295 \
node --experimental-strip-types test/verify-trash.ts
```

**验证用例：**

| 用例 | 覆盖点 |
|------|--------|
| 1 软删除 → .trash → 还原 | 软删后物理文件进 `.trash/`；回收站视图(recycled=1)可见且 `file_path` 指向 `.trash`；HTTP 仍可访问；根目录(recycled=0)不再显示 |
| 2 清空回收站 | 物理删除，`deletedCount` 正确，回收站视图清空 |
| 3 删除文件夹(deleteFiles=true) | 整目录进 `.trash/`，文件夹行删除，子树文件 `recycled=1` 且 `path` 位于 `.trash` 下 |

> **关于还原**：HTTP 路由没有 `recover` 端点（还原走 WebSocket 处理器），脚本里不直接测还原的 HTTP 链路；还原逻辑已在 `mira-app-core` 层验证（`recoverFile` 把文件从 `.trash/` 移回原位置并恢复 `path`/`recycled=0`）。

**退出码：** `0` = 全部通过，`1` = 有失败用例。
