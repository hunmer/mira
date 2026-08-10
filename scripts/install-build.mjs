#!/usr/bin/env node
/**
 * 统一的目录遍历 install/build 脚本。
 *
 * 对每个含 package.json 的目标目录，依次执行 install 与 build，
 * 供根 package.json 的 install:deps / build:plugins 复用。
 *
 * 用法:
 *   node scripts/install-build.mjs [--npm] [--no-install] [--no-build] <glob|dir> [...]
 *
 * 选项:
 *   --npm        使用 npm（插件目录）；默认 pnpm（workspace 包）
 *   --no-install 跳过 install
 *   --no-build   跳过 build
 *
 * glob 仅支持单层通配，如 plugins/plugins/*（引号包裹以交由本脚本展开，避免 shell 差异）。
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
let useNpm = false
let doInstall = true
let doBuild = true
const targets = []

for (const a of args) {
  if (a === '--npm') useNpm = true
  else if (a === '--no-install') doInstall = false
  else if (a === '--no-build') doBuild = false
  else targets.push(a)
}

if (targets.length === 0) {
  console.error(
    '用法: install-build.mjs [--npm] [--no-install] [--no-build] <glob|dir> [...]'
  )
  process.exit(1)
}

// 展开 glob：仅处理单层通配 path/prefix/*，列举其下含 package.json 的子目录。
function expand(p) {
  if (!p.includes('*')) return existsSync(p) ? [p] : []
  const base = p.split('*')[0].replace(/\/$/, '')
  if (!existsSync(base)) return []
  return readdirSync(base)
    .filter(name => !name.startsWith('.'))
    .map(name => join(base, name))
    .filter(dir => statSync(dir).isDirectory() && existsSync(join(dir, 'package.json')))
}

const dirs = Array.from(new Set(targets.flatMap(expand)))
if (dirs.length === 0) {
  console.error('未匹配到任何含 package.json 的目录')
  process.exit(1)
}

const pm = useNpm ? 'npm' : 'pnpm'

function run(cmd, cwd) {
  console.log(`\n>>> [${cwd}] $ ${cmd}`)
  const r = spawnSync(cmd, { stdio: 'inherit', shell: true, cwd })
  if (r.status !== 0) {
    console.error(`✗ 失败: ${cmd} @ ${cwd}`)
    process.exit(r.status ?? 1)
  }
}

let count = 0
for (const dir of dirs) {
  console.log(`\n=== ${dir} ===`)
  if (doInstall) run(`${pm} install`, dir)
  if (doBuild) {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    if (pkg.scripts && pkg.scripts.build) {
      run(`${pm} run build`, dir)
    } else {
      console.log('  (无 build 脚本，跳过)')
    }

    // 进入插件的 web 子目录执行 build（若存在）
    const webDir = join(dir, 'web')
    if (existsSync(join(webDir, 'package.json'))) {
      const webPkg = JSON.parse(readFileSync(join(webDir, 'package.json'), 'utf8'))
      if (webPkg.scripts && webPkg.scripts.build) {
        // web 目录用 npm（独立子项目）
        run('npm run build', webDir)
      }
    }
  }
  count++
}

console.log(`\n✓ 完成 ${count} 个目录 (${pm})`)
