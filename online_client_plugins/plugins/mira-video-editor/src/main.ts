import { createApp } from 'vue'
import App from './App.vue'
// tailwind 入口：编译本插件 + mira-plugin-ui（源码消费）组件的全部原子类与 shadcn token
import './tailwind.css'
// Tab 页公共风格：卡片容器 + 圆形图标按钮
import './assets/tab-common.css'

createApp(App).mount('#app')
