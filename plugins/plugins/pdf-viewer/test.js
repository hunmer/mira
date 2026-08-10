const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { init } = require('./dist/index.js')

let handler
let cleaned = false
const plugin = init({
  pluginManager: {
    registerFileFormat(name, value) {
      assert.strictEqual(name, 'pdf-viewer')
      handler = value
      return () => { cleaned = true }
    },
  },
})

assert.deepStrictEqual(handler.extensions, ['pdf'])
assert.deepStrictEqual(handler.mimeTypes, ['application/pdf'])
assert.deepStrictEqual(handler.viewers[0].getQuery({
  file: { name: 'demo.pdf' },
  fileId: '42',
  fileUrl: 'http://localhost/demo.pdf?token=test',
}), {
  fileId: '42',
  pdfUrl: 'http://localhost/demo.pdf?token=test',
  fileName: 'demo.pdf',
})
assert.ok(fs.statSync(path.join(__dirname, 'web', 'viewer.html')).size > 0)
plugin.cleanup()
assert.strictEqual(cleaned, true)
console.log('PDF viewer smoke test passed')
