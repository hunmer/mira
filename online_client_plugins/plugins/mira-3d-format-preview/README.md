# Mira 3D Format Preview

市场示例插件，使用 Vue 3 + TresJS + Three.js + shadcn-vue，注册 `glb` / `gltf` 自定义格式处理。

- 媒体网格缩略图显示可拖拽、自动旋转的线框立方体（轻量 canvas，无 WebGL）。
- 双击文件打开独立预览窗口，提供完整的三栏式 3D 预览器。

## 预览器功能（v1.2）

- **左栏 · 场景树**：Tabs 切换 网格 / 材质 / 动画。点击选中并在画布中高亮。
- **中间 · 3D 画布**：OrbitControls（拖拽旋转、滚轮缩放、右键平移）、双光源、网格地面、自动适配相机。
- **右栏 · 属性面板**：
  - 对象：可见性、位置、旋转、缩放（实时编辑）。
  - 材质：颜色、金属度、粗糙度（滑块）。
- **顶栏工具**：线框模式、网格地面、自动旋转、重置视角、导出截图（PNG）、取消选中。
- **统计**：网格 / 材质 / 顶点 / 三角面 数量。
- **动画**：若模型含动画片段，左栏出现 Animations 标签，支持播放 / 暂停 / 单选切换。

## 技术栈

- 框架：Vue 3 + Vite + TypeScript
- 3D：`@tresjs/core` + `@tresjs/cientos` + `three`
- UI：shadcn-vue 风格（Tailwind v4 + reka-ui + class-variance-authority + lucide-vue-next），组件 vendored 在 `src/components/ui/`，无运行期 CDN 依赖。

## 架构

- `index.js`：插件入口（IIFE），运行在主应用渲染进程，注册文件格式、打开预览窗口。
- `dist/`：独立 Electron 插件窗口的构建产物（`file://` 加载，自包含）。
- `src/`：预览器源码。
  - `App.vue`：三栏布局 + TresCanvas 编排。
  - `ModelScene.vue`：GLTF 加载（修正 cientos v5 `useGLTF` 无 `error` 字段的问题）。
  - `ModelRig.vue`：在画布内挂载 `useAnimations`。
  - `composables/useViewerStore.ts`：集中状态（选中 / 统计 / 工具）+ 相机适配 / 截图 / 线框操作。
  - `composables/useHighlight.ts`：选中高亮（备份材质 → 线框替换 → 恢复）。
  - `components/viewer/`：工具栏、场景树、属性面板。
  - `components/ui/`：vendored shadcn-vue 组件。

## 开发

```powershell
pnpm install
pnpm exec vue-tsc --noEmit -p "tsconfig.json"
pnpm run dev
pnpm run build
```

## 发布

构建后若需上架市场，需重新生成 `online_client_plugins/plugins.json`（含 `dist/` 新产物的 sha256 校验）。本地开发不校验 checksum，不阻塞预览。
