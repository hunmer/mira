/**
 * 骨骼树递归行（render 函数实现，支持自引用）。
 *
 * 从 SpinePanels.jsx 的 BoneRow 移植，删除选中高亮，保留展开/折叠 + Eye/EyeOff 显隐。
 * 不用模板是因为 Vue 模板的递归需要组件 name 自引用且与 <script setup> 默认导出冲突，
 * render 函数更直接。
 */
import { defineComponent, h } from 'vue'
import type { Component } from 'vue'
import { ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-vue-next'
import type { BoneNode, BoneVisibility } from '@/spine/loader'
import { useI18n } from '@/lib/i18n'

const BoneRow: Component = defineComponent({
  name: 'BoneRow',
  props: {
    node: { type: Object as () => BoneNode, required: true },
    expanded: { type: Object as () => Set<string>, required: true },
    visibility: { type: Object as () => BoneVisibility, required: true },
    revision: { type: Number, default: 0 },
  },
  emits: ['toggle-expanded', 'toggle-visibility'],
  setup(props, { emit }) {
    const { t } = useI18n()
    return () => {
      const node = props.node as BoneNode
      const name = node.bone.data.name
      const hasChildren = node.children.length > 0
      const isExpanded = (props.expanded as Set<string>).has(name)
      // revision 作为依赖触发重渲染（显隐切换后父组件自增）
      void props.revision
      const hidden = (props.visibility as BoneVisibility).isHidden(node.bone)

      const children: any[] = [
        h(
          'button',
          {
            type: 'button',
            disabled: !hasChildren,
            class:
              'flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30',
            onClick: () => emit('toggle-expanded', name),
          },
          hasChildren ? [h(isExpanded ? ChevronDown : ChevronRight, { class: 'size-3' })] : [],
        ),
        h(
          'span',
          {
            class:
              'min-w-0 flex-1 truncate px-1 text-[11px] leading-tight ' +
              (hidden ? 'text-muted-foreground/50 line-through' : ''),
            title: name,
          },
          name,
        ),
        h(
          'button',
          {
            type: 'button',
            title: hidden ? t('app.show') : t('app.hide'),
            class: 'flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted',
            onClick: () => emit('toggle-visibility', node.bone),
          },
          [h(hidden ? EyeOff : Eye, { class: 'size-3.5' })],
        ),
      ]

      const row = h(
        'div',
        {
          'data-bone-name': name,
          class: 'flex items-center rounded px-1 py-0.5 hover:bg-muted',
          style: { paddingLeft: `${node.depth * 12 + 4}px` },
        },
        children,
      )

      const out: any[] = [row]
      if (hasChildren && isExpanded) {
        for (const child of node.children) {
          out.push(
            h(BoneRow, {
              key: child.bone.data.name,
              node: child,
              expanded: props.expanded,
              visibility: props.visibility,
              revision: props.revision,
              onToggleExpanded: (n: string) => emit('toggle-expanded', n),
              onToggleVisibility: (b: any) => emit('toggle-visibility', b),
            }),
          )
        }
      }
      return out
    }
  },
})

export default BoneRow
