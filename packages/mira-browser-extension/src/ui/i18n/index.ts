import { createI18n } from 'vue-i18n';
import zhCN from './locales/zh-CN';
import en from './locales/en';

/**
 * vue-i18n 实例(Composition API 模式)。
 *
 * 初始 locale 固定为 zh-CN:storage 读取是异步的,实例需同步创建。
 * App.vue 在 settings 加载后 watch locale 字段同步切换 i18n.global.locale.value。
 */
const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    en,
  },
});

export default i18n;
