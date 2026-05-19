import { environment } from ".";

/**
 * ConfigStorage - localStorage的封装类
 * 提供统一的配置存储接口，便于后续扩展和维护
 * 在生产环境中，特定的key会使用文件存储而不是localStorage
 */
class ConfigStorage {
  // 需要在生产环境中使用文件存储的key列表
  private static readonly FILE_STORAGE_KEYS = ['mira-servers', 'mira-settings'];

  // 文件存储缓存，避免重复读取
  private static fileCache: Map<string, string | null> = new Map();

  // 初始化标记，确保文件数据只加载一次
  private static initialized = false;

  /**
   * 检查key是否需要使用文件存储
   */
  private static shouldUseFileStorage(key: string): boolean {
    return environment.isProduction &&  environment.isElectron && this.FILE_STORAGE_KEYS.includes(key);
  }

  /**
   * 获取配置文件路径
   */
  private static getConfigFilePath(key: string): string {
    return window.electronAPI.process.cwd() + `/resources/configs/${key}.json`;
  }

  /**
   * 初始化文件存储缓存（异步加载文件数据）
   */
  private static async initializeFileCache(): Promise<void> {
    if (this.initialized || !environment.isElectron) {
      return;
    }
    console.log('Initializing ConfigStorage file cache...');
    try {
      for (const key of this.FILE_STORAGE_KEYS) {
        if (this.shouldUseFileStorage(key)) {
          const filePath = this.getConfigFilePath(key);
          console.log({filePath})
          const result = await window.electronAPI.fs.readFile(filePath);

          if (result.success && result.data !== undefined) {
            this.fileCache.set(key, result.data);
          }  else {
            this.fileCache.set(key, '{}');
          }
        }
      }
      this.initialized = true;
    } catch (error) {
      console.error('ConfigStorage initializeFileCache error:', error);
      this.initialized = true; // 即使失败也标记为已初始化，避免重复尝试
    }
  }

  /**
   * 异步写入文件（不阻塞主线程）
   */
  private static async writeToFileAsync(key: string, value: string): Promise<void> {
    try {
      const filePath = this.getConfigFilePath(key);
      const result = await window.electronAPI.fs.writeFile(filePath, value);

      if (!result.success) {
        console.warn(`Failed to write file for key ${key}:`, result.message);
      }
    } catch (error) {
      console.error(`ConfigStorage writeToFileAsync error for key ${key}:`, error);
    }
  }

  /**
   * 设置配置项
   * @param key 配置键名
   * @param value 配置值
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      if (this.shouldUseFileStorage(key)) {
        // 更新缓存
        this.fileCache.set(key, value);
        // 异步写入文件
        await this.writeToFileAsync(key, value);
        // 同时保存到localStorage作为备份
        localStorage.setItem(key, value);
      } else {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('ConfigStorage setItem error:', error);
    }
  }

  /**
   * 获取配置项
   * @param key 配置键名
   * @returns 配置值，如果不存在则返回null
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      if (this.shouldUseFileStorage(key)) {
        // 如果还未初始化，等待初始化完成
        if (!this.initialized) {
          await this.initializeFileCache();
        }

        // 从缓存中获取数据
        if (this.fileCache.has(key)) {
          return this.fileCache.get(key) || null;
        }

        // 缓存中没有数据，从localStorage获取（作为备用）
        return localStorage.getItem(key);
      } else {
        return localStorage.getItem(key);
      }
    } catch (error) {
      console.error('ConfigStorage getItem error:', error);
      return localStorage.getItem(key);
    }
  }

  /**
   * 移除配置项
   * @param key 配置键名
   */
  static async removeItem(key: string): Promise<void> {
    try {
      if (this.shouldUseFileStorage(key)) {
        // 从缓存中移除
        this.fileCache.set(key, null);
        // 异步清空文件内容
        await this.writeToFileAsync(key, '');
        // 同时清理localStorage
        localStorage.removeItem(key);
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('ConfigStorage removeItem error:', error);
    }
  }

  /**
   * 清空所有配置
   */
  static async clear(): Promise<void> {
    try {
      localStorage.clear();
      // 清空文件缓存
      for (const key of this.FILE_STORAGE_KEYS) {
        if (this.shouldUseFileStorage(key)) {
          this.fileCache.set(key, null);
          await this.writeToFileAsync(key, '');
        }
      }
    } catch (error) {
      console.error('ConfigStorage clear error:', error);
    }
  }

  /**
   * 获取所有配置键名
   * @returns 配置键名数组
   */
  static getAllKeys(): string[] {
    try {
      const keys: string[] = [];

      // 添加localStorage中的键
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          keys.push(key);
        }
      }

      // 添加文件存储的键（如果在缓存中且有值）
      for (const [key, value] of this.fileCache.entries()) {
        if (value !== null && value.trim() !== '' && !keys.includes(key)) {
          keys.push(key);
        }
      }

      return keys;
    } catch (error) {
      console.error('ConfigStorage getAllKeys error:', error);
      return [];
    }
  }

  /**
   * 检查配置项是否存在
   * @param key 配置键名
   * @returns 是否存在
   */
  static hasItem(key: string): boolean {
    try {
      if (this.shouldUseFileStorage(key)) {
        // 检查缓存
        if (this.fileCache.has(key)) {
          const value = this.fileCache.get(key);
          return value !== null && value !== undefined && value.trim() !== '';
        }
        // 检查localStorage（作为备用）
        return localStorage.getItem(key) !== null;
      } else {
        return localStorage.getItem(key) !== null;
      }
    } catch (error) {
      console.error('ConfigStorage hasItem error:', error);
      return false;
    }
  }

  /**
   * 设置JSON对象
   * @param key 配置键名
   * @param value JSON对象
   */
  static async setJSON<T>(key: string, value: T): Promise<void> {
    try {
      const jsonString = JSON.stringify(value, null, 2);
      await this.setItem(key, jsonString);
    } catch (error) {
      console.error('ConfigStorage setJSON error:', error);
    }
  }

  /**
   * 获取JSON对象
   * @param key 配置键名
   * @returns 解析后的JSON对象，如果失败则返回null
   */
  static async getJSON<T>(key: string): Promise<T | null> {
    try {
      const jsonString = await this.getItem(key);
      if (jsonString === null) {
        return null;
      }
      return JSON.parse(jsonString) as T;
    } catch (error) {
      console.error('ConfigStorage getJSON error:', error);
      return null;
    }
  }

  /**
   * 强制刷新文件缓存（用于手动同步）
   */
  static async refreshFileCache(): Promise<void> {
    this.initialized = false;
    this.fileCache.clear();
    await this.initializeFileCache();
  }
}

export default ConfigStorage;