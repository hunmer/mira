# mira_html_format

为 Mira 中的 `.html` 和 `.htm` 文件提供预览支持。

服务端通过 `registerFileFormat` 注册格式和 `viewer.html`。宿主返回的预览地址位于
`/server-plugins/<libraryId>/mira_html_format/viewer.html`，viewer 只接受后端生成的
HTTP(S) 文件 URL，不读取或暴露本地文件路径。

素材 HTML 在不含 `allow-same-origin` 的沙箱 iframe 中运行；viewer 不向素材 HTML
传递鉴权 query 或 referrer，避免其访问 Mira 页面上下文及认证信息。
