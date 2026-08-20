/**
 * 镜像同步 dist/ → Photoshop CEP 扩展目录。
 * - 启动先做一次全量镜像(按内容比对,只复制有变化的文件)
 * - 随后递归 watch dist,变化防抖 250ms 后重新镜像(自动删除多余文件)
 * - --once 只做一次全量同步
 * 目标目录可用环境变量 MIRA_CEP_EXTENSION_DIR 覆盖。
 */
import { spawnSync } from 'node:child_process'
import { existsSync, watch } from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'

const packageRoot = path.resolve(import.meta.dirname, '..')
const SRC = path.join(packageRoot, 'dist')
export const DEST = process.env.MIRA_CEP_EXTENSION_DIR
  ?? 'D:/Adobe_Photoshop_2020_v21.2.12.215_2021-09/Photoshop/Required/CEP/extensions/com.hunmer.mira'

/** 列出目录下全部文件的相对路径集合 */
async function walk(dir, base = dir, out = new Set()) {
  let entries = []
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await walk(full, base, out)
    else out.add(path.relative(base, full).replaceAll('\\', '/'))
  }
  return out
}

async function isSameFile(a, b) {
  const [sa, sb] = await Promise.all([fsp.stat(a), fsp.stat(b).catch(() => null)])
  if (!sb) return false
  return sa.size === sb.size && Math.abs(sa.mtimeMs - sb.mtimeMs) < 3000
}

/** 全量镜像:复制新增/变化文件,删除目标端多余文件 */
export async function mirror() {
  await fsp.mkdir(DEST, { recursive: true })
  const srcFiles = await walk(SRC)
  const destFiles = await walk(DEST)
  const copied = []
  const removed = []
  for (const rel of srcFiles) {
    const from = path.join(SRC, rel)
    const to = path.join(DEST, rel)
    if (await isSameFile(from, to)) continue
    await fsp.mkdir(path.dirname(to), { recursive: true })
    try {
      const st = await fsp.stat(from)
      await fsp.copyFile(from, to)
      // copyFile 不保留 mtime,手动对齐以便下次按 mtime+size 跳过未变化文件
      await fsp.utimes(to, st.atime, st.mtime)
      copied.push(rel)
    } catch (error) {
      // PS 面板运行中可能锁定文件:跳过并提示(重开面板后再次同步即可)
      console.warn(`[sync] 跳过被占用的文件 ${rel}: ${error.code ?? error.message}`)
    }
  }
  for (const rel of destFiles) {
    if (srcFiles.has(rel)) continue
    try {
      await fsp.rm(path.join(DEST, rel))
      removed.push(rel)
    } catch {
      /* 忽略删除失败 */
    }
  }
  return { copied, removed }
}

/** 未签名扩展需要 PlayerDebugMode(仅提示,不代改注册表) */
function checkDebugMode() {
  const query = spawnSync('reg', ['query', 'HKCU\\Software\\Adobe\\CSXS.9', '/v', 'PlayerDebugMode'], { encoding: 'utf8' })
  const output = `${query.stdout ?? ''}${query.stderr ?? ''}`
  if (!/PlayerDebugMode\s+REG_SZ\s+1/i.test(output)) {
    console.warn('[sync] 未检测到 PlayerDebugMode,Photoshop 不会加载未签名扩展。执行:')
    console.warn('       pnpm -C packages/mira-cep-panel run enable-debug')
  }
}

export async function syncOnce() {
  if (!existsSync(SRC)) throw new Error(`dist 不存在: ${SRC},请先执行 pnpm run build`)
  checkDebugMode()
  const { copied, removed } = await mirror()
  console.log(`[sync] ${DEST}`)
  console.log(`[sync] 复制 ${copied.length} 个文件${copied.length ? `: ${copied.join(', ')}` : ''}${removed.length ? `;删除 ${removed.length} 个` : ''}`)
}

export async function syncWatch() {
  await syncOnce()
  console.log('[sync] 监听 dist 变化中…(Ctrl+C 退出)')
  let timer = null
  watch(SRC, { recursive: true }, () => {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      try {
        const { copied } = await mirror()
        if (copied.length) console.log(`[sync] 已同步 ${copied.length} 个文件: ${copied.join(', ')}`)
      } catch (error) {
        console.error('[sync] 同步失败:', error.message)
      }
    }, 250)
  })
}

const once = process.argv.includes('--once')

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  ;(once ? syncOnce() : syncWatch()).catch(error => {
    console.error('[sync] 失败:', error.message)
    process.exitCode = 1
  })
}
