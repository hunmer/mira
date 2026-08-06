import { describe, it, expect } from 'vitest';
import {
  buildTree,
  filterTree,
  flattenTree,
  collectIds,
} from './useLibraryTree';
import type { LibraryTreeNode } from '@/shared/types';

// 构造一棵小树:A(根) → B,C; B → D
const sample = [
  { id: 1, title: 'A', parent_id: 0 },
  { id: 2, title: 'B', parent_id: 1 },
  { id: 3, title: 'C', parent_id: 1 },
  { id: 4, title: 'D', parent_id: 2 },
];

describe('buildTree', () => {
  it('按 parent_id 组装层级,根 parent_id=0 / undefined 均挂到顶层', () => {
    const tree = buildTree([
      { id: 1, title: 'A', parent_id: 0 },
      { id: 2, title: 'X', parent_id: undefined },
    ]);
    expect(tree.map(n => n.id).sort()).toEqual([1, 2]);
    expect(tree.every(n => n.level === 0)).toBe(true);
  });

  it('正确建立父子关系并递归 level', () => {
    const tree = buildTree(sample);
    expect(tree).toHaveLength(1);
    const a = tree[0];
    expect(a.id).toBe(1);
    expect(a.level).toBe(0);
    expect(a.children.map(c => c.id).sort()).toEqual([2, 3]);
    const b = a.children.find(c => c.id === 2)!;
    expect(b.level).toBe(1);
    expect(b.children.map(c => c.id)).toEqual([4]);
    expect(b.children[0].level).toBe(2);
  });

  it('同层按 title 排序(中文)', () => {
    const tree = buildTree([
      { id: 1, title: '香蕉', parent_id: 0 },
      { id: 2, title: '苹果', parent_id: 0 },
      { id: 3, title: '橙子', parent_id: 0 },
    ]);
    expect(tree.map(n => n.title)).toEqual(['橙子', '苹果', '香蕉']);
  });

  it('孤儿节点(parent 指向不存在的 id)回挂到根,不被吞掉', () => {
    const tree = buildTree([
      { id: 1, title: 'A', parent_id: 0 },
      { id: 2, title: '孤儿', parent_id: 999 }, // 999 不存在
    ]);
    // A 和 孤儿 都在顶层
    expect(tree.map(n => n.id).sort()).toEqual([1, 2]);
  });

  it('parent 指向自己时回挂到根,避免无限递归', () => {
    const tree = buildTree([{ id: 1, title: '自环', parent_id: 1 }]);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe(1);
    expect(tree[0].children).toHaveLength(0);
  });

  it('空数组返回空树', () => {
    expect(buildTree([])).toEqual([]);
  });
});

describe('filterTree', () => {
  it('无 query 时原样返回,无匹配集合', () => {
    const tree = buildTree(sample);
    const { tree: out, matched } = filterTree(tree, '');
    expect(out).toBe(tree);
    expect(matched.size).toBe(0);
  });

  it('命中叶子节点时保留其祖先链', () => {
    const tree = buildTree(sample);
    const { tree: out, matched } = filterTree(tree, 'D');
    // A → B → D 链路保留,C 被裁掉
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(1); // A
    expect(out[0].children).toHaveLength(1);
    expect(out[0].children[0].id).toBe(2); // B
    expect(out[0].children[0].children[0].id).toBe(4); // D
    expect(matched.has(4)).toBe(true);
    expect(matched.has(1)).toBe(false); // 祖先不在 matched,只是被保留
  });

  it('大小写不敏感,匹配中间子串', () => {
    const tree = buildTree([{ id: 1, title: 'HelloWorld', parent_id: 0 }]);
    const { matched } = filterTree(tree, 'WORLD');
    expect(matched.has(1)).toBe(true);
  });

  it('无匹配返回空树', () => {
    const tree = buildTree(sample);
    const { tree: out, matched } = filterTree(tree, '不存在的名字');
    expect(out).toEqual([]);
    expect(matched.size).toBe(0);
  });
});

describe('flattenTree', () => {
  it('深度优先打平', () => {
    const tree = buildTree(sample);
    expect(flattenTree(tree).map(n => n.id)).toEqual([1, 2, 4, 3]);
  });
  it('空树返回空数组', () => {
    expect(flattenTree([])).toEqual([]);
  });
});

describe('collectIds', () => {
  it('收集整棵子树所有 id(含根)', () => {
    const tree = buildTree(sample);
    const ids = collectIds(tree);
    expect([...ids].sort()).toEqual([1, 2, 3, 4]);
  });

  it('对子树生效', () => {
    const tree = buildTree(sample);
    const bSubtree: LibraryTreeNode[] = tree[0].children.filter(n => n.id === 2);
    expect([...collectIds(bSubtree)].sort()).toEqual([2, 4]);
  });
});
