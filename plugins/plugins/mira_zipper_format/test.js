const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const sharp = require('sharp')
const { init } = require('./dist/index.js')

// ---- 最小 STORE 方法 ZIP 构造器（无压缩），仿 mira_epub_format/test.js ----
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})

function crc32(buffer) {
  let value = 0xffffffff
  for (const byte of buffer) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8)
  return (value ^ 0xffffffff) >>> 0
}

function makeZip(entries) {
  const localParts = []
  const centralParts = []
  let offset = 0
  for (const [fileName, content] of entries) {
    const name = Buffer.from(fileName)
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content)
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    localParts.push(local, name, data)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    centralParts.push(central, name)
    offset += local.length + name.length + data.length
  }
  const central = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(central.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...localParts, central, end])
}

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

async function main() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-zipper-test-'))
  const dataPath = path.join(temp, 'temp', 'zipper') // 自定义缓存目录
  await fs.promises.mkdir(dataPath, { recursive: true })
  const source = path.join(temp, 'sample.zip')
  const thumbnail = path.join(temp, 'thumbnail.png')

  fs.writeFileSync(
    source,
    makeZip([
      ['cover.png', PNG_1x1],
      ['notes.txt', 'hello zipper'],
      ['data/sub.txt', 'nested'],
      ['empty/', ''],
    ]),
  )

  let handler
  init({
    pluginManager: {
      registerFileFormat(_name, value) {
        handler = value
        return () => {}
      },
    },
    server: { backend: { dataPath: temp } },
  })
  assert(handler, 'handler should be registered')

  // process
  const result = await handler.process(source)
  assert.strictEqual(result.format, 'zip')
  assert.strictEqual(result.entryCount, 3) // 3 文件（empty/ 是目录）
  assert.deepStrictEqual(result.topDirs, ['data'])

  // getExtraFileList
  const list = await handler.getExtraFileList(source)
  assert.ok(list.includes('__index.json'))
  assert.ok(list.includes('cover.png'))
  assert.ok(list.includes('notes.txt'))
  assert.ok(list.includes('data/sub.txt'))

  // getExtraFile: index
  const indexPath = await handler.getExtraFile(source, '__index.json')
  const indexJson = JSON.parse(await fs.promises.readFile(indexPath, 'utf8'))
  assert.strictEqual(indexJson.format, 'zip')
  assert.ok(Array.isArray(indexJson.entries))

  // getExtraFile: entry
  const notesPath = await handler.getExtraFile(source, 'notes.txt')
  assert.strictEqual(await fs.promises.readFile(notesPath, 'utf8'), 'hello zipper')

  // 拒绝未知条目
  await assert.rejects(() => handler.getExtraFile(source, 'does-not-exist.txt'), /Unknown ZIP entry/)

  // 拒绝路径穿越
  await assert.rejects(() => handler.getExtraFile(source, '../escape.txt'), /Unknown ZIP entry|escapes|Invalid ZIP entry/)

  // thumbnail
  await handler.thumbnail(source, thumbnail)
  const meta = await sharp(thumbnail).metadata()
  assert.ok(meta.width > 0 && meta.width <= 512 && meta.height > 0 && meta.height <= 512)
  assert.strictEqual(meta.format, 'png')

  fs.rmSync(temp, { recursive: true, force: true })
  console.log('Zipper handler behavior check passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
