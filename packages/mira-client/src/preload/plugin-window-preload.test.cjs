const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

async function main() {
  const source = fs.readFileSync(path.join(__dirname, 'plugin-window-preload.js'), 'utf8')
  const listeners = new Map()
  const invokes = []
  const media = encodeURIComponent(JSON.stringify([{ id: '1', name: 'a.png', ext: 'png', thumbnailURL: 'https://example.com/a.png' }]))
  const sandbox = {
    Buffer,
    process: { argv: [], arch: 'x64', platform: 'win32' },
    Uint8Array,
    URLSearchParams,
    console,
    queueMicrotask,
    setTimeout,
    clearTimeout,
    location: { search: `?media=${encodeURIComponent(media)}` },
    document: {
      readyState: 'loading',
      addEventListener: (name, callback) => listeners.set(name, callback),
    },
    window: {},
  }
  const ipcRenderer = {
    invoke: (channel, ...args) => {
      invokes.push([channel, ...args])
      return Promise.resolve(true)
    },
    send: () => {},
    sendSync: (channel) => {
      if (channel === 'plugin-window:mira-app-info') {
        return { version: '1.0.0', locale: 'zh_CN', arch: 'x64', platform: 'win32', theme: 'LIGHT', isDark: false }
      }
      if (channel === 'plugin-window:mira-clipboard') {
        return { size: { width: 2, height: 3 }, png: new Uint8Array([1]), jpeg: new Uint8Array([2]) }
      }
      return null
    },
    on: () => {},
    removeListener: () => {},
  }
  sandbox.require = (name) => {
    assert.equal(name, 'electron')
    return {
      ipcRenderer,
      contextBridge: {
        exposeInMainWorld: (name, value) => { sandbox.window[name] = value },
        executeInMainWorld: ({ func }) => func.call(sandbox.window),
      },
    }
  }

  vm.runInNewContext(source, sandbox, { filename: 'plugin-window-preload.js' })

  const mira = sandbox.window.mira
  assert.ok(mira, 'preload should expose window.mira')
  const eagle = sandbox.window.eagle
  assert.ok(eagle, 'preload should expose window.eagle')
  assert.equal(eagle.app.platform, 'win32')
  assert.equal(JSON.stringify(await eagle.item.getSelected()), JSON.stringify([{ id: '1', name: 'a.png', ext: 'png', thumbnailURL: 'https://example.com/a.png' }]))

  const order = []
  eagle.onPluginCreate(() => order.push('create'))
  eagle.onPluginRun(() => order.push('run'))
  assert.deepEqual(order, [], 'Eagle lifecycle must not run during module initialization')
  listeners.get('DOMContentLoaded')()
  await new Promise((resolve) => setTimeout(resolve, 5))
  assert.deepEqual(order, ['create', 'run'])

  await eagle.window.setAlwaysOnTop(true)
  assert.deepEqual(invokes.at(-1), ['plugin-window:mira-window', 'setAlwaysOnTop', true])
  const image = eagle.clipboard.readImage()
  assert.deepEqual(image.getSize(), { width: 2, height: 3 })
  assert.deepEqual([...image.toJPEG(100)], [2])
  console.log('plugin-window Eagle compatibility: ok')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
