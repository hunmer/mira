import assert from 'node:assert/strict'
import test from 'node:test'
import { hydrateRestoredSplitTabs } from './splitPaneRestore.ts'

test('restored split panes load pending folder and tag tabs', async () => {
  const tabs = [
    { id: 'folder-42', type: 'folder', needUpdate: true },
    { id: 'tag-7', type: 'tag', needUpdate: true },
    { id: 'all', type: 'all', needUpdate: false },
  ]
  const configured: string[] = []
  const loaded: string[] = []

  await hydrateRestoredSplitTabs(
    tabs,
    new Set(['all']),
    async tab => { configured.push(tab.id) },
    async tab => { loaded.push(tab.id) },
  )

  assert.deepEqual(configured, ['folder-42', 'tag-7'])
  assert.deepEqual(loaded, ['folder-42', 'tag-7'])
  assert.equal(tabs[0].needUpdate, false)
  assert.equal(tabs[1].needUpdate, false)
})
