import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import { electronResponseToReadable } from './DownloadService'

test('converts an Electron IncomingMessage event stream to a Node.js readable', async () => {
  const response = new EventEmitter() as Electron.IncomingMessage
  const stream = electronResponseToReadable(response)

  process.nextTick(() => {
    response.emit('data', Buffer.from('hello'))
    response.emit('data', Buffer.from(' world'))
    response.emit('end')
  })

  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))

  assert.equal(Buffer.concat(chunks).toString(), 'hello world')
})
