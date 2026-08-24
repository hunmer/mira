import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeMediaTabFilters, resolveMediaTabItems } from './mediaTabRuntime.ts'

test('loaded empty tab keeps its own empty list instead of shared fallback items', () => {
  const sharedItems = [{ id: 1 }]

  assert.deepEqual(resolveMediaTabItems({ data: [], total: 0, lastUpdated: 1 }, sharedItems), [])
})

test('manual refresh keeps the restored folder tab filter', () => {
  assert.deepEqual(mergeMediaTabFilters({ folder: 42 }, {}), { folder: 42 })
})

test('manual refresh keeps the restored tag tab filter', () => {
  const tags = { id: 'tags', selectedValues: [7] }

  assert.deepEqual(mergeMediaTabFilters({ tags }, {}), { tags })
})
