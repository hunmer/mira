const assert = require('assert')
const fs = require('fs')
const path = require('path')

// 静态回归检查：确保 web 资产是纯浏览器代码，
// 不残留 require / module.exports / eagle.* / i18next。
const FORBIDDEN = [
  { pattern: /\brequire\s*\(/, label: 'require(' },
  { pattern: /\bmodule\.exports\b/, label: 'module.exports' },
  { pattern: /\beagle\./, label: 'eagle.' },
  { pattern: /\bi18next\b/, label: 'i18next' },
  { pattern: /\b__dirname\b/, label: '__dirname' },
]

const webDir = path.join(__dirname, 'web')
const targets = ['index.js', 'viewer.html']
let failed = false

for (const target of targets) {
  const file = path.join(webDir, target)
  const src = fs.readFileSync(file, 'utf8')
  for (const { pattern, label } of FORBIDDEN) {
    if (pattern.test(src)) {
      console.error(`[forbidden] ${target} contains "${label}"`)
      failed = true
    }
  }
}

// plugin.json 的 pluginId 必须与 index.js 中的 PLUGIN_ID 一致。
const pluginJson = JSON.parse(fs.readFileSync(path.join(webDir, 'plugin.json'), 'utf8'))
const indexSrc = fs.readFileSync(path.join(webDir, 'index.js'), 'utf8')
const m = indexSrc.match(/PLUGIN_ID\s*=\s*'([^']+)'/)
assert(m, 'PLUGIN_ID 常量缺失')
assert.strictEqual(
  pluginJson.pluginId,
  m[1],
  'plugin.json pluginId 必须与 index.js 中的 PLUGIN_ID 一致',
)

if (failed) {
  process.exitCode = 1
  console.error('Zipper browser bundle regression check FAILED')
} else {
  console.log('Zipper browser bundle regression check passed')
}
