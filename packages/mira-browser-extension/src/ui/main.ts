import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

// 根据入口 HTML 决定 containerMode
const containerMode = location.pathname.includes('sidepanel') ? 'sidePanel' : 'popup';

createApp(App, { containerMode }).mount('#app');
