import { defineManifest } from '@crxjs/vite-plugin';
import pkg from '../package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'Mira 网页采集',
  version: pkg.version,
  description: '截图、拖拽上传、资源嗅探到 Mira 素材库',
  permissions: [
    'activeTab', 'tabs', 'storage', 'scripting',
    'contextMenus', 'sidePanel', 'offscreen', 'commands',
  ],
  host_permissions: ['<all_urls>'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },
  action: {
    default_popup: 'src/ui/popup.html',
    default_title: 'Mira',
    default_icon: { '16': 'icons/icon16.png', '48': 'icons/icon48.png' },
  },
  side_panel: {
    default_path: 'src/ui/sidepanel.html',
  },
  content_scripts: [{
    matches: ['<all_urls>'],
    js: ['src/content/index.ts'],
  }],
  commands: {
    'capture-visible': { description: '截图可视区域' },
    'capture-fullpage': { description: '整页截图' },
    'capture-selection': { description: '选区截图' },
  },
});
