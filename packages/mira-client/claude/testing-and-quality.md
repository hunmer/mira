# mira-client 测试与质量

## 测试现状(v3.0.2)

1. **远程真实页面 UI 测试**:`src/renderer/procm-ui-tests/`(约 30 个用例:建文件夹/建标签/Tab 操作/主题切换/侧边栏布局/URL 导入校验等)。渲染侧注册 `window.__procmUiTests`(**仅开发构建**加载,生产不暴露),由 `scripts/test-ui.mjs` 经 procm-mcp SDK(`@hunmer/procm-mcp-sdk`,v3.0.2 起为 npm ^0.1.1,默认 `ws://127.0.0.1:7331/room`)远程执行。**注意:v3.0.2 起 `test:ui:remote` 脚本已从 package.json 删除**,脚本与用例仍在,可直跑:

   ```bash
   node scripts/test-ui.mjs                      # 列出全部可用测试名
   node scripts/test-ui.mjs createFolder         # 运行单个测试
   ```

2. **node 纯函数测试**(脚本 `test:split-tabs` 已删,文件保留,可直跑):
   ```bash
   node --experimental-strip-types --test src/renderer/components/tabs/MediaTabListView/mediaTabRuntime.test.ts
   node --experimental-strip-types --test src/renderer/views/HomeView/splitPaneRestore.test.ts
   node --experimental-strip-types --test src/renderer/utils/localFilePath.test.ts   # v3.0.2 新增(renameLocalFilePath)
   ```

3. **主进程单测**:`src/main/services/DownloadService.test.ts`(目前唯一一个)。

主要回归门禁:`pnpm run type-check`(vue-tsc --noEmit)+ `pnpm run lint`。

## 类型检查

```bash
pnpm run type-check   # vue-tsc --noEmit -p tsconfig.json --composite false
```

## Lint

```bash
pnpm run lint   # eslint .(ESLint 9 flat config,eslint.config.mjs)
pnpm run lint:fix
```

ESLint 9 flat config + @typescript-eslint。

## 依赖/产物分析

| 命令 | 工具 | 产物 |
|------|------|------|
| `pnpm run docs` | typedoc | API 文档 |
| `pnpm run analyze:deps` | dependency-cruiser | `docs/dependencies.html` |
| `pnpm run analyze:bundle` | vite-bundle-analyzer | bundle 分析 |
| `pnpm run clean` | rimraf | 清理 dist*/build/docs |

## 质量风险

- ui 组件扩到 60 个,新增复合/业务化组件(file-card、folder、command、chart、pagination、scrollbar 等)缺自动化视觉回归
- **dev 下弹出层动画不生效**:已知技术债,见仓库根 `handoff-dropdown-animation.md`;生产构建正常
- **2 处 radix-vue 直引**:`PopoverComponent.vue`、`MediaListComponent.vue`,待统一到 `@/components/ui/popover`
- **`tailwind.config.js` 死文件**:v3 遗留,易误导(误以为它是主题源)
- **`vite.renderer.config.ts` 残留 scss 注入**:指向已删除的 `assets/scss/*`(v2.x 新增技术债)
- 近期提交信息几乎全为 "fix"(132 个文件/v3.0.2 区间),git 历史对变更溯源帮助有限,须 diff 取证
- 原生依赖(electron、sqlite3 经 core)跨平台安装需 `dependency-switch-config-*`
