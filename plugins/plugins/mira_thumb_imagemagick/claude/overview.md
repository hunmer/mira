# mira_thumb_imagemagick 总览

## 模块职责

ImageMagick 缩略图生成插件。通过实现 `ThumbnailGenerator` 接口，扩展服务端 `ThumbnailService` 的能力。

核心功能：
- 实现 `ThumbnailGenerator` 接口，注册到 `ThumbnailService`
- 支持: psd, ai, eps, svg, tiff, tif, dng, raw, heic, heif（可配置）
- 生成参数：200x200 像素，保持宽高比
- ImageMagick 路径自动查找（配置 > 环境变量 > PATH）

## 入口

- **入口文件**: `index.ts` -- 导出 `init(inst): ThumbImageMagickPlugin` 工厂函数
- 由 `ServerPluginManager` 自动加载

## 配置 (data/config.json)

```json
{
  "enableExts": ["psd"],
  "magickPath": ""
}
```

## ImageMagick 查找优先级

1. 配置文件 `magickPath`
2. 环境变量 `MAGICK_PATH`
3. PATH 查找 `magick`
4. PATH 查找 `convert`（排除 Windows 系统 convert.exe）

## 依赖

- `which` (^7.0.0): 查找 ImageMagick
- 外部依赖: ImageMagick (需系统安装)
