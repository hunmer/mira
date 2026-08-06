const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

function loadCollectDroppedFiles(getPathForFile) {
  const source = fs.readFileSync(path.join(__dirname, 'floating-ball-window.js'), 'utf8')
  const context = {
    window: {
      addEventListener() {},
      electronAPI: { getPathForFile },
    },
    console,
    setTimeout,
    clearTimeout,
  }
  vm.createContext(context)
  vm.runInContext(source, context)
  return context.collectDroppedFiles
}

test('浏览器图片没有磁盘路径时保留 MIME 和字节', async () => {
  const collectDroppedFiles = loadCollectDroppedFiles(() => '')
  const bytes = Uint8Array.from([137, 80, 78, 71])
  const file = {
    name: 'browser-image.png',
    type: 'image/png',
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer,
  }

  const files = await collectDroppedFiles({ dataTransfer: { files: [file] } })

  assert.deepEqual(JSON.parse(JSON.stringify(files)), [{
    name: 'browser-image.png',
    path: '',
    isDir: false,
    size: 4,
    ext: 'png',
    mimeType: 'image/png',
    bytes: [137, 80, 78, 71],
  }])
})

test('本地文件已有磁盘路径时不复制字节', async () => {
  const collectDroppedFiles = loadCollectDroppedFiles(() => 'D:/images/local.png')
  let arrayBufferCalled = false
  const file = {
    name: 'local.png',
    type: 'image/png',
    size: 4,
    arrayBuffer: async () => {
      arrayBufferCalled = true
      return new ArrayBuffer(4)
    },
  }

  const files = await collectDroppedFiles({ dataTransfer: { files: [file] } })

  assert.equal(files[0].path, 'D:/images/local.png')
  assert.equal(files[0].mimeType, 'image/png')
  assert.equal('bytes' in files[0], false)
  assert.equal(arrayBufferCalled, false)
})
