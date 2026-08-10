const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const sharp = require('sharp')
const { init } = require('./dist/index.js')

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

async function main() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-epub-test-'))
  const source = path.join(temp, 'sample.epub')
  const thumbnail = path.join(temp, 'thumbnail.png')
  const cover = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
  const container = '<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'
  const opf = '<?xml version="1.0"?><package xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>Test Book</dc:title><dc:creator>Test Author</dc:creator></metadata><manifest><item id="cover" href="cover.png" media-type="image/png" properties="cover-image"/></manifest></package>'
  fs.writeFileSync(source, makeZip([
    ['mimetype', 'application/epub+zip'],
    ['META-INF/container.xml', container],
    ['OEBPS/content.opf', opf],
    ['OEBPS/cover.png', cover],
  ]))

  let handler
  init({ pluginManager: { registerFileFormat(_name, value) { handler = value; return () => {} } } })
  assert(handler)
  const result = await handler.process(source)
  assert.deepStrictEqual({ title: result.title, author: result.author, hasCover: result.hasCover }, { title: 'Test Book', author: 'Test Author', hasCover: true })
  assert.deepStrictEqual(await handler.getExtraFileList(source), ['book.epub'])
  assert.strictEqual(await handler.getExtraFile(source, 'book.epub'), source)
  await handler.thumbnail(source, thumbnail)
  const metadata = await sharp(thumbnail).metadata()
  assert(metadata.width > 0 && metadata.width <= 512 && metadata.height > 0 && metadata.height <= 512)
  fs.rmSync(temp, { recursive: true, force: true })
  console.log('EPUB handler behavior check passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
