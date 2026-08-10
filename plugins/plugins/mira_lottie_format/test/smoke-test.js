const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const yazl = require('yazl')
const { init } = require('../dist')

const animation = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 128,
  h: 128,
  nm: 'smoke',
  ddd: 0,
  assets: [],
  layers: [{
    ddd: 0,
    ind: 1,
    ty: 1,
    nm: 'solid',
    sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [64, 64, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] },
    },
    ao: 0,
    sw: 80,
    sh: 80,
    sc: '#1ab37a',
    ip: 0,
    op: 60,
    st: 0,
    bm: 0,
  }],
}

async function writeFixture(filePath) {
  const zip = new yazl.ZipFile()
  zip.addBuffer(Buffer.from(JSON.stringify({
    version: '1.0',
    author: 'Mira smoke test',
    animations: [{ id: 'main', loop: true, autoplay: true }],
  })), 'manifest.json')
  zip.addBuffer(Buffer.from(JSON.stringify(animation)), 'animations/main.json')
  zip.end()
  await new Promise((resolve, reject) => {
    zip.outputStream.pipe(fs.createWriteStream(filePath)).on('close', resolve).on('error', reject)
  })
}

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-lottie-'))
  const source = path.join(root, 'sample.lottie')
  const thumbnail = path.join(root, 'thumbnail.png')
  let handler
  const plugin = init({
    pluginManager: {
      registerFileFormat(_name, value) {
        handler = value
        return () => undefined
      },
    },
  })

  try {
    await writeFixture(source)
    const result = await handler.process(source, { source: 'smoke' })
    assert.equal(result.format, 'lottie')
    assert.equal(result.animationCount, 1)
    assert.equal(result.width, 128)
    assert.equal(result.height, 128)
    assert.equal(result.frameRate, 30)
    assert.equal(result.duration, 2)
    assert.equal(result.source, 'smoke')

    await handler.thumbnail(source, thumbnail)
    const png = fs.readFileSync(thumbnail)
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
    assert.ok(png.length > 100)
    console.log('dotLottie smoke test passed')
  } finally {
    plugin.cleanup()
    fs.rmSync(root, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
