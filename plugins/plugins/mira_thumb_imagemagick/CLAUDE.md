[根目录](../../../CLAUDE.md) > [plugins](../../CLAUDE.md) > [plugins](..) > **mira_thumb_imagemagick**

# mira_thumb_imagemagick

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-05-26 | 初始化 | 首次生成模块文档 |

## 模块职责

ImageMagick 缩略图生成插件。通过实现 `ThumbnailGenerator` 接口，扩展服务端内置 `ThumbnailService` 的能力，为专业设计格式（PSD、AI、EPS 等）生成缩略图。

核心功能：
- 实现 `ThumbnailGenerator` 接口，注册到服务端 `ThumbnailService`
- 支持 PSD, AI, EPS, SVG, TIFF, TIF, DNG, RAW, HEIC, HEIF 格式（可通过配置启用/禁用）
- 生成参数：200x200 像素，保持宽高比
- ImageMagick 路径自动查找（配置文件 > 环境变量 > PATH）
- 配置文件持久化

## 入口与启动

- **入口文件**: `index.ts` -- 导出 `init(inst): ThumbImageMagickPlugin` 工厂函数
- 由 `ServerPluginManager` 在素材库加载时自动实例化
- 初始化时检查 ImageMagick 是否可用，注册 ThumbnailGenerator

## 对外接口

### ThumbnailGenerator 接口

```typescript
{
  name: 'imagemagick',
  supportedExtensions: string[], // 可配置，默认 ['psd']
  generate(srcPath: string, destPath: string): Promise<void>
}
```

### 配置文件 (data/config.json)

```json
{
  "enableExts": ["psd"],
  "magickPath": ""
}
```

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enableExts` | string[] | `["psd"]` | 启用的文件扩展名列表 |
| `magickPath` | string | `""` | ImageMagick 可执行文件路径（留空自动查找） |

### ImageMagick 查找优先级

1. 配置文件中的 `magickPath`
2. 环境变量 `MAGICK_PATH`
3. PATH 查找 `magick` 命令
4. PATH 查找 `convert` 命令（排除 Windows 系统 convert.exe）

## 关键依赖与配置

- `which` (^7.0.0): 查找 ImageMagick 可执行文件
- `mira-app-server`: 提供 `ThumbnailService` 和 `ThumbnailGenerator` 接口
- 外部依赖: ImageMagick (需系统安装)

## 测试与质量

当前无独立测试。

## 常见问题 (FAQ)

**Q: 插件初始化后没有注册任何生成器？**
A: 检查：1) ImageMagick 是否已安装；2) `data/config.json` 中 `enableExts` 是否为空或包含不支持的格式；3) 服务端日志中是否有 "not found" 警告。

**Q: Windows 上找到的是系统 convert.exe 而非 ImageMagick？**
A: 设置 `magickPath` 配置或 `MAGICK_PATH` 环境变量指定 ImageMagick 路径。

## 相关文件清单

| 文件 | 行数 | 说明 |
|------|------|------|
| `index.ts` | 117 | 插件主实现 |
| `config.json` | -- | 默认配置模板 |
| `data/config.json` | -- | 运行时配置（自动生成） |
| `package.json` | -- | 包配置 (v1.0.0) |
| `tsconfig.json` | -- | TypeScript 配置 |
