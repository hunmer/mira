import { describe, it, expect } from 'vitest';
// no path alias
import { isRequest, isContentCommand, isEvent } from './messages';

describe('messages 类型守卫', () => {
  it('isRequest 识别合法 Request', () => {
    expect(isRequest({ type: 'AUTH_VERIFY' })).toBe(true);
    expect(isRequest({ type: 'LIB_LIST' })).toBe(true);
    expect(isRequest({
      type: 'UPLOAD_FILES',
      payload: { files: [], libraryId: 'lib1' },
    })).toBe(true);
  });

  it('isRequest 识别多服务器 Request', () => {
    expect(isRequest({ type: 'SERVERS_LIST' })).toBe(true);
    expect(isRequest({ type: 'SERVERS_SAVE', payload: { servers: [] } })).toBe(true);
    expect(isRequest({ type: 'SERVER_ACTIVATE', payload: { id: 's1' } })).toBe(true);
    expect(isRequest({
      type: 'SERVER_TEST',
      payload: { serverURL: 'http://x', username: 'u', password: 'p' },
    })).toBe(true);
  });

  it('isRequest 识别文件夹/标签 CRUD Request', () => {
    expect(isRequest({
      type: 'NODE_CREATE',
      payload: { kind: 'folder', libraryId: 'lib1', title: 'x', parentId: 0 },
    })).toBe(true);
    expect(isRequest({
      type: 'NODE_DELETE',
      payload: { kind: 'tag', libraryId: 'lib1', id: 5 },
    })).toBe(true);
  });

  it('isRequest 拒绝未知 type', () => {
    expect(isRequest({ type: 'UNKNOWN' })).toBe(false);
    expect(isRequest(null)).toBe(false);
  });

  it('isContentCommand 识别合法 ContentCommand', () => {
    expect(isContentCommand({ type: 'SNIFFER_START', payload: { kinds: ['image'] } })).toBe(true);
    expect(isContentCommand({ type: 'DRAW_SELECTION' })).toBe(true);
  });

  it('isContentCommand 拒绝 Request', () => {
    expect(isContentCommand({ type: 'AUTH_VERIFY' })).toBe(false);
  });

  it('isEvent 识别合法 Event', () => {
    expect(isEvent({ type: 'AUTH_EXPIRED' })).toBe(true);
    expect(isEvent({
      type: 'UPLOAD_PROGRESS',
      payload: { id: 't1', percent: 50, status: 'uploading' },
    })).toBe(true);
  });
});
