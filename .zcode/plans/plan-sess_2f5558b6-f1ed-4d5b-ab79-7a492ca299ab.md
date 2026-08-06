替换项目中的 Mira 品牌图标为新图标包（`C:\Users\Administrator\Downloads\icons`）。只改源文件，不动 `dist/`、`build/win-unpacked/` 等构建产物（会在下次构建时重新生成）。`ext_icons/`（PDF/DOC 等通用文件类型图标）保持不变，它们不是 Mira 品牌。

## 源 → 目标 映射

用新图标包里的源文件，按需用 ImageMagick（`magick`）缩放/转换：

| 新图标源 | 目标文件 | 处理方式 |
|---|---|---|
| `webapp/favicon.ico` | `packages/mira-client/assets/icon.ico` | 直接覆盖（app 主图标，win/nsis 均引用此文件） |
| `webapp/favicon-16x16.png` | `packages/mira-client/assets/tray-icon.png` | 缩放（Linux 托盘用） |
| `webapp/favicon-16x16.png` | `packages/mira-client/assets/tray-icon.ico` | 转成 ico（Windows 托盘用，TrayService win32 分支） |
| `webapp/android-chrome-192x192.png` | `packages/mira-browser-extension/icons/icon128.png` | 缩放到 128×128 |
| `webapp/android-chrome-192x192.png` | `packages/mira-browser-extension/icons/icon48.png` | 缩放到 48×48 |
| `webapp/favicon-32x32.png` | `packages/mira-browser-extension/icons/icon16.png` | 缩放到 16×16 |
| `webapp/android-chrome-192x192.png` | `packages/mira-dashboard-next/public/logo.png` | 缩放到约 192×192（仪表盘侧栏 logo） |
| `webapp/favicon-32x32.png` | `packages/mira-dashboard-next/public/favicon.png` | 缩放到 32×32（仪表盘 favicon） |

## mira-doc（用户选：替换为 PNG 并改引用）
- 用 `webapp/android-chrome-512x512.png` 生成 `packages/mira-doc/public/logo.png`
- 删除旧的 `packages/mira-doc/public/logo.svg`
- 首页 frontmatter（`packages/mira-doc/src/index.md` 的 hero image）`/logo.svg` → `/logo.png`

## 不动的部分（按用户决定）
- `packages/mira-client/assets/tray-iconTemplate.png` — macOS 托盘模板图（需专用黑白透明素材，新包没有），保留原图
- `packages/mira-client/build/icons/`（mac `.icns` / linux 图标）— 项目目前只在 Windows 构建，目录为空，保持不动
- 所有 `ext_icons/`、`dist/`、`dist-renderer/`、`build/win-unpacked/` — 通用图标或构建产物

## 验证
完成后 `stat` 确认各目标文件已更新（大小/时间戳变化），并确认 `index.md` 引用已改为 `/logo.png`。`magick` 命令带 `-background none` 保持透明背景。