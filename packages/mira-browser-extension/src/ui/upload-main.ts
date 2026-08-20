/**
 * 批量上传独立窗口页入口:popup「批量上传(新窗口)」经 chrome.windows.create 打开。
 *
 * 页面职责:恢复主题/设置 → 取出 popup 暂存的文件(IndexedDB) → 打开 BatchUploadDialog。
 * 与 popup/sidepanel 共用同一套 composables(模块级单例按页面各一份)。
 */
import { createApp } from 'vue';
import UploadApp from './UploadApp.vue';
// mira-plugin-ui 组件是 Tailwind class 写的,样式由其 tailwind.css 在本扩展构建内编译生成
import 'mira-plugin-ui/src/assets/tailwind.css';
import './style.css';
import i18n from './i18n';
import { resolveTheme, applyTheme } from './theme';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { STORAGE_KEYS } from '@/shared/storage';

applyTheme(resolveTheme(DEFAULT_SETTINGS.theme));
chrome.storage.local
  .get(STORAGE_KEYS.local)
  .then(result => {
    const theme = result[STORAGE_KEYS.local]?.theme ?? DEFAULT_SETTINGS.theme;
    applyTheme(resolveTheme(theme));
  })
  .catch(() => {});

createApp(UploadApp).use(i18n).mount('#app');
