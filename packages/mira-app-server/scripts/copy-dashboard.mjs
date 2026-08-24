#!/usr/bin/env node
/**
 * 构建 mira-dashboard-next 并将其 dist 产物同步到 app-server 的 dist/dashboard 目录下，
 * 供 app-server 通过 /dashboard 静态托管。
 *
 * 依赖 pnpm workspace：从 app-server 目录通过相对路径找到 mira-dashboard-next。
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// app-server 根目录（scripts/ 的上一级）
const appServerDir = path.resolve(__dirname, '..')
// dashboard 源包目录：packages/mira-dashboard-next
const dashboardDir = path.resolve(appServerDir, '../mira-dashboard-next')
// dashboard 构建产物目录
const dashboardDistDir = path.join(dashboardDir, 'dist')
// app-server 内目标托管目录：dist/dashboard
const targetDir = path.join(appServerDir, 'dist', 'dashboard')

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

// 1. 构建 dashboard
if (!fs.existsSync(dashboardDir)) {
  console.error(`Dashboard package not found at: ${dashboardDir}`)
  process.exit(1)
}

console.log('📦 Building mira-dashboard-next...')
run('pnpm', ['run', 'build'], dashboardDir)

if (!fs.existsSync(dashboardDistDir)) {
  console.error(`Dashboard build output not found at: ${dashboardDistDir}`)
  process.exit(1)
}

// 2. 清理并重建目标目录
if (fs.existsSync(targetDir)) {
  console.log(`🧹 Cleaning existing ${path.relative(appServerDir, targetDir)}`)
  fs.rmSync(targetDir, { recursive: true, force: true })
}
fs.mkdirSync(targetDir, { recursive: true })

// 3. 复制产物
console.log(`📁 Copying dashboard dist -> ${path.relative(appServerDir, targetDir)}`)
copyDir(dashboardDistDir, targetDir)

console.log('✅ Dashboard bundled into app-server/dist/dashboard')

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
