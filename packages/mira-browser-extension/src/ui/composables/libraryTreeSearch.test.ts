// @vitest-environment jsdom
/**
 * LibraryTreeView 搜索交互回归测试(简单输入框:点搜索按钮展开,输入即过滤树)。
 *
 * 背景:旧版 Tags Input + Listbox 搜索已按需求移除,改为工具栏按钮切换搜索栏;
 * 本测试锁定新交互——搜索栏默认隐藏,展开后输入实时过滤,清空恢复全量。
 */
import { describe, it, expect } from 'vitest';
import { createApp, nextTick } from 'vue';

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

describe('LibraryTreeView 搜索(按钮切换 + 输入过滤)', () => {
  it('搜索栏默认隐藏;点按钮展开,输入即过滤树,清空恢复全量', async () => {
    const { host, app } = await mountView();
    const body = () => host.textContent ?? '';

    // 初始:无搜索输入框,树显示全部
    expect(host.querySelector('input')).toBeNull();
    expect(body()).toContain('摄影');

    // 点工具栏搜索按钮 → 搜索栏展开
    const searchBtn = host.querySelector('button[title^="搜索"]') as HTMLElement;
    expect(searchBtn).toBeTruthy();
    searchBtn.click();
    await nextTick();
    await new Promise(r => setTimeout(r, 20));
    const input = host.querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();

    // 输入「设」→ 只剩「设计」分支(含子级)
    input.value = '设';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    await new Promise(r => setTimeout(r, 20));
    expect(body()).toContain('设计素材');
    expect(body()).not.toContain('摄影');

    // 清空关键词 → 树恢复全量
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    await new Promise(r => setTimeout(r, 20));
    expect(body()).toContain('摄影');

    app.unmount();
    host.remove();
  });

  it('顶部「新增」打开 CreateNodeDialog,填名称提交后走 services.createNode', async () => {
    const created: { kind: string; title: string; parentId?: number }[] = [];
    const services = {
      listFolders: async () => items,
      listTags: async () => items,
      createNode: async (kind: string, _libId: string, title: string, parentId?: number) => {
        created.push({ kind, title, parentId });
        return 99;
      },
      deleteNode: async () => {},
    };
    const host = document.createElement('div');
    document.body.appendChild(host);
    const app = createApp(LibraryTreeView as any, { mode: 'folder', libraryId: 'lib1', services });
    app.mount(host);
    await new Promise(r => setTimeout(r, 20));
    await nextTick();

    // 点工具栏「新增」按钮 → 对话框打开(portal 渲染到 body)
    const addBtn = host.querySelector('button[title^="新建"]') as HTMLElement;
    expect(addBtn).toBeTruthy();
    addBtn.click();
    await nextTick();
    await new Promise(r => setTimeout(r, 50));
    const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('新建文件夹');

    // 填名称提交 → services.createNode 收到载荷
    const nameInput = dialog.querySelector('input[placeholder="文件夹名称"]') as HTMLInputElement;
    expect(nameInput).toBeTruthy();
    nameInput.value = '新文件夹';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    const submitBtn = [...dialog.querySelectorAll('button')].find(b => b.textContent?.trim() === '创建') as HTMLElement;
    submitBtn.click();
    await nextTick();
    await new Promise(r => setTimeout(r, 50));

    expect(created).toEqual([{ kind: 'folder', title: '新文件夹', parentId: undefined }]);

    app.unmount();
    host.remove();
    dialog.remove();
  });

  it('右键「新建子级」打开 CreateNodeDialog(未注入 dialog 也可用,菜单无删除项)', async () => {
    const created: { kind: string; title: string; parentId?: number }[] = [];
    const services = {
      listFolders: async () => items,
      listTags: async () => items,
      createNode: async (kind: string, _libId: string, title: string, parentId?: number) => {
        created.push({ kind, title, parentId });
        return 99;
      },
      deleteNode: async () => {},
    };
    const host = document.createElement('div');
    document.body.appendChild(host);
    // 不传 dialog:右键菜单仍可新建(内置 CreateNodeDialog),仅无「删除」项
    const app = createApp(LibraryTreeView as any, { mode: 'tag', libraryId: 'lib1', services });
    app.mount(host);
    await new Promise(r => setTimeout(r, 20));
    await nextTick();

    // 右键第一个节点(行 div 绑定 @contextmenu,li[role=treeitem] 为外层) → 菜单出现,无「删除」
    const row = host.querySelector('[role="treeitem"] > div') as HTMLElement;
    expect(row).toBeTruthy();
    row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
    await nextTick();
    await new Promise(r => setTimeout(r, 20));
    const menuEl = [...document.body.querySelectorAll('button')].find(b => b.textContent?.trim() === '新建同级');
    expect(menuEl).toBeTruthy();
    expect([...document.body.querySelectorAll('button')].some(b => b.textContent?.trim() === '删除')).toBe(false);

    // 点「新建子级」→ CreateNodeDialog 打开,父级预填右键节点
    ([...document.body.querySelectorAll('button')].find(b => b.textContent?.includes('新建子')) as HTMLElement).click();
    await nextTick();
    await new Promise(r => setTimeout(r, 50));
    const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('新建标签');
    expect(dialog.textContent).toContain('将创建到「设计」下');

    // 填名称提交 → parentId 为右键节点 id
    const nameInput = dialog.querySelector('input[placeholder="标签名称"]') as HTMLInputElement;
    nameInput.value = '新标签';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    ([...dialog.querySelectorAll('button')].find(b => b.textContent?.trim() === '创建') as HTMLElement).click();
    await nextTick();
    await new Promise(r => setTimeout(r, 50));

    expect(created).toEqual([{ kind: 'tag', title: '新标签', parentId: 1 }]);

    app.unmount();
    host.remove();
    dialog.remove();
  });
});
