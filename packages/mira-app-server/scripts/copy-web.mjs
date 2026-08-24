#!/usr/bin/env node
/**
 * 构建 mira-client（vite build，产物在 dist-renderer）并将其同步到 app-server 的 web 目录下，
 * 供 app-server 通过 /web 静态托管。
 *
 * 依赖 pnpm workspace：从 app-server 目录通过相对路径找到 mira-client。
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// app-server 根目录（scripts/ 的上一级）
const appServerDir = path.resolve(__dirname, '..')
// mira-client 源包目录：packages/mira-client
const clientDir = path.resolve(appServerDir, '../mira-client')
// mira-client 构建产物目录（vite.config.ts 中 build.outDir = 'dist-renderer'）
const clientDistDir = path.join(clientDir, 'dist-renderer')
// app-server 内目标托管目录：web
const targetDir = path.join(appServerDir, 'web')

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

// 1. 校验 mira-client 存在
if (!fs.existsSync(clientDir)) {
  console.error(`mira-client package not found at: ${clientDir}`)
  process.exit(1)
}

// 2. 构建 mira-client（仅 renderer，web 访问无需 electron main/preload）
console.log('📦 Building mira-client...')
run('pnpm', ['run', 'build'], clientDir)

if (!fs.existsSync(clientDistDir)) {
  console.error(`mira-client build output not found at: ${clientDistDir}`)
  process.exit(1)
}

// 3. 清理并重建目标目录
if (fs.existsSync(targetDir)) {
  console.log(`🧹 Cleaning existing ${path.relative(appServerDir, targetDir)}`)
  fs.rmSync(targetDir, { recursive: true, force: true })
}
fs.mkdirSync(targetDir, { recursive: true })

// 4. 复制产物
console.log(`📁 Copying mira-client dist-renderer -> ${path.relative(appServerDir, targetDir)}`)
copyDir(clientDistDir, targetDir)

console.log('✅ mira-client bundled into app-server/web')

function copyDir(src, dest) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      fs.mkdirSync(d, { recursive: true })
      copyDir(s, d)
    } else {
      fs.copyFileSync(s, d)
    }
  }
}
