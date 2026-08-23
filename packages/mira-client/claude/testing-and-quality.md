# mira-client 测试与质量

## 测试现状(v2.x 起有两套)

1. **远程真实页面 UI 测试**:`src/renderer/procm-ui-tests/`(约 30 个用例:建文件夹/建标签/Tab 操作/主题切换/侧边栏布局/URL 导入校验等)。渲染侧注册 `window.__procmUiTests`(**仅开发构建**加载,生产不暴露),由 `scripts/test-ui.mjs` 经 procm-mcp SDK(`@hunmer/procm-mcp-sdk`,默认 `ws://127.0.0.1:7331/room`)远程执行:

   ```bash
   pnpm run test:ui:remote                      # 列出全部可用测试名
   pnpm run test:ui:remote createFolder         # 运行单个测试
   ```

2. **主进程单测**:`src/main/services/DownloadService.test.ts`(目前唯一一个)。

主要回归门禁仍是:`pnpm run type-check`(vue-tsc --noEmit)+ `pnpm run build:all`(三段构建通过)。

## 类型检查

```bash
pnpm run type-check   # vue-tsc --noEmit -p tsconfig.json --composite false
```

## Lint

```bash
pnpm run lint   # eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --fix
```

ESLint 9 + @typescript-eslint。

## 依赖/产物分析

| 命令 | 工具 | 产物 |
|------|------|------|
| `pnpm run docs` | typedoc | API 文档 |
| `pnpm run analyze:deps` | dependency-cruiser | `docs/dependencies.html` |
| `pnpm run analyze:bundle` | vite-bundle-analyzer | bundle 分析 |
| `pnpm run clean` | rimraf | 清理 dist*/build/docs |

## 质量风险

- shadcn-vue 迁移已合回 main,ui 组件扩到 53 个,新增复合/业务化组件(file-card、folder、command、chart 等)缺自动化视觉回归
- **dev 下弹出层动画不生效**:已知技术债,见仓库根 `handoff-dropdown-animation.md`;生产构建正常
- **2 处 radix-vue 直引**:`PopoverComponent.vue`、`MediaListComponent.vue`,待统一到 `@/components/ui/popover`
- **`tailwind.config.js` 死文件**:v3 遗留,易误导(误以为它是主题源)
- **`vite.renderer.config.ts` 残留 scss 注入**:指向已删除的 `assets/scss/*`(v2.x 新增技术债)
- 近期提交信息几乎全为 "fix"(108 个提交/9 天),git 历史对变更溯源帮助有限
- 原生依赖(electron、sqlite3 经 core)跨平台安装需 `dependency-switch-config-*`
