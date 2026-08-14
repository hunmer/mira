# mira_gallery_dl

Mira 服务端插件。使用 `gallery-dl` 批量解析用户输入的图库链接，并将用户选中的图片导入指定素材库、文件夹和标签。

## 运行依赖

安装 `gallery-dl` 1.32.9 或更高版本：

```powershell
py -m pip install -U gallery-dl
```

插件依次检测：

- `GALLERY_DL_PATH` 指向的可执行文件
- `GALLERY_DL_PYTHON` 指向的 Python 解释器
- Windows 用户目录中的 `gallery-dl.exe`
- `gallery-dl`、`py -m gallery_dl`、`python -m gallery_dl`

## 接口

- `GET /api/gallery-dl/status?libraryId=...`
- `POST /api/gallery-dl/parse`
- `POST /api/gallery-dl/import`

接口均经过 Mira 统一登录鉴权。解析最多 20 条输入链接、500 个候选项；单次最多导入 100 张图片，每张最大 100MB。
