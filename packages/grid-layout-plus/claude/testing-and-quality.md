# grid-layout-plus — 测试与质量

- tests 共 27 文件：单元测试为主，另含 `e2e/`（3 个）、`types/`（3 个）、`phase-*`（5 个）
- 运行：`pnpm --filter grid-layout-plus test`（vitest）
- **风险**：e2e 依赖上游 `dev-server/`（未带入本仓库），直接跑可能失败；`scripts/test-setup.ts` 仍在
- lint/benchmark/changeset 等上游质量工具在本仓库不可用（见 conventions.md）
- vendored 代码，质量门槛以"不破坏 client 仪表盘"为准
