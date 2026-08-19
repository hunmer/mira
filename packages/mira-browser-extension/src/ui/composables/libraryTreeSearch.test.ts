// @vitest-environment jsdom
/**
 * LibraryTreeView 的 Tags Input + Listbox 搜索交互回归测试。
 *
 * 背景:pnpm/npm 双 node_modules 下,vite/vitest 按 importer 解析 'vue' 会得到
 * 两份 vue 实例,TagsInput 的 slot 渲染崩溃且被静默吞掉,表现为
 * 「选中候选后标签胶囊不出现」。本测试依赖 vitest.config 的 vue 统一 alias。
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createApp, nextTick } from 'vue';

// jsdom 缺 floating-ui 依赖的浏览器 API
beforeAll(() => {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  (globalThis as any).DOMRectReadOnly = class {
    x = 0; y = 0; top = 0; left = 0; bottom = 0; right = 0; width = 0; height = 0;
  };
});

// 经 vite 从源码加载(依赖从 mira-plugin-ui/node_modules 解析)
const { default: LibraryTreeView } = await import(
  '../../../../mira-plugin-ui/src/library/LibraryTreeView.vue'
) as { default: any };

const items = [
  { id: 1, title: '设计', parent_id: 0 },
  { id: 2, title: '设计素材', parent_id: 1 },
  { id: 3, title: '摄影', parent_id: 0 },
];
const services = {
  listFolders: async () => items,
  listTags: async () => items,
  createNode: async () => {},
  deleteNode: async () => {},
};

async function mountView() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const app = createApp(LibraryTreeView as any, { mode: 'tag', libraryId: 'lib1', services });
  app.mount(host);
  await new Promise(r => setTimeout(r, 20));
  await nextTick();
  return { host, app };
}

describe('LibraryTreeView Tags+Listbox 搜索', () => {
  it('输入过滤候选,点选后出现可删除的标签且树被过滤', async () => {
    const { host, app } = await mountView();

    // 输入搜索词 → 候选下拉按词过滤
    const input = host.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
    input.value = '设';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    await new Promise(r => setTimeout(r, 20));

    const options = document.querySelectorAll('[role="option"]');
    expect([...options].map(o => o.textContent?.trim())).toEqual(['设计', '设计素材']);

    // 点选候选 → 标签胶囊出现(带删除按钮的 TagsInputItem)
    (options[0] as HTMLElement).click();
    await nextTick();
    await new Promise(r => setTimeout(r, 20));

    const tagItem = host.querySelector('[data-reka-collection-item]');
    expect(tagItem?.textContent?.trim()).toBe('设计');
    expect(tagItem?.querySelector('button'), '标签上应有删除按钮').toBeTruthy();

    // 树按关键词过滤:只剩「设计」分支(含子级)
    const body = host.textContent ?? '';
    expect(body).toContain('设计素材');
    expect(body).not.toContain('摄影');

    app.unmount();
    host.remove();
  });
});
