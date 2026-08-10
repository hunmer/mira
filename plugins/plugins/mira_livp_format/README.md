# Mira LIVP Format

为 `.livp`（Apple Live Photo ZIP 容器）提供：

- HEIC/JPEG 静态缩略图
- 静态图 + MOV/MP4 循环播放 viewer
- 受控的容器附加文件 URL

插件使用 Mira 的 `registerFileFormat`、`getExtraFileList/getExtraFile` 和服务端 viewer API，不依赖 Eagle API。

HEIC/HEIF 解码使用 Mira 服务端同样依赖的 ImageMagick。请确保 `magick` 在 PATH 中，或设置 `IMAGEMAGICK_PATH`。
