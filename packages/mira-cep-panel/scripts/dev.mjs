/**
 * 一键联调:vite build --watch 增量构建 → CSS 降级(compat-css)→ 镜像同步到 PS 扩展目录。
 * Photoshop 里重开面板窗口即可看到最新内容(菜单 窗口 > 扩展功能 > Mira 素材库)。
 */
import { spawn } from 'node:child_process'
import { existsSync, watch } from 'node:fs'
import path from 'node:path'
import { runCompatCss } from './compat-css.mjs'
import { mirror } from './sync.mjs'

const packageRoot = path.resolve(import.meta.dirname, '..')
const distDir = path.join(packageRoot, 'dist')

const busy = { current: false }
let timer = null

async function compatAndMirror(label) {
  await runCompatCss()
  const { copied, removed } = await mirror()
  if (copied.length || removed.length) {
    console.log(`[${label}] 同步 ${copied.length} 复制 / ${removed.length} 删除`)
  }
}

function onDistChange() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    void (async () => {
      if (busy.current) return
      busy.current = true
      try {
        await compatAndMirror('dev')
      } catch (error) {
        console.error('[dev] 同步失败:', error.message)
      } finally {
        busy.current = false
      }
    })()
  }, 300)
}

// Windows 下 spawn pnpm 需要 shell
const build = spawn('pnpm', ['exec', 'vite', 'build', '--watch'], { cwd: packageRoot, shell: true, stdio: 'inherit' })
build.on('exit', code => process.exit(code ?? 0))

// 轮询等待 vite 首次构建产物出现,再做首轮 降级+同步 并进入常驻监听
const poll = setInterval(() => {
  if (!existsSync(path.join(distDir, 'index.html'))) return
  clearInterval(poll)
  void (async () => {
    try {
      await compatAndMirror('dev 首次')
      console.log('[dev] 监听 dist 变化中…(Ctrl+C 退出)')
      watch(distDir, { recursive: true }, onDistChange)
    } catch (error) {
      console.error('[dev] 首次同步失败:', error.message)
      process.exitCode = 1
    }
  })()
}, 1000)
