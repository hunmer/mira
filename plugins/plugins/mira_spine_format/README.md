# Mira Spine Format

服务端插件：为 Spine 3.8 `.skel` 文件注册格式识别与 idle 动作首帧 PNG 缩略图生成。

- 格式扩展：`.skel`（atlas/png 为配套资源，不单独注册）。
- 缩略图：调用 [`spine-exporter`](https://github.com/Nattsu39/spine-exporter) CLI 渲染 **idle** 动作第一帧；找不到 idle 时回退默认/首个动画。
- 输入要求：`.skel` + 同名 `.atlas` + 同名 `.png` 位于同一目录。

## 配置（data/config.json）

```json
{
  "animation": "idle",
  "fallbackToDefault": true,
  "timeoutMs": 120000,
  "cliCommand": null,
  "exporterPath": null
}
```

- `animation`：优先渲染的动画名。
- `fallbackToDefault`：指定动画失败时是否回退渲染默认动画。
- `timeoutMs`：单次渲染超时。
- `cliCommand`：自定义 CLI 入口 JS（覆盖自动探测）。
- `exporterPath`：自定义 spine-exporter 包路径（用于 `require.resolve`）。

## 构建

```powershell
pnpm install --ignore-workspace
pnpm run build
```
