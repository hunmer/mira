const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const manifest = require('./plugin.json')
const registrations = { contributions: [], menus: [] }
const window = {
  pluginSystem: {
    registerPluginInstance(id, factory) { registrations.id = id; registrations.factory = factory },
    contributions: { register(value) { registrations.contributions.push(value) }, unregister() {} },
  },
  electronAPI: { pluginWindow: { send: async () => ({ delivered: false }) } },
}
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8'), { window, Set, JSON, setTimeout, console })
assert.equal(registrations.id, manifest.pluginId)

async function run() {
  const opened = []
  const instance = await registrations.factory({ api: {
    log: { info() {} },
    media: { registerContextMenu(value) { registrations.menus.push(value); return () => {} } },
    window: { openPluginWindow(value) { opened.push(value); return Promise.resolve({ success: true }) } },
  } })
  assert.equal(registrations.contributions.length, 1)
  assert.equal(registrations.menus.length, 1)
  await registrations.menus[0].onSelect([{ name: 'Demo.ttf', localFile: 'C:\\Fonts\\Demo.ttf' }, { name: 'photo.jpg' }])
  assert.equal(opened.length, 1)
  const media = JSON.parse(decodeURIComponent(opened[0].query.media))
  assert.equal(media.length, 1)
  assert.equal(media[0].name, 'Demo.ttf')
  const html = fs.readFileSync(path.join(__dirname, 'dist', 'index.html'), 'utf8')
  assert.match(html, /mira\.font\.activate/)
  assert.match(html, /mira\.font\.applyToAdobe/)
  assert.doesNotMatch(html, /plugin-exec:run|child_process|require\(/)
  await instance.cleanup()
  console.log('mira-font-actions smoke test passed')
}

run().catch((error) => { console.error(error); process.exitCode = 1 })
