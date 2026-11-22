import assert from 'node:assert/strict'
import test from 'node:test'
import { collectFolderIds, collectFolderMoveRoots, getFolderCheckState, toggleFolderSelection } from './folderMoveSelection.ts'

const tree = [
  { id: 'a', children: [{ id: 'a1' }, { id: 'a2', children: [{ id: 'a21' }] }] },
  { id: 'b' },
]

test('default all selection moves only top-level branches, retaining hierarchy', () => {
  const selected = new Set(collectFolderIds(tree))
  assert.equal(selected.size, 5)
  assert.equal(getFolderCheckState(tree[0], selected), true)
  assert.deepEqual(collectFolderMoveRoots(tree, selected), ['a', 'b'])
})

test('unchecking a descendant clears ancestor selection and keeps other branches', () => {
  const all = new Set(collectFolderIds(tree))
  const selected = toggleFolderSelection(tree, all, 'a21', false)
  assert.equal(getFolderCheckState(tree[0], selected), 'indeterminate')
  assert.equal(selected.has('a'), false)
  assert.equal(selected.has('a2'), false)
  assert.deepEqual(collectFolderMoveRoots(tree, selected), ['a1', 'b'])
  assert.equal(all.size, 5, 'must not mutate the previous selection')
})

test('checking a descendant restores complete ancestor selection', () => {
  let selected = toggleFolderSelection(tree, new Set(collectFolderIds(tree)), 'a21', false)
  selected = toggleFolderSelection(tree, selected, 'a21', true)
  assert.equal(getFolderCheckState(tree[0], selected), true)
  assert.deepEqual(collectFolderMoveRoots(tree, selected), ['a', 'b'])
})

test('checking or unchecking a parent updates its whole subtree', () => {
  const selected = toggleFolderSelection(tree, new Set(), 'a', true)
  assert.deepEqual([...selected], ['a', 'a1', 'a2', 'a21'])
  assert.deepEqual(collectFolderMoveRoots(tree, selected), ['a'])
  const cleared = toggleFolderSelection(tree, selected, 'a', false)
  assert.equal(getFolderCheckState(tree[0], cleared), false)
  assert.deepEqual(collectFolderMoveRoots(tree, cleared), [])
})

test('a nested branch can be migrated without moving its parent', () => {
  const selected = toggleFolderSelection(tree, new Set(), 'a2', true)
  assert.deepEqual(collectFolderMoveRoots(tree, selected), ['a2'])
  assert.deepEqual(collectFolderMoveRoots([], selected), [])
})
