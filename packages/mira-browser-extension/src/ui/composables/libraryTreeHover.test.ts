// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createApp, nextTick } from 'vue';

const { default: LibraryTree } = await import(
  '../../../../mira-plugin-ui/src/library/LibraryTree.vue'
) as { default: any };

const nodes = [
  {
    id: 1,
    title: '一级',
    parentId: 0,
    level: 0,
    children: [
      {
        id: 2,
        title: '二级',
        parentId: 1,
        level: 1,
        children: [
          { id: 3, title: '三级', parentId: 2, level: 2, children: [] },
        ],
      },
    ],
  },
];

function hoverPath(tree: Element): SVGPathElement {
  const paths = tree.querySelectorAll(':scope > li[aria-hidden] svg > path');
  return paths[paths.length - 2] as SVGPathElement;
}

function firstBranchPath(tree: Element): SVGPathElement {
  return tree.querySelectorAll(':scope > li[aria-hidden] svg > path')[1] as SVGPathElement;
}

describe('LibraryTree 连接线 hover 路径', () => {
  it('进入第三层节点时保持祖先分支连续高亮', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const app = createApp(LibraryTree as any, {
      nodes,
      expanded: new Set([1, 2]),
      root: true,
    });
    app.mount(host);
    await nextTick();

    const trees = host.querySelectorAll('ul[role="tree"]');
    const rootItem = trees[0].querySelector(':scope > li[role="treeitem"]') as HTMLElement;
    const secondItem = trees[1].querySelector(':scope > li[role="treeitem"]') as HTMLElement;
    const thirdItem = trees[2].querySelector(':scope > li[role="treeitem"]') as HTMLElement;

    rootItem.dispatchEvent(new MouseEvent('mouseenter'));
    (rootItem.firstElementChild as HTMLElement).dispatchEvent(new MouseEvent('mouseleave'));
    secondItem.dispatchEvent(new MouseEvent('mouseenter'));
    (secondItem.firstElementChild as HTMLElement).dispatchEvent(new MouseEvent('mouseleave'));
    thirdItem.dispatchEvent(new MouseEvent('mouseenter'));
    await new Promise(resolve => setTimeout(resolve, 140));
    await nextTick();

    expect(hoverPath(trees[1]).getAttribute('stroke-dashoffset')).toBe('0');
    expect(hoverPath(trees[2]).getAttribute('stroke-dashoffset')).toBe('0');
    expect(firstBranchPath(trees[1]).getAttribute('d')).toMatch(/L 19 14$/);
    expect(firstBranchPath(trees[2]).getAttribute('d')).toMatch(/L 39 14$/);

    app.unmount();
    host.remove();
  });
});
