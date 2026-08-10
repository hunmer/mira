const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile: execFileCallback } = require('child_process')
const { promisify } = require('util')
const { init, testables } = require('./dist/index.js')
const execFile = promisify(execFileCallback)

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-swf-'))
  try {
    for (const [signature, compression] of Object.entries({ FWS: 'none', CWS: 'zlib', ZWS: 'lzma' })) {
      const file = path.join(root, `${signature}.swf`)
      const header = Buffer.alloc(8)
      header.write(signature, 0, 'ascii')
      header[3] = 32
      header.writeUInt32LE(1234, 4)
      fs.writeFileSync(file, header)
      assert.deepStrictEqual(await testables.readSwfHeader(file), {
        signature,
        compression,
        version: 32,
        declaredSize: 1234,
      })
    }
    const invalid = path.join(root, 'invalid.swf')
    fs.writeFileSync(invalid, Buffer.from('NOTASWF!'))
    await assert.rejects(() => testables.readSwfHeader(invalid), /Invalid SWF signature/)
    await execFile(process.env.FFMPEG_PATH || 'ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=64x64:d=0.2',
      '-c:v', 'flv1', '-f', 'swf', path.join(root, 'fixture.swf'),
    ], { windowsHide: true })
    let handler
    let cleaned = false
    const plugin = init({
      pluginManager: {
        registerFileFormat(name, value) {
          assert.strictEqual(name, 'mira_swf_format')
          handler = value
          return () => { cleaned = true }
        },
      },
    })
    const result = await handler.process(path.join(root, 'FWS.swf'), { trace: 'ok' })
    assert.strictEqual(result.format, 'swf')
    assert.strictEqual(result.trace, 'ok')
    assert.deepStrictEqual(handler.thumbnailExtensions, ['swf'])
    const thumbnailPath = path.join(root, 'thumbnail.png')
    await handler.thumbnail(path.join(root, 'fixture.swf'), thumbnailPath)
    assert.ok(fs.statSync(thumbnailPath).size > 0, 'FFmpeg thumbnail was not generated')
    assert.deepStrictEqual(handler.viewers[0].getQuery({
      file: { name: 'demo.swf' },
      fileId: '42',
      fileUrl: 'http://localhost/file.swf?token=test',
    }), {
      fileUrl: 'http://localhost/file.swf?token=test',
      fileName: 'demo.swf',
      fileId: '42',
    })
    plugin.cleanup()
    assert.strictEqual(cleaned, true)

    const web = path.join(__dirname, 'web')
    for (const file of ['plugin.json', 'index.js', 'viewer.html', 'viewer.css', 'viewer.js', 'ruffle/ruffle.js', 'ruffle/core.ruffle.8c842c23c2ad9a8c3dcf.js', 'ruffle/d9a60362ac697cfa191f.wasm']) {
      assert.ok(fs.statSync(path.join(web, file)).size > 0, `Missing Web asset: ${file}`)
    }
    const ownBrowserCode = ['index.js', 'viewer.js'].map((file) => fs.readFileSync(path.join(web, file), 'utf8')).join('\n')
    assert.ok(!/\beagle\.|\bi18next\b|\bmodule\.exports\b|\b__dirname\b/.test(ownBrowserCode), 'Browser entry contains an unsupported Eagle/CommonJS global')
    console.log('SWF plugin smoke test passed')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
