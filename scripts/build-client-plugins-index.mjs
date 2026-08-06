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
import { readFile, readdir, stat, writeFile, rename, access } from 'node:fs/promises'
import { existsSync, watch } from 'node:fs'
import { createServer } from 'node:http'
import { join, relative, sep, posix, dirname, extname, normalize } from 'node:path'
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
const IGNORED_NAMES = new Set(['node_modules', '.git', 'dist', 'build', '.DS_Store', 'Thumbs.db'])

const log = (...args) => console.log('[client-plugins-index]', ...args)
const warn = (...args) => console.warn('[client-plugins-index] ⚠️', ...args)
const err = (...args) => console.error('[client-plugins-index] ❌', ...args)

/** 把平台路径分隔符统一成正斜杠，便于跨平台生成一致的相对路径 */
const toPosix = (p) => p.split(sep).join(posix.sep)

/**
 * 递归收集目录下的所有文件相对路径（已忽略 IGNORED_NAMES）。
 * @param {string} dir 绝对目录
 * @returns {Promise<string[]>} 相对 dir 的 posix 路径列表
 */
async function collectFiles(dir) {
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
        stack.push(join(rel, e.name))
      }
    } else if (entryStat.isFile()) {
      out.push(toPosix(rel))
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

  // 收集全部文件指纹
  const relFiles = await collectFiles(pluginAbsDir)
  const files = []
  let totalSize = 0
  for (const rel of relFiles) {
    // 再次过滤保险（collectFiles 已忽略，这里防御性跳过 plugin.json 自身之外的必要项之外的不变）
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

/** 原子写入 JSON（写 .tmp 再 rename） */
async function writeIndex(catalog) {
  const json = JSON.stringify(catalog, null, 2) + '\n'
  const tmp = INDEX_PATH + '.tmp'
  await writeFile(tmp, json, 'utf-8')
  await rename(tmp, INDEX_PATH)
}

let running = false
async function run(reason) {
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

  await run('初始化')

  if (watchMode) {
    if (!existsSync(PLUGINS_DIR)) {
      warn(`--watch 模式下插件目录不存在: ${PLUGINS_DIR}，等待创建...`)
    }
    // 递归监听较复杂，这里监听 plugins/ 一层，配合 collectFiles 已够用
    let debounce
    const trigger = (label) => {
      clearTimeout(debounce)
      debounce = setTimeout(() => run(label), 300)
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
