import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'

import 'vue-sonner/style.css'
import './assets/index.css'

createApp(App).use(createPinia()).use(router).use(i18n).mount('#app')

// 开发环境：阻止 Ctrl+Shift+D 触发浏览器默认行为（收藏书签），
// 让 vue-devtools 的 componentInspector 能独占该快捷键。
// vue-inspector 的 keydown 监听挂在 document.body（冒泡阶段），
// 这里用捕获阶段先执行 preventDefault，不影响其收到事件。
if (import.meta.env.DEV) {
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault()
      }
    },
    { capture: true },
  )
}
