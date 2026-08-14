#!/usr/bin/env node
/**
 * 浮动窗口构建脚本
 *
 * 搜索窗口等独立 HTML 页面使用全局 <script>（非 ES module）加载
 * vue.global.prod.js 与 floating-window-core.js，通过 loadFile 直接打开。
 * 这类页面不经过 Vite 打包，构建时只需将源目录"扁平化"拷贝到 dist-float/。
 * （通知窗口已迁移为渲染器应用 Vite 多页入口 notification-window.html，走 dist-renderer。）
 *
 * 产物结构：
 *   dist-float/
 *     search-window.html          (来自 src/search-window/)
 *     search-window.js
 *     floating-window-core.js     (来自 src/floating-window/)
 *     vendor/vue.global.prod.js   (来自 src/floating-window/vendor/)
 *
 * 主进程通过 loadFile('dist-float/<name>.html') 加载，HTML 内的相对引用
 * (./<name>.js、../floating-window/...) 在扁平化后调整为同级路径。
 */
const fs = require('fs')
const path = require('path')

const projectRoot = path.join(__dirname, '..')
const outDir = path.join(projectRoot, 'dist-float')

// 需要扁平化拷贝的源文件 → 目标文件名
// （notification-window 已迁移为渲染器应用 Vite 多页入口，不再走 dist-float）
const filesToCopy = [
  // search-window
  ['src/search-window/search-window.html', 'search-window.html'],
  ['src/search-window/search-window.js', 'search-window.js'],
  // floating-ball-window
  ['src/floating-ball-window/floating-ball-window.html', 'floating-ball-window.html'],
  ['src/floating-ball-window/floating-ball-window.js', 'floating-ball-window.js'],
  // floating-window core
  ['src/floating-window/floating-window-core.js', 'floating-window-core.js'],
  // shared vue vendor
  ['src/floating-window/vendor/vue.global.prod.js', 'vendor/vue.global.prod.js'],
]

/**
 * 将 HTML 中的目录相对引用重写为扁平化后的同级引用。
 * - ../floating-window/vendor/vue.global.prod.js → vendor/vue.global.prod.js
 * - ../floating-window/floating-window-core.js  → floating-window-core.js
 * - ./search-window.js 保持不变（已同级）
 */
function rewriteHtmlReferences(content) {
  return content
    .replace(/\.\.\/floating-window\/vendor\/vue\.global\.prod\.js/g, 'vendor/vue.global.prod.js')
    .replace(/\.\.\/floating-window\/floating-window-core\.js/g, 'floating-window-core.js')
}

function main() {
  console.log('📦 开始构建浮动窗口...')

  // 清空输出目录
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(outDir, { recursive: true })

  let copied = 0
  for (const [src, dest] of filesToCopy) {
    const srcPath = path.join(projectRoot, src)
    const destPath = path.join(outDir, dest)

    if (!fs.existsSync(srcPath)) {
      console.error(`❌ 源文件不存在: ${src}`)
      process.exit(1)
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true })

    if (src.endsWith('.html')) {
      const content = fs.readFileSync(srcPath, 'utf-8')
      fs.writeFileSync(destPath, rewriteHtmlReferences(content), 'utf-8')
    } else {
      fs.copyFileSync(srcPath, destPath)
    }

    copied++
    console.log(`  ✓ ${src} → dist-float/${dest}`)
  }

  console.log(`\n✅ 浮动窗口构建完成，共 ${copied} 个文件输出到 dist-float/`)
}

main()
