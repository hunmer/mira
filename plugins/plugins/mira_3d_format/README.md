# mira_3d_format

Mira 服务端 GLB/GLTF 自定义格式插件。

## 能力

- 通过 `ServerPluginManager.registerFileFormat` 注册 `glb` / `gltf`。
- 通过 `@gltf-transform/core` 解析文件路径，返回模型大小、场景、节点、网格、材质、纹理、动画数量和扩展列表。
- 仅对 GLB 自动生成缩略图，调用 `render-glb` 的无头 WebGL 渲染器输出 PNG。
- 插件卸载时自动注销格式和缩略图生成器。
- `gltf` 只走解析处理；`render-glb` 当前只接受 GLB，因此缩略图生成限定为 `glb`。

## 安装与构建

```powershell
pnpm install
pnpm run build
```

Linux 无显示环境需要安装 Mesa/Xvfb，具体运行环境要求见 `render-glb` 文档。可通过插件数据目录的 `data/config.json` 调整 `width`、`height`、`timeoutMs` 和 `renderCommand`。
