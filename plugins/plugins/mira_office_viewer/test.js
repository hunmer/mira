const assert = require('node:assert/strict')
const { init } = require('./dist/index.js')

let handler
const plugin = init({
  pluginManager: {
    registerFileFormat(_name, value) {
      handler = value
      return () => {}
    },
  },
})

assert.ok(handler)
for (const extension of ['docx', 'xlsx', 'pptx', 'pdf']) {
  const matching = handler.viewers.filter((viewer) => viewer.extensions?.includes(extension))
  assert.equal(matching.length, 1, `${extension} should match exactly one viewer`)
  assert.equal(matching[0].viewerId, `mira-office-${extension}`)
  assert.equal(matching[0].getQuery({ file: { name: `sample.${extension}` } }).format, extension)
}

plugin.cleanup()
console.log('mira_office_viewer format routing ok')
