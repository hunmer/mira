#!/usr/bin/env node
/**
 * 构建 mira-plugin-ui 并把浏览器侧产物同步到 app-server 的 public/vendor 目录，
 * 供静态页（public/pair.html）经 /static/vendor/ 免构建消费：
 *   - mira-plugin-ui.umd.js / mira-plugin-ui.css：组件库自包含 dist（样式已编译，无需宿主 Tailwind）
 *   - vue.global.prod.js：含运行时编译器的 Vue 全量构建（模板字符串渲染 + UMD 全局依赖）
 *
 * 依赖 pnpm workspace：从 app-server 目录通过相对路径找到 mira-plugin-ui。
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// app-server 根目录（scripts/ 的上一级）
const appServerDir = path.resolve(__dirname, '..')
// 组件库源包目录：packages/mira-plugin-ui
const pluginUiDir = path.resolve(appServerDir, '../mira-plugin-ui')
const pluginUiDistDir = path.join(pluginUiDir, 'dist')
// app-server 内目标托管目录：public/vendor（express.static('/static') 根）
const targetDir = path.join(appServerDir, 'public', 'vendor')

function run(cmd, args, cwd) {
  console.log(`\n$ ${cmd} ${args.join(' ')}${cwd ? `  (in ${cwd})` : ''}`)
  // Windows 上 pnpm 可能是 .cmd shim，execFileSync 不走 shell 无法解析（node 安全限制），
  // 交给 shell 按 PATHEXT 解析可同时兼容 pnpm.exe 与 pnpm.cmd
  execFileSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
}

if (!fs.existsSync(pluginUiDir)) {
  console.error(`mira-plugin-ui package not found at: ${pluginUiDir}`)
  process.exit(1)
}

console.log('📦 Building mira-plugin-ui...')
run('pnpm', ['run', 'build'], pluginUiDir)

// vue 浏览器构建：经 plugin-ui 自身依赖解析（pnpm 严格 node_modules）
const vuePkgDir = path.dirname(createRequire(pathToFileURL(path.join(pluginUiDir, 'package.json'))).resolve('vue/package.json'))
const vueGlobal = path.join(vuePkgDir, 'dist', 'vue.global.prod.js')

const files = [
  [path.join(pluginUiDistDir, 'mira-plugin-ui.umd.js'), 'mira-plugin-ui.umd.js'],
  [path.join(pluginUiDistDir, 'mira-plugin-ui.css'), 'mira-plugin-ui.css'],
  [vueGlobal, 'vue.global.prod.js'],
]

fs.mkdirSync(targetDir, { recursive: true })
for (const [src, name] of files) {
  if (!fs.existsSync(src)) {
    console.error(`Required file not found: ${src}`)
    process.exit(1)
  }
  // 不用 copyFileSync：Windows 上目标被杀软/索引器短暂占用时 Win32 CopyFile 会报 UNKNOWN，
  // 改读写并在被占用时短暂重试
  const dest = path.join(targetDir, name)
  const data = fs.readFileSync(src)
  for (let attempt = 1; ; attempt++) {
    try {
      fs.writeFileSync(dest, data)
      break
    } catch (err) {
      if (attempt >= 3) throw err
      console.warn(`⚠ ${name} 被占用，重试 (${attempt}/3)...`)
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }
  console.log(`📁 ${name} -> ${path.relative(appServerDir, dest)}`)
}

console.log('✅ mira-plugin-ui browser assets synced into app-server/public/vendor')
