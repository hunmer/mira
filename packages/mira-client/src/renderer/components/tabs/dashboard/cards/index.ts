import { z } from 'zod'
import i18n from '../../../../i18n'
import HitokotoCard from './HitokotoCard.vue'
import AlbumCard from './AlbumCard.vue'
import UploadTrendCard from './UploadTrendCard.vue'
import UploaderRankCard from './UploaderRankCard.vue'
import FileTypeCard from './FileTypeCard.vue'
import RecentUploadsCard from './RecentUploadsCard.vue'
import { cardRegistry } from '../CardRegistry'
import type { CardConfigField } from '../CardRegistry'

/**
 * Dashboard 内置卡片注册入口。
 *
 * 调用 registerBuiltinCards() 即可把所有内置卡片注册到 cardRegistry。
 * 第三方插件可以 import { cardRegistry } 自行注册额外卡片。
 */
let registered = false

/** 统计范围 select 的可选项（与 dashboard 统计页一致） */
const daysOptions = () => [
  { label: i18n.global.t('tabs.statisticsCards.days1'), value: 1 },
  { label: i18n.global.t('tabs.statisticsCards.days7'), value: 7 },
  { label: i18n.global.t('tabs.statisticsCards.days30'), value: 30 },
  { label: i18n.global.t('tabs.statisticsCards.days180'), value: 180 },
  { label: i18n.global.t('tabs.statisticsCards.days365'), value: 365 },
]

/** 统计卡片通用配置：统计范围。4 种统计卡片共用同一份定义 */
function statsDaysConfig(): { fields: CardConfigField[]; schema: z.ZodTypeAny; defaults: Record<string, any> } {
  return {
    fields: [
      {
        name: 'days',
        label: i18n.global.t('tabs.statisticsCards.daysLabel'),
        type: 'select',
        options: daysOptions(),
        description: i18n.global.t('tabs.statisticsCards.daysDesc'),
        colSpan: 2,
      },
    ],
    schema: z.object({
      days: z.union([z.number(), z.string()]).transform((v) => Number(v)).pipe(z.number().min(1).max(365)),
    }),
    defaults: { days: 30 },
  }
}

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

  // ---- 统计卡片（数据来源与 dashboard 统计页一致：/api/statistics/*） ----

  const daysCfg = statsDaysConfig()

  cardRegistry.register({
    type: 'uploadTrend',
    group: 'statistics',
    title: i18n.global.t('tabs.builtinCards.uploadTrendTitle'),
    description: i18n.global.t('tabs.builtinCards.uploadTrendDesc'),
    icon: 'show_chart',
    iconColor: '#3B82F6',
    visibleInMenu: true,
    component: UploadTrendCard,
    size: {
      defaultW: 6,
      defaultH: 5,
      minW: 4,
      minH: 3,
      maxW: 12,
      maxH: 10,
    },
    clickBehavior: 'refresh',
    configFields: daysCfg.fields,
    configSchema: daysCfg.schema,
    defaultConfig: daysCfg.defaults,
  })

  cardRegistry.register({
    type: 'uploaderRank',
    group: 'statistics',
    title: i18n.global.t('tabs.builtinCards.uploaderRankTitle'),
    description: i18n.global.t('tabs.builtinCards.uploaderRankDesc'),
    icon: 'leaderboard',
    iconColor: '#F59E0B',
    visibleInMenu: true,
    component: UploaderRankCard,
    size: {
      defaultW: 4,
      defaultH: 4,
      minW: 3,
      minH: 3,
      maxW: 8,
      maxH: 10,
    },
    clickBehavior: 'refresh',
    configFields: daysCfg.fields,
    configSchema: daysCfg.schema,
    defaultConfig: daysCfg.defaults,
  })

  cardRegistry.register({
    type: 'fileType',
    group: 'statistics',
    title: i18n.global.t('tabs.builtinCards.fileTypeTitle'),
    description: i18n.global.t('tabs.builtinCards.fileTypeDesc'),
    icon: 'donut_large',
    iconColor: '#10B981',
    visibleInMenu: true,
    component: FileTypeCard,
    size: {
      defaultW: 4,
      defaultH: 4,
      minW: 3,
      minH: 3,
      maxW: 8,
      maxH: 8,
    },
    clickBehavior: 'refresh',
    configFields: daysCfg.fields,
    configSchema: daysCfg.schema,
    defaultConfig: daysCfg.defaults,
  })

  cardRegistry.register({
    type: 'recentUploads',
    group: 'statistics',
    title: i18n.global.t('tabs.builtinCards.recentUploadsTitle'),
    description: i18n.global.t('tabs.builtinCards.recentUploadsDesc'),
    icon: 'history',
    iconColor: '#8B5CF6',
    visibleInMenu: true,
    component: RecentUploadsCard,
    size: {
      defaultW: 4,
      defaultH: 5,
      minW: 3,
      minH: 3,
      maxW: 8,
      maxH: 12,
    },
    clickBehavior: 'refresh',
    configFields: daysCfg.fields,
    configSchema: daysCfg.schema,
    defaultConfig: daysCfg.defaults,
  })
}
