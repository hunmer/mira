import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
// tailwind 入口：编译本插件 + mira-plugin-ui（源码消费）组件的全部原子类与 shadcn token
import './tailwind.css'

const app = createApp(App)
// 全局错误出口：渲染/异步错误打到控制台，便于插件窗口内排查（DevTools 打开时可见）
app.config.errorHandler = (err, _instance, info) => {
  console.error('[image-cropper] Vue error:', info, err)
}
app.use(createPinia()).mount('#app')
