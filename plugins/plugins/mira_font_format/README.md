# Mira Font Format

为 Mira 提供 TTF、OTF、WOFF、WOFF2 和 TTC 字体的元数据解析、真实字形缩略图与交互式 HTTP 预览。

## 开发

```powershell
npm install
npm test
```

详情 viewer 通过宿主生成的鉴权 HTTP URL 获取字体，不读取或暴露服务端本地路径。
