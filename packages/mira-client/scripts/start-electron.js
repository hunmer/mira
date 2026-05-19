#!/usr/bin/env node

// 设置编码和环境变量
if (process.platform === 'win32') {
  // Windows 系统设置
  const { spawn } = require('child_process');
  
  // 设置控制台代码页为 UTF-8
  const chcp = spawn('chcp', ['65001'], { stdio: 'inherit', shell: true });
  
  chcp.on('close', () => {
    // 设置环境变量
    process.env.NODE_OPTIONS = '--max-old-space-size=4096';
    process.env.ELECTRON_ENABLE_LOGGING = '1';
    process.env.FORCE_COLOR = '1';
    process.env.LANG = 'zh_CN.UTF-8';
    process.env.LC_ALL = 'zh_CN.UTF-8';
    
    // 启动 Electron
    const electron = spawn('electron', [
      '.',
      '--disable-dev-shm-usage',
      '--disable-extensions', 
      '--no-sandbox'
    ], { 
      stdio: 'inherit',
      env: process.env
    });
    
    electron.on('close', (code) => {
      process.exit(code);
    });
  });
} else {
  // 非 Windows 系统直接启动
  const { spawn } = require('child_process');
  const electron = spawn('electron', [
    '.',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--no-sandbox'
  ], { stdio: 'inherit' });
  
  electron.on('close', (code) => {
    process.exit(code);
  });
}
