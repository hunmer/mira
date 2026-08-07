import HitokotoCard from './HitokotoCard.vue'
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
}
