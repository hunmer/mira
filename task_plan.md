# 本地文件夹浏览功能

## 目标
在 mira-client 中增加本地磁盘/文件夹浏览 Tab，支持选择、文件操作、目标目录选择与 Electron 拖拽导出。

## 阶段
- [x] 1. 调查侧栏模块、Tab 注册、文件列表、Electron 文件 API
- [x] 2. 设计最小数据契约与组件落点
- [x] 3. 实现本地文件浏览 Tab、选择及菜单/批量操作
- [x] 4. 实现路径选择对话框与拖拽移动/桌面复制
- [x] 5. 类型检查、测试并修正
- [x] 6. 按项目要求重启持久化服务并交付
- [x] 7. 设计分栏与画廊的数据状态
- [x] 8. 实现分栏与画廊视图
- [x] 9. 回归验证并重启客户端
- [ ] 10. 调查目录选择、侧栏持久化与路径规范化能力
- [ ] 11. 实现自定义文件夹分组、增删及路径编辑跳转
- [ ] 12. 构建验证并重启客户端

## 约束
- 优先复用现有组件与 IPC，不修改 mira-app-core，除非现状证明必要。
- 不覆盖工作区已有改动。
- 默认不使用真实浏览器测试。

## 错误记录
| 错误 | 尝试 | 处理 |
|---|---:|---|
| 假设 `src/main/handlers/FileSystemHandler.ts` 存在，但路径不存在 | 1 | 使用 `rg --files` 按文件系统处理器名称重新定位 |
| PowerShell 中 `rg` 的引号转义导致正则不完整 | 1 | 改用简单字面量 `rg "vue-sonner"` |
| 更新计划时发现阶段 3 条目重复，补丁上下文未命中 | 1 | 读取计划后合并重复条目 |
| 全量 type-check 失败：1 个新增未使用函数 + 27 个既有错误 | 1 | 删除新增的 `joinPath`；既有错误不在本次范围 |
| `git diff --check` 发现 FolderTreeComponent 空行尾随空格 | 1 | 清理该行后重新验证 |
| 定向 ESLint 无法启动：仓库使用 ESLint 9 但缺少 `eslint.config.*` | 1 | 以成功的 Vite 生产构建、vue-tsc 新增诊断对比和 diff-check 验证 |

## 初步决策
- 本地任意路径操作不复用面向服务端素材库的 `FileSystemModule`。
- 通过动态 Tab 类型挂载独立本地文件浏览组件。
- IPC 新增 `listRoots/listDirectory/openPath/copyEntries/moveEntries/removeEntries`。
- 本地目录选择对话框复用 `FolderTreeComponent`，增加只读模式隔离素材库操作。
- 导入操作仅导入文件；目录可导航并作为复制/移动/拖放目标。
