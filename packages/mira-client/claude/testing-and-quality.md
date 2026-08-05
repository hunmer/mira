# mira-client 测试与质量

## 测试现状

- **无独立单元测试 / E2E 测试**
- 主要回归门禁:`pnpm run type-check`(vue-tsc --noEmit)+ `pnpm run build:all`(三段构建通过)

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

- **shadcn-vue 迁移期**:无单测,依赖人工视觉回归 QA(progress.md 列为"待人工 QA")
- **dev 下弹出层动画不生效**:已知技术债,见仓库根 `handoff-dropdown-animation.md`;生产构建正常
- **2 处 radix-vue 直引**:`PopoverComponent.vue`、`MediaListComponent.vue`,待统一到 `@/components/ui/popover`
- **`tailwind.config.js` 死文件**:v3 遗留,易误导(误以为它是主题源)
- 原生依赖(electron、sqlite3 经 core)跨平台安装需 `dependency-switch-config-*`
