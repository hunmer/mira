import { createApp } from 'vue';
import App from './App.vue';
// mira-plugin-ui 组件(folders/tags tab 等)是 Tailwind class 写的,样式由其 tailwind.css
// 在本扩展构建内编译生成(@source 已声明组件扫描范围)。先于 style.css 引入:
// shadcn 令牌是结构色唯一定义处,style.css 只做短名变量派生 + 品牌绿覆盖(见其头部注释)。
import 'mira-plugin-ui/src/assets/tailwind.css';
import './style.css';
import i18n from './i18n';
import { resolveTheme, applyTheme, watchSystemTheme } from './theme';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { STORAGE_KEYS } from '@/shared/storage';

// 根据入口 HTML 决定 containerMode
const containerMode = location.pathname.includes('sidepanel') ? 'sidePanel' : 'popup';

// 挂载前先应用默认主题,避免亮/暗闪烁;随后从 storage 读取真实偏好并切换
applyTheme(resolveTheme(DEFAULT_SETTINGS.theme));
chrome.storage.local
  .get(STORAGE_KEYS.local)
  .then(result => {
    const stored = result[STORAGE_KEYS.local];
    const theme = stored?.theme ?? DEFAULT_SETTINGS.theme;
    applyTheme(resolveTheme(theme));
  })
  .catch(() => {});

// 系统主题变化时,若当前偏好是 auto 则跟随(theme 的响应式更新在 App.vue 内通过
// useSettings + watch 处理;这里仅兜底首屏未挂载期间的系统变化)
watchSystemTheme(resolved => {
  chrome.storage.local.get(STORAGE_KEYS.local).then(result => {
    const theme = result[STORAGE_KEYS.local]?.theme ?? DEFAULT_SETTINGS.theme;
    if (theme === 'auto') applyTheme(resolved);
  });
});

createApp(App, { containerMode }).use(i18n).mount('#app');
