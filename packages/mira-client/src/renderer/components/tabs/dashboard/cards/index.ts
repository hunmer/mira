import { z } from 'zod'
import HitokotoCard from './HitokotoCard.vue'
import AlbumCard from './AlbumCard.vue'
import { cardRegistry } from '../CardRegistry'

/**
 * Dashboard 内置卡片注册入口。
 *
 * 调用 registerBuiltinCards() 即可把所有内置卡片注册到 cardRegistry。
 * 第三方插件可以 import { cardRegistry } 自行注册额外卡片。
 */
let registered = false

export function registerBuiltinCards() {
  if (registered) return
  registered = true

  cardRegistry.register({
    type: 'hitokoto',
    title: '一言',
    description: '随机展示一条名言 / 台词 / 诗句',
    icon: 'format_quote',
    iconColor: '#8B5CF6',
    visibleInMenu: true,
    component: HitokotoCard,
    size: {
      defaultW: 4,
      defaultH: 3,
      minW: 3,
      minH: 2,
      maxW: 8,
      maxH: 6,
    },
    clickBehavior: 'refresh',
  })

  cardRegistry.register({
    type: 'album',
    title: '相册',
    description: '以轮播形式展示素材库最近的图片',
    icon: 'photo_library',
    iconColor: '#EC4899',
    visibleInMenu: true,
    component: AlbumCard,
    size: {
      defaultW: 4,
      defaultH: 4,
      minW: 3,
      minH: 3,
      maxW: 8,
      maxH: 8,
    },
    clickBehavior: 'none',
    // 相册卡片的可配置项：SchemaField[] + zod schema，由「打开小组件配置窗口」
    // 对话框中的 SchemaForm 自动渲染并校验
    configFields: [
      {
        name: 'autoplay',
        label: '自动播放',
        type: 'switch',
        description: '开启后按设定间隔自动切换图片',
        colSpan: 2,
      },
      {
        name: 'autoplayDuration',
        label: '自动播放间隔',
        type: 'slider',
        min: 1000,
        max: 30000,
        step: 500,
        description: '每次切换的间隔时间（毫秒），仅在自动播放开启时生效',
        colSpan: 2,
      },
      {
        name: 'showArrows',
        label: '显示左右切换按钮',
        type: 'switch',
        description: '关闭后只能靠自动播放或键盘方向键切换',
        colSpan: 2,
      },
      {
        name: 'slidesPerView',
        label: '每屏显示图片数',
        type: 'slider',
        min: 1,
        max: 6,
        step: 1,
        description: '同时展示多张图片（1-6），方向为竖向时按列布局',
        colSpan: 2,
      },
      {
        name: 'orientation',
        label: '方向',
        type: 'select',
        options: [
          { label: '横向', value: 'horizontal' },
          { label: '竖向', value: 'vertical' },
        ],
        description: '横向：左右滑动；竖向：上下滑动',
        colSpan: 2,
      },
    ],
    configSchema: z.object({
      autoplay: z.boolean(),
      // Slider 控件在 SchemaForm 中以 number[] 形式存值，故 schema 用数组
      autoplayDuration: z.array(z.number().min(1000).max(30000)),
      showArrows: z.boolean(),
      slidesPerView: z.array(z.number().min(1).max(6)),
      orientation: z.enum(['horizontal', 'vertical']),
    }),
    defaultConfig: {
      autoplay: true,
      autoplayDuration: [4000],
      showArrows: true,
      slidesPerView: [1],
      orientation: 'horizontal',
    },
  })
}
