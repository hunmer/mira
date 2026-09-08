import assert from 'node:assert/strict'
import test from 'node:test'
import { renameLocalFilePath } from './localFilePath.ts'

test('renaming a file keeps its Windows directory for locate-in-folder', () => {
  assert.equal(
    renameLocalFilePath('D:\\library\\images\\old-name.jpg', 'new-name.jpg'),
    'D:\\library\\images\\new-name.jpg',
  )
})

test('renaming a file keeps its POSIX or SMB-style directory', () => {
  assert.equal(
    renameLocalFilePath('/mnt/library/images/old-name.jpg', 'new-name.jpg'),
    '/mnt/library/images/new-name.jpg',
  )
})
