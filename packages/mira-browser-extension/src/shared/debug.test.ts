import { describe, expect, it } from 'vitest';
import { debugCategoryForTag } from './debug';

describe('debugCategoryForTag', () => {
  it('将拖拽和注入日志归到同一分类', () => {
    expect(debugCategoryForTag('dragdrop')).toBe('drag');
    expect(debugCategoryForTag('inject')).toBe('drag');
    expect(debugCategoryForTag('import-dialog')).toBe('drag');
  });

  it('区分采集与传输日志', () => {
    expect(debugCategoryForTag('sniffer')).toBe('sniffer');
    expect(debugCategoryForTag('capture')).toBe('capture');
    expect(debugCategoryForTag('upload')).toBe('transfer');
    expect(debugCategoryForTag('download')).toBe('transfer');
    expect(debugCategoryForTag('imu')).toBe('image');
  });

  it('未知 tag 默认归到界面与连接', () => {
    expect(debugCategoryForTag('new-module')).toBe('app');
  });
});
