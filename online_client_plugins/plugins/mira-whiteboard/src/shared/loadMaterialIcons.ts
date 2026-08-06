/**
 * 动态加载 Material Icons 字体（本地优先）
 *
 * 背景：插件窗口是独立 BrowserWindow，与 Mira 主窗口字体隔离。主窗口靠打包进
 * dist 的 material-icons.ttf + fonts.css 显示图标；插件窗口无法共享，若不自带
 * 字体，所有 .material-icons 元素会回退成原始文字（add / delete / dashboard…）。
 *
 * 实现：用 import 把字体文件作为模块导入 —— vite 构建时会把它 emit 成带 hash 的
 * asset（如 dist/assets/material-icons-xxxx.woff2）并在此处把 url 替换为正确的
 * 运行时路径；再用 JS 注入 <style>@font-face</style> 到 document.head。
 * 相比在 .vue 的 <style> 里写 url()，这种方式能稳定触发 vite 的 asset 处理
 * （后者在某些版本下会原样保留字符串、导致字体不进 dist）。
 *
 * 字体来源：Google Fonts 官方 CDN 下载的 woff2，随 dist 打包分发，离线可用。
 */

// 静态导入字体文件：vite 在构建期解析为正确的 asset URL（带 hash）。
import materialIconsUrl from '../assets/fonts/material-icons.woff2'

let injected = false

/**
 * 注入 Material Icons 的 @font-face。幂等，多次调用只注入一次。
 */
export function loadMaterialIcons(): void {
  if (injected || typeof document === 'undefined') return

  const css = `
@font-face {
  font-family: 'Material Icons';
  font-style: normal;
  font-weight: 400;
  src: url(${materialIconsUrl}) format('woff2');
}
.material-icons {
  font-family: 'Material Icons';
  font-weight: normal;
  font-style: normal;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
}
`.trim()

  const style = document.createElement('style')
  style.setAttribute('data-material-icons', 'true')
  style.textContent = css
  document.head.appendChild(style)

  injected = true
}
