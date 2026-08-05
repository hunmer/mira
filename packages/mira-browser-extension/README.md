# mira-browser-extension

Mira 浏览器扩展(Chrome MV3)。网页采集入口:截图、拖拽上传、资源嗅探、自动滚动。

## 开发

pnpm install
pnpm --filter mira-browser-extension dev   # vite + @crxjs HMR,加载 dist/ 到 chrome://extensions

## 构建

pnpm --filter mira-browser-extension build  # 产物在 dist/,可直接加载
