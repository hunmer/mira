const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { init } = require('./dist/index.js')

let handler
let cleaned = false
const plugin = init({
  pluginManager: {
    registerFileFormat(name, value) {
      assert.equal(name, 'mira_html_format')
      handler = value
      return () => { cleaned = true }
    },
  },
})

assert.deepEqual(handler.extensions, ['html', 'htm'])
assert.deepEqual(handler.mimeTypes, ['text/html'])
assert.deepEqual(handler.viewers[0].getQuery({
  file: { name: 'demo.htm' },
  fileId: '42',
  fileUrl: 'http://127.0.0.1:8081/api/files/file/library/42?token=test',
}), {
  fileId: '42',
  fileName: 'demo.htm',
  fileUrl: 'http://127.0.0.1:8081/api/files/file/library/42?token=test',
})

const viewer = fs.readFileSync(path.join(__dirname, 'web', 'viewer.html'), 'utf8')
const webEntry = fs.readFileSync(path.join(__dirname, 'web', 'index.js'), 'utf8')
assert.match(viewer, /\^https\?:/)
assert.doesNotMatch(viewer, /file:\/\//i)
assert.match(viewer, /sandbox="allow-forms allow-scripts"/)
assert.doesNotMatch(viewer, /allow-same-origin/)
assert.match(viewer, /referrerpolicy="no-referrer"/)
assert.match(viewer, /safeBaseUrl\.search = ''/)
assert.match(webEntry, /extensions: \['html', 'htm'\]/)
assert.doesNotMatch(webEntry, /file:\/\//i)

plugin.cleanup()
assert.equal(cleaned, true)
console.log('mira_html_format HTTP viewer smoke test passed')
