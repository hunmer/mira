# Mira 3D Format Preview

市场示例插件，使用 Vue 3 + TresJS + Three.js，注册 `glb` / `gltf` 自定义格式处理：

- 媒体网格缩略图显示可拖拽、自动旋转的线框立方体。
- 双击文件时打开独立插件窗口，用 `GLTFModel` 加载真实模型。
- 详情窗口提供 `OrbitControls`、环境光、方向光和网格辅助线。
- 网格缩略图使用轻量 canvas，避免为每个缩略图创建完整 WebGL 场景。

插件入口是普通 IIFE，遵循在线客户端插件的脚本注入约束；详情窗口源码位于 `src/`，构建产物位于 `dist/`。

## 开发

```powershell
pnpm install
pnpm exec vue-tsc --noEmit -p "tsconfig.json"
pnpm run dev
pnpm run build
```
