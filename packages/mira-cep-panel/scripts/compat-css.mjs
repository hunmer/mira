/**
 * 构建产物兼容修正(CEP 9 / Chromium 61):
 * - CSS:Tailwind v4 产物面向现代浏览器,@layer / oklch() / 原生嵌套 / color-mix 直接下发会整表失效,
 *   用 postcss 降到 chrome 61 可用
 * - index.html:去掉 crossorigin 属性(file:// 源不透明,可能触发 CORS 拒载)
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'
import postcssPresetEnv from 'postcss-preset-env'
import cascadeLayers from '@csstools/postcss-cascade-layers'

const distDir = path.resolve(import.meta.dirname, '../dist')
const distAssets = path.join(distDir, 'assets')

/** 去掉 html 中 script/link 的 crossorigin 属性 */
async function patchHtml() {
  const full = path.join(distDir, 'index.html')
  if (!existsSync(full)) return
  const source = await readFile(full, 'utf8')
  const patched = source
    .replaceAll(' crossorigin=""', '')
    .replaceAll(' crossorigin', '')
    // 入口降为经典 defer 脚本:CEP 的 file:// 下 ES module 因跨源校验失败整包不执行(黑屏);
    // 产物单 chunk 且无 import.meta/动态导入,经典脚本等价
    .replace(/<script type="module" /g, '<script defer ')
  if (patched !== source) await writeFile(full, patched)
}

export async function runCompatCss() {
  if (!existsSync(distAssets)) throw new Error(`dist 不存在: ${distAssets},请先执行 vite build`)
  const files = (await readdir(distAssets)).filter(f => f.endsWith('.css'))
  if (!files.length) return []

  const processor = postcss([
    // 先展开 @layer(层级语义转为选择器叠加),再让 preset-env 按目标浏览器转译内部规则
    cascadeLayers(),
    postcssPresetEnv({ browsers: 'chrome >= 61' }),
  ])

  const changed = []
  for (const file of files) {
    const full = path.join(distAssets, file)
    const source = await readFile(full, 'utf8')
    const result = await processor.process(source, { from: full, to: full })
    if (result.css !== source) {
      await writeFile(full, result.css)
      changed.push(file)
    }
  }
  await patchHtml()
  return changed
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  runCompatCss().then(
    changed => console.log(changed.length ? `[compat-css] 已降级: ${changed.join(', ')}` : '[compat-css] 无需改动'),
    error => { console.error('[compat-css] 失败:', error); process.exitCode = 1 },
  )
}
