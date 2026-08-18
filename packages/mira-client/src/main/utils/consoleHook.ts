import { BrowserWindow } from 'electron'
import { logger } from './Logger'

/**
 * 注入到渲染进程的 console hook 脚本。
 * 拦截 console.log/info/warn/error/debug，序列化参数后转发到主进程日志。
 *
 * 注意：此字符串原样在渲染进程上下文中通过 executeJavaScript 执行，
 * 修改时需保持浏览器环境兼容（不能用 Node API）。
 */
const CONSOLE_HOOK_SCRIPT = `
(function() {
  if (window.__miraConsoleHookInstalled) return;
  window.__miraConsoleHookInstalled = true;
  // 序列化函数：将不可克隆的对象转换为可序列化的格式
  function serializeForIPC(obj) {
    // 基本类型直接返回
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;

    // Error 对象
    if (obj instanceof Error) {
      return {
        __type: 'Error',
        name: obj.name,
        message: obj.message,
        stack: obj.stack
      };
    }

    // Date 对象
    if (obj instanceof Date) {
      return { __type: 'Date', value: obj.toISOString() };
    }

    // 数组
    if (Array.isArray(obj)) {
      return obj.map(item => {
        try {
          return serializeForIPC(item);
        } catch (e) {
          return '[Unserializable]';
        }
      });
    }

    // 普通对象（避免循环引用）
    const seen = new WeakSet();
    function serialize(o, depth = 0) {
      if (depth > 10) return '[Too Deep]';
      if (seen.has(o)) return '[Circular]';

      if (typeof o === 'object' && o !== null) {
        seen.add(o);

        // DOM 元素
        if (o instanceof Element) {
          return \`[Element: \${o.tagName}]\`;
        }

        const result = {};
        for (const key in o) {
          try {
            if (o.hasOwnProperty(key)) {
              result[key] = serialize(o[key], depth + 1);
            }
          } catch (e) {
            result[key] = '[Unserializable]';
          }
        }
        return result;
      }
      return o;
    }

    return serialize(obj);
  }

  // 保存原始 console 方法
  const levels = ['log', 'info', 'warn', 'error', 'debug'];
  const originalConsole = {};

  levels.forEach(level => {
    originalConsole[level] = console[level].bind(console);

    // 替换 console 方法
    console[level] = function(...args) {
      // 调用原始 console 方法（保持 DevTools 输出）
      originalConsole[level](...args);

      // 序列化参数后发送到主进程
      try {
        const serializedArgs = args.map(arg => serializeForIPC(arg));
        if (window.electronAPI?.logger?.[level]) {
          window.electronAPI.logger[level](...serializedArgs);
        }
      } catch (e) {
        // 序列化失败时静默失败，避免影响原始 console 功能
        originalConsole.warn('[procm] Failed to serialize console args:', e);
      }
    };
  });

  // 标记 hook 已安装（使用原始 console）
  originalConsole.log('[procm] Console hooks installed successfully');
})();
`

/**
 * 注入 console hook 到渲染进程。
 * 在窗口 ready-to-show 后调用，把渲染进程的 console 输出转发到主进程日志。
 */
export function injectConsoleHook(win: BrowserWindow): void {
  win.webContents
    .executeJavaScript(CONSOLE_HOOK_SCRIPT)
    .then(() => {
      logger.info('ConsoleHook', 'Console hooks injected into renderer process')
    })
    .catch(error => {
      logger.error('ConsoleHook', 'Failed to inject console hooks', error)
    })
}
