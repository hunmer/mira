#!/usr/bin/env node
/**
 * build-client-plugins-index.mjs
 *
 * 扫描 online_client_plugins/plugins/ 下的所有插件目录，
 * 生成 / 更新根目录下的 plugins.json 索引。
 *
 * 用法:
 *   node scripts/build-client-plugins-index.mjs            # 单次生成
 *   node scripts/build-client-plugins-index.mjs --watch    # 监听变化自动重建
 *   node scripts/build-client-plugins-index.mjs --serve    # 在 8080 起静态服务（仅生成一次索引）
 *   node scripts/build-client-plugins-index.mjs --watch --serve  # 监听 + 起静态服务
 *   node scripts/build-client-plugins-index.mjs --sync <installDir>  # 生成后同步覆盖到安装目录
 *   node scripts/build-client-plugins-index.mjs --watch --serve --sync <installDir>  # 全开
 *
 * --sync <installDir>:
 *   生成索引后，把每个插件按 pluginId 同步到 <installDir>/<pluginId>/。
 *   先用整目录 checksum 与目标已存在目录对比，一致则跳过（零写入）；
 *   不一致则删旧目录、按 IGNORED_NAMES 过滤后逐文件覆盖。
 *   安装目录路径需显式传入（如 Electron 的 userData/plugins 目录）。
 *
 * 设计要点:
 *   - 零运行时依赖，仅用 Node 内置模块；
 *   - 校验 plugin.json 必填字段，检测 pluginId 重复；
 *   - 为每个文件计算 sha256，并为整目录计算聚合 checksum（可重现）；
 *   - 原子写入 plugins.json（先写 .tmp 再 rename）；
 *   - 校验失败时以非零退出码退出，便于接入 CI；
 *   - --serve 用 Node 内置 http 起零依赖静态服务，带 CORS，便于客户端跨域拉取。
 */

import { createHash } from 'node:crypto'
import { readFile, readdir, stat, writeFile, rename, access, rm, mkdir, copyFile } from 'node:fs/promises'
import { existsSync, watch } from 'node:fs'
import { createServer } from 'node:http'
import { join, relative, sep, posix, dirname, extname, normalize, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
// 脚本位于 <repo>/scripts/，市场源仓库位于 <repo>/online_client_plugins/
const ROOT = join(__dirname, '..', 'online_client_plugins')
const PLUGINS_DIR = join(ROOT, 'plugins')
const INDEX_PATH = join(ROOT, 'plugins.json')

const INDEX_VERSION = 1
const REQUIRED_FIELDS = ['pluginName', 'pluginId', 'version']

// 默认忽略的文件 / 目录名（不进入索引与 checksum 计算）
// 注意：dist / build 不在忽略列表内 —— 预构建产物（如白板插件的 dist/）属于可分发内容，
// 必须随市场安装包一起下发，否则客户端安装后无法加载插件窗口入口。
const IGNORED_NAMES = new Set(['node_modules', '.git', '.DS_Store', 'Thumbs.db'])

/**
 * 默认忽略的「仅构建期」文件 glob（相对插件根）。
 *
 * 这些文件是构建 SPA 类插件的输入/工具链，运行时不需要，不应进入安装包：
 *   src/                  源码（构建产物在 dist/）
 *   vite.config.*         构建配置
 *   tsconfig*.json        TS 配置
 *   index.html / *.html   插件根的 HTML 入口（vite 构建输入；运行时入口是 dist/index.html）
 *   pnpm-lock.yaml / *lock*  锁文件
 *   .gitignore / .pluginignore
 *   .eslintrc* / .prettierrc*  代码规范配置
 *
 * 纯 JS 插件（只有 index.js）默认不受影响：没有 src/、没有 html、没有 vite 配置。
 * 单个插件可在根目录放 .pluginignore 覆盖默认（与 gitignore 语法一致，空行/#注释忽略）。
 */
const DEFAULT_IGNORE_GLOBS = [
  'src/',
  'vite.config.*',
  'vite.config.*.js',
  'vite.config.*.ts',
  'vite.config.*.mjs',
  'vite.config.*.cjs',
  'tsconfig*.json',
  'index.html',
  '*.html',
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  '.gitignore',
  '.pluginignore',
  '.eslintrc*',
  '.prettierrc*',
]

/**
 * 极简 glob 匹配：
 *   - 支持 *（不含路径分隔符）、**（跨目录）、行尾 / 表目录
 *   - 不支持 ?、字符类 []、复杂嵌套
 *   - 注意：本函数只判断「模式是否匹配该路径」（忽略 ! 取反语义，取反由 shouldIgnore 处理）
 * 覆盖本项目用到的模式，避免引入第三方依赖。
 * @param {string} pattern glob 模式（posix，可能带 ! 前缀）
 * @param {string} posixRel 相对插件根的 posix 路径
 * @param {boolean} isDir 当前路径是否目录
 */
function matchGlob(pattern, posixRel, isDir) {
  const neg = pattern.startsWith('!')
  const p = neg ? pattern.slice(1) : pattern
  // 行尾 '/' → 表目录（匹配该目录及其下所有内容）
  const dirOnly = p.endsWith('/')
  const pat = dirOnly ? p.slice(0, -1) : p
  // 锚定到根：模式按段与路径匹配
  const regex = globToRegex(pat)
  // 完全匹配 / 前缀匹配（目录及其子内容）
  const matchedFull = regex.test(posixRel)
  // 若模式本身不带 **，也允许它匹配某一级目录前缀（使 'src' 命中 'src/a.ts'）
  let matchedPrefix = false
  if (!pat.includes('**')) {
    const segs = posixRel.split('/')
    for (let i = 1; i <= segs.length; i++) {
      if (regex.test(segs.slice(0, i).join('/'))) {
        matchedPrefix = true
        break
      }
    }
  }
  // 返回「原始匹配结果」（不含取反），! 由 shouldIgnore 解释
  return matchedFull || matchedPrefix
}

/** 把简单 glob 转成正则 */
function globToRegex(glob) {
  let re = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // **  跨任意层级
        re += '.*'
        i++
        // 吃掉可能紧跟的 '/'
        if (glob[i + 1] === '/') i++
      } else {
        // *  不含路径分隔符
        re += '[^/]*'
      }
    } else if ('.+^$(){}|[]\\'.includes(c)) {
      re += '\\' + c
    } else {
      re += c
    }
  }
  return new RegExp('^' + re + '$')
}

/**
 * 解析 .pluginignore（gitignore 风格），返回 glob 模式数组。
 * 空行与 # 开头的注释忽略；保留行序；支持前缀 ! 取反。
 * @param {string} content
 * @returns {string[]}
 */
function parseIgnoreFile(content) {
  return content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))
}

/**
 * 判断某个相对路径是否应被忽略。
 * @param {string} posixRel 相对插件根的 posix 路径
 * @param {boolean} isDir 是否目录
 * @param {string[]} patterns 当前生效的 glob 模式（默认 + .pluginignore，按顺序）
 */
function shouldIgnore(posixRel, isDir, patterns) {
  let ignored = false
  for (const pat of patterns) {
    if (matchGlob(pat, posixRel, isDir)) {
      ignored = !pat.startsWith('!')
    }
  }
  return ignored
}

const log = (...args) => console.log('[client-plugins-index]', ...args)
const warn = (...args) => console.warn('[client-plugins-index] ⚠️', ...args)
const err = (...args) => console.error('[client-plugins-index] ❌', ...args)

/** 把平台路径分隔符统一成正斜杠，便于跨平台生成一致的相对路径 */
const toPosix = (p) => p.split(sep).join(posix.sep)

/**
 * 递归收集目录下的所有文件相对路径。
 * 应用三层过滤：IGNORED_NAMES（硬忽略）→ DEFAULT_IGNORE_GLOBS（构建期文件）→ 插件自定义 .pluginignore。
 * @param {string} dir 绝对目录
 * @param {string[]} extraIgnore 插件自定义 glob（已读取并合并，按序追加）
 * @returns {Promise<string[]>} 相对 dir 的 posix 路径列表
 */
async function collectFiles(dir, extraIgnore = []) {
  const patterns = [...DEFAULT_IGNORE_GLOBS, ...extraIgnore]
  const out = []
  const stack = ['.']
  while (stack.length) {
    const rel = stack.pop()
    const abs = join(dir, rel)
    const entryStat = await stat(abs)
    if (entryStat.isDirectory()) {
      const entries = await readdir(abs, { withFileTypes: true })
      for (const e of entries) {
        if (IGNORED_NAMES.has(e.name)) continue
        const childRel = toPosix(join(rel, e.name))
        // 目录命中 ignore（前缀匹配）时整棵子树跳过，避免无谓遍历
        if (shouldIgnore(childRel, true, patterns)) continue
        stack.push(join(rel, e.name))
      }
    } else if (entryStat.isFile()) {
      const posixRel = toPosix(rel)
      if (shouldIgnore(posixRel, false, patterns)) continue
      out.push(posixRel)
    }
  }
  return out
}

/**
 * 计算单个文件的 sha256。
 * @returns {Promise<{size:number, checksum:string}>}
 */
async function fileFingerprint(absPath) {
  const buf = await readFile(absPath)
  const size = buf.length
  const checksum = 'sha256:' + createHash('sha256').update(buf).digest('hex')
  return { size, checksum }
}

/**
 * 计算整目录的可重现 checksum：
 * 把所有文件按 posix 相对路径 Unicode 升序排列，
 * 对每段 `${relativePath}\0${fileSha256}\n` 累加进一个哈希流。
 * 这样内容相同的目录在任何平台上都会得到同样的 checksum。
 */
function dirChecksum(fileEntries) {
  const sorted = [...fileEntries].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  const h = createHash('sha256')
  for (const f of sorted) {
    h.update(f.path)
    h.update('\0')
    h.update(f.checksum)
    h.update('\n')
  }
  return 'sha256:' + h.digest('hex')
}

/** 校验 plugin.json 必填字段 */
function validateConfig(config, dirName) {
  const missing = REQUIRED_FIELDS.filter((k) => config[k] == null)
  if (missing.length) {
    throw new Error(`插件目录 "${dirName}" 的 plugin.json 缺少必填字段: ${missing.join(', ')}`)
  }
  if (typeof config.pluginId !== 'string' || !config.pluginId.trim()) {
    throw new Error(`插件目录 "${dirName}" 的 pluginId 不能为空`)
  }
}

/**
 * 读取单个插件目录，构造一条索引条目。
 */
async function buildEntry(pluginAbsDir) {
  const dirName = toPosix(relative(PLUGINS_DIR, pluginAbsDir))
  const pluginJsonPath = join(pluginAbsDir, 'plugin.json')

  const raw = await readFile(pluginJsonPath, 'utf-8')
  let config
  try {
    config = JSON.parse(raw)
  } catch (e) {
    throw new Error(`插件目录 "${dirName}" 的 plugin.json 解析失败: ${e.message}`)
  }
  validateConfig(config, dirName)

  // 读取插件自定义 .pluginignore（可选，gitignore 风格），追加在默认忽略之后
  let extraIgnore = []
  try {
    const ignoreRaw = await readFile(join(pluginAbsDir, '.pluginignore'), 'utf-8')
    extraIgnore = parseIgnoreFile(ignoreRaw)
  } catch {
    // 无 .pluginignore，使用默认
  }

  // 收集全部文件指纹（已按默认 + 自定义规则过滤构建期文件）
  const relFiles = await collectFiles(pluginAbsDir, extraIgnore)
  const files = []
  let totalSize = 0
  for (const rel of relFiles) {
    const fp = await fileFingerprint(join(pluginAbsDir, rel))
    files.push({ path: rel, size: fp.size, checksum: fp.checksum })
    totalSize += fp.size
  }

  // 整目录 checksum
  const checksum = dirChecksum(files)

  // 推断 icon / readme（相对插件目录）
  const icon = files.some((f) => f.path === 'icon.png')
    ? 'icon.png'
    : files.some((f) => f.path === 'icon.jpg')
      ? 'icon.jpg'
      : null
  const readme = files.some((f) => f.path.toLowerCase() === 'readme.md') ? 'README.md' : null

  return {
    pluginId: config.pluginId,
    pluginName: config.pluginName,
    version: config.version,
    description: config.description ?? '',
    author: config.author ?? '',
    homepage: config.homepage ?? undefined,
    category: config.category ?? undefined,
    tags: Array.isArray(config.tags) ? config.tags : [],
    minAppVersion: config.minAppVersion ?? undefined,
    platform: Array.isArray(config.platform) ? config.platform : undefined,
    // 相对市场源根目录，便于客户端拼接下载 URL: `${marketUrl}/${directory}/...`
    directory: `plugins/${dirName}`,
    icon,
    readme,
    size: totalSize,
    checksum,
    files
  }
}

/**
 * 主流程：扫描并生成索引对象。
 * @returns {{catalog: object, errors: string[]}}
 */
async function build() {
  const errors = []
  const entries = []
  const seenIds = new Map() // pluginId -> dirName

  let dirs = []
  try {
    await access(PLUGINS_DIR)
    const ents = await readdir(PLUGINS_DIR, { withFileTypes: true })
    dirs = ents.filter((e) => e.isDirectory() && !IGNORED_NAMES.has(e.name)).map((e) => e.name)
  } catch {
    // plugins 目录不存在
    warn(`未找到插件目录: ${PLUGINS_DIR}（将生成空索引）`)
  }

  for (const dirName of dirs) {
    try {
      const pluginAbsDir = join(PLUGINS_DIR, dirName)
      // 必须含 plugin.json 才算插件目录
      try {
        await access(join(pluginAbsDir, 'plugin.json'))
      } catch {
        warn(`目录 "${dirName}" 不含 plugin.json，跳过`)
        continue
      }
      const entry = await buildEntry(pluginAbsDir)

      // 重复 pluginId 检测
      if (seenIds.has(entry.pluginId)) {
        throw new Error(
          `pluginId 重复: "${entry.pluginId}" 同时出现在 "${seenIds.get(entry.pluginId)}" 与 "${dirName}"`
        )
      }
      seenIds.set(entry.pluginId, dirName)
      entries.push(entry)
    } catch (e) {
      errors.push(e.message)
      err(e.message)
    }
  }

  const catalog = {
    version: INDEX_VERSION,
    generatedAt: new Date().toISOString(),
    plugins: entries
  }
  return { catalog, errors }
}

/** 解析监听端口：--port <n> > process.env.PORT > 默认 8080 */
function resolvePort(argv) {
  const portIdx = argv.indexOf('--port')
  if (portIdx !== -1 && argv[portIdx + 1]) {
    const p = Number(argv[portIdx + 1])
    if (Number.isInteger(p) && p > 0 && p < 65536) return p
    err(`--port 值无效: ${argv[portIdx + 1]}，回退到默认/环境变量`)
  }
  if (process.env.PORT) {
    const p = Number(process.env.PORT)
    if (Number.isInteger(p) && p > 0 && p < 65536) return p
  }
  return 8080
}

/**
 * 解析 --sync 安装目录参数，返回绝对路径或 null。
 * 相对路径基于 cwd 解析。
 */
function resolveSyncDir(argv) {
  const idx = argv.indexOf('--sync')
  if (idx === -1 || !argv[idx + 1]) return null
  const dir = argv[idx + 1].trim()
  if (!dir) {
    err('--sync 需要提供一个目录路径')
    return null
  }
  return isAbsolute(dir) ? dir : resolve(process.cwd(), dir)
}

/** 常见 MIME 类型映射（未知类型回退 application/octet-stream） */
const MIME = {
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.map': 'application/json; charset=utf-8',
  '.zip': 'application/zip'
}

/**
 * 零依赖静态服务：把市场源根目录 ROOT 通过 HTTP 暴露，并带 CORS 头。
 * 供客户端跨域拉取 plugins.json 与各插件文件。
 */
function startStaticServer(port) {
  const server = createServer(async (req, res) => {
    // 始终允许跨域（客户端跨域拉取必需）
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: 'Method Not Allowed' }))
      return
    }

    // 解析 URL → ROOT 下的安全路径（防 ../../ 越界）
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    const safe = normalize(urlPath).replace(/^(\.\.[/\\])+/, '')
    const abs = join(ROOT, safe)

    try {
      const s = await stat(abs)
      let target = abs
      if (s.isDirectory()) {
        // 目录优先返回 index.html，否则回退到 plugins.json（市场索引最常用）
        const indexHtml = join(abs, 'index.html')
        target = existsSync(indexHtml) ? indexHtml : join(abs, 'plugins.json')
        if (!existsSync(target)) {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: 'Not Found', path: urlPath }))
          return
        }
      }
      const data = await readFile(target)
      res.setHeader('Content-Type', MIME[extname(target).toLowerCase()] || 'application/octet-stream')
      res.writeHead(200)
      res.end(data)
    } catch (e) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: 'Not Found', path: urlPath }))
    }
  })

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      err(`端口 ${port} 已被占用，静态服务启动失败。可用 PORT=xxxx 或 --port xxxx 指定其他端口。`)
    } else {
      err('静态服务错误:', e.message)
    }
    process.exitCode = 1
  })

  server.listen(port, () => {
    log(`🌐 静态服务已启动: http://localhost:${port}`)
    log(`   市场源根目录: ${ROOT}`)
    log(`   客户端「插件市场源」填: http://localhost:${port}`)
  })
  return server
}

/**
 * 计算目标安装目录中某插件的整目录 checksum（与 buildEntry 用的算法一致）。
 * 用于判定是否需要覆盖：源与目标 checksum 相同则跳过。
 * 目标目录不存在时返回 null。
 * @param {string} pluginTargetDir 安装目录下的 <pluginId> 子目录绝对路径
 * @returns {Promise<string|null>}
 */
async function targetChecksum(pluginTargetDir) {
  try {
    await access(pluginTargetDir)
  } catch {
    return null
  }
  const relFiles = await collectFiles(pluginTargetDir)
  const files = []
  for (const rel of relFiles) {
    const fp = await fileFingerprint(join(pluginTargetDir, rel))
    files.push({ path: rel, ...fp })
  }
  return dirChecksum(files)
}

/**
 * 把单个插件源目录同步覆盖到安装目录下的 <pluginId>/。
 * - checksum 一致 → 跳过（不写入）
 * - 不一致/不存在 → 删旧目录，按 IGNORED_NAMES 过滤后逐文件复制
 * @param {object} entry 索引条目（含 pluginId、checksum、files）
 * @param {string} sourceDir 源插件目录绝对路径（online_client_plugins/plugins/<dir>）
 * @param {string} installDir 安装根目录绝对路径
 * @returns {Promise<'skip'|'updated'>}
 */
async function syncPlugin(entry, sourceDir, installDir) {
  const targetDir = join(installDir, entry.pluginId)
  const existing = await targetChecksum(targetDir)

  // 内容一致则跳过（同一目录或内容相同的目录都算）
  if (existing && existing === entry.checksum) {
    return 'skip'
  }

  // 删除旧目录（若存在）再重建
  await rm(targetDir, { recursive: true, force: true })
  await mkdir(targetDir, { recursive: true })

  // 逐文件复制（复用 collectFiles，按 IGNORED_NAMES 过滤）
  const relFiles = await collectFiles(sourceDir)
  for (const rel of relFiles) {
    const dest = join(targetDir, rel)
    await mkdir(dirname(dest), { recursive: true })
    await copyFile(join(sourceDir, rel), dest)
  }
  return 'updated'
}

/**
 * 同步全部插件到安装目录。
 * @param {object[]} entries 索引条目数组
 * @param {string} installDir 安装根目录绝对路径
 */
async function syncAll(entries, installDir) {
  try {
    await access(installDir)
  } catch {
    await mkdir(installDir, { recursive: true })
    log(`📥 创建安装目录: ${installDir}`)
  }

  let updated = 0
  let skipped = 0
  const errors = []
  for (const entry of entries) {
    // entry.directory 形如 "plugins/<dir>"，源目录绝对路径
    const sourceDir = join(ROOT, entry.directory)
    try {
      const r = await syncPlugin(entry, sourceDir, installDir)
      if (r === 'skip') {
        skipped++
      } else {
        updated++
        log(`⬆️  已同步: ${entry.pluginName} (${entry.pluginId})`)
      }
    } catch (e) {
      errors.push(`${entry.pluginId}: ${e.message}`)
      err(`同步失败 ${entry.pluginId}: ${e.message}`)
    }
  }
  log(`📦 同步完成: ${updated} 更新, ${skipped} 跳过 → ${installDir}`)
  if (errors.length) {
    err(`同步存在 ${errors.length} 个错误（见上）`)
  }
}

/** 原子写入 JSON（写 .tmp 再 rename） */
async function writeIndex(catalog) {
  const json = JSON.stringify(catalog, null, 2) + '\n'
  const tmp = INDEX_PATH + '.tmp'
  await writeFile(tmp, json, 'utf-8')
  await rename(tmp, INDEX_PATH)
}

let running = false
async function run(reason, syncDir) {
  if (running) return
  running = true
  try {
    if (reason) log(`重新生成索引 (${reason})`)
    const { catalog, errors } = await build()
    await writeIndex(catalog)
    log(`✅ 已生成 ${INDEX_PATH}: ${catalog.plugins.length} 个插件`)
    if (errors.length) {
      err(`存在 ${errors.length} 个错误（见上）`)
    }
    // 若指定了安装目录，生成索引后同步覆盖
    if (syncDir) {
      await syncAll(catalog.plugins, syncDir)
    }
  } catch (e) {
    err('生成索引失败:', e.message)
    process.exitCode = 1
  } finally {
    running = false
  }
}

async function main() {
  const argv = process.argv
  const watchMode = argv.includes('--watch')
  const serveMode = argv.includes('--serve')
  const syncDir = resolveSyncDir(argv)

  if (syncDir) {
    log(`📥 同步模式已启用，安装目录: ${syncDir}`)
  }

  await run('初始化', syncDir)

  if (watchMode) {
    if (!existsSync(PLUGINS_DIR)) {
      warn(`--watch 模式下插件目录不存在: ${PLUGINS_DIR}，等待创建...`)
    }
    // 递归监听较复杂，这里监听 plugins/ 一层，配合 collectFiles 已够用
    let debounce
    const trigger = (label) => {
      clearTimeout(debounce)
      debounce = setTimeout(() => run(label, syncDir), 300)
    }
    try {
      watch(PLUGINS_DIR, { recursive: true }, (eventType, filename) => {
        if (filename && IGNORED_NAMES.has(filename.split(sep)[0])) return
        trigger(`文件变化: ${eventType} ${filename ?? ''}`)
      })
      log('👀 watch 模式已启动，监听', PLUGINS_DIR)
    } catch (e) {
      err('启动 watch 失败（当前平台可能不支持 recursive watch）:', e.message)
      process.exitCode = 1
    }
  }

  if (serveMode) {
    const port = resolvePort(argv)
    startStaticServer(port)
  }
}

main().catch((e) => {
  err('未捕获错误:', e)
  process.exit(1)
})
