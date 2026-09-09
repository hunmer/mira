const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { init } = require('./dist/index.js')

let handler
let cleaned = false
const plugin = init({
  pluginManager: {
    registerFileFormat(name, value) {
      assert.equal(name, 'mira_font_format')
      handler = value
      return () => { cleaned = true }
    },
  },
})

assert.deepEqual(handler.extensions, ['ttf', 'otf', 'woff', 'woff2', 'ttc'])
assert.deepEqual(handler.thumbnailExtensions, handler.extensions)
assert.equal(handler.viewers[0].entry, 'viewer.html')
assert.deepEqual(handler.viewers[0].getQuery({
  file: { name: 'Demo.woff2', extension: 'woff2' },
  fileId: '42',
  fileUrl: 'http://127.0.0.1:8081/api/files/file/library/42?token=test',
}), {
  fileId: '42',
  fileName: 'Demo.woff2',
  format: 'WOFF2',
  fileUrl: 'http://127.0.0.1:8081/api/files/file/library/42?token=test',
})

const viewer = fs.readFileSync(path.join(__dirname, 'web', 'viewer.html'), 'utf8')
const webEntry = fs.readFileSync(path.join(__dirname, 'web', 'index.js'), 'utf8')
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'web', 'plugin.json'), 'utf8'))
assert.match(webEntry, new RegExp(manifest.pluginId))
assert.doesNotMatch(viewer + webEntry, /file:\/\//i)
assert.match(viewer, /new FontFace\('MiraFontPreview'/)
assert.match(viewer, /response\.arrayBuffer\(\)/)
assert.match(viewer, /credentials: 'same-origin'/)
assert.match(viewer, /name="referrer" content="no-referrer"/)

const candidates = [
  'C:/Windows/Fonts/arial.ttf',
  'C:/Windows/Fonts/segoeui.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/System/Library/Fonts/Supplemental/Arial.ttf',
]
const sampleFont = candidates.find((candidate) => fs.existsSync(candidate))

async function run() {
  if (sampleFont) {
    const metadata = await handler.process(sampleFont)
    assert.equal(metadata.format, 'ttf')
    assert.ok(metadata.glyphCount > 0)
    assert.ok(metadata.familyName)
    const output = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mira-font-format-')), 'thumbnail.png')
    await handler.thumbnail(sampleFont, output)
    const signature = fs.readFileSync(output).subarray(0, 8).toString('hex')
    assert.equal(signature, '89504e470d0a1a0a')
  } else {
    console.warn('No system TTF found; skipped real font thumbnail check')
  }
  plugin.cleanup()
  assert.equal(cleaned, true)
  console.log('mira_font_format smoke test passed')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
