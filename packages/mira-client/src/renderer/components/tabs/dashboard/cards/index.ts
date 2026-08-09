import { z } from 'zod'
import HitokotoCard from './HitokotoCard.vue'
import AlbumCard from './AlbumCard.vue'
import { cardRegistry } from '../CardRegistry'
import i18n from '../../../../i18n'

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
    title: i18n.global.t('tabs.builtinCards.hitokotoTitle'),
    description: i18n.global.t('tabs.builtinCards.hitokotoDesc'),
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
    title: i18n.global.t('tabs.builtinCards.albumTitle'),
    description: i18n.global.t('tabs.builtinCards.albumDesc'),
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
        label: i18n.global.t('tabs.builtinCards.albumConfigAutoplay'),
        type: 'switch',
        description: i18n.global.t('tabs.builtinCards.albumConfigAutoplayDesc'),
        colSpan: 2,
      },
      {
        name: 'autoplayDuration',
        label: i18n.global.t('tabs.builtinCards.albumConfigAutoplayDuration'),
        type: 'slider',
        min: 1000,
        max: 30000,
        step: 500,
        description: i18n.global.t('tabs.builtinCards.albumConfigAutoplayDurationDesc'),
        colSpan: 2,
      },
      {
        name: 'showArrows',
        label: i18n.global.t('tabs.builtinCards.albumConfigShowArrows'),
        type: 'switch',
        description: i18n.global.t('tabs.builtinCards.albumConfigShowArrowsDesc'),
        colSpan: 2,
      },
      {
        name: 'slidesPerView',
        label: i18n.global.t('tabs.builtinCards.albumConfigSlidesPerView'),
        type: 'slider',
        min: 1,
        max: 6,
        step: 1,
        description: i18n.global.t('tabs.builtinCards.albumConfigSlidesPerViewDesc'),
        colSpan: 2,
      },
      {
        name: 'orientation',
        label: i18n.global.t('tabs.builtinCards.albumConfigOrientation'),
        type: 'select',
        options: [
          { label: i18n.global.t('tabs.builtinCards.albumConfigOrientationHorizontal'), value: 'horizontal' },
          { label: i18n.global.t('tabs.builtinCards.albumConfigOrientationVertical'), value: 'vertical' },
        ],
        description: i18n.global.t('tabs.builtinCards.albumConfigOrientationDesc'),
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
