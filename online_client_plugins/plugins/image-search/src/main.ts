import { createApp } from 'vue'
import App from './App.vue'
// tailwind 入口：编译本插件 + mira-plugin-ui（源码消费）组件的全部原子类与 shadcn token
import './tailwind.css'

createApp(App).mount('#app')
