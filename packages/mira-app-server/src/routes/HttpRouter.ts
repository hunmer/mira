import express, { Router, Request, Response, Handler } from 'express';
import { ILibraryServerData } from 'mira-storage-sqlite';
import { MiraServer } from '../server';
import * as fs from 'fs';
import * as path from 'path';


export class HttpRouter {
  private router: Router;
  private registerdRounters: Map<string, Map<string, Handler>> = new Map<string, Map<string, Handler>>();
  private libraryServices: ILibraryServerData[] = [];
  backend: MiraServer;

  constructor(bakend: MiraServer) {
    this.backend = bakend;
    this.router = express.Router();
    this.setupRoutes();
  }

  registerRounter(libraryId: string, path: string, method: string, router: Handler) {
    // 获取或创建该路径的 handler Map
    if (!this.registerdRounters.has(path)) {
      this.registerdRounters.set(path, new Map<string, Handler>());

      // 为该路径注册一个统一的处理函数
      const combinedHandler = async (req: Request, res: Response, next: any) => {
        // 从请求中获取 libraryId
        const requestLibraryId = req.body?.libraryId || req.query?.libraryId || req.params?.libraryId;

        if (!requestLibraryId) {
          return res.status(400).send('Missing libraryId parameter');
        }

        const handlersMap = this.registerdRounters.get(path);
        if (!handlersMap) {
          return res.status(404).send('No handlers found for this path');
        }

        const handler = handlersMap.get(requestLibraryId);
        if (!handler) {
          return res.status(404).send(`No handler found for libraryId: ${requestLibraryId}`);
        }

        console.log(`Processing request for path: ${path}, libraryId: ${requestLibraryId}`);
        // 调用对应的 handler
        handler(req, res, next);
      };

      // 根据 method 注册到 express router
      switch (method.toLowerCase()) {
        case 'post':
          this.router.post(path, combinedHandler);
          break;
        case 'get':
          this.router.get(path, combinedHandler);
          break;
        case 'put':
          this.router.put(path, combinedHandler);
          break;
        case 'delete':
          this.router.delete(path, combinedHandler);
          break;
        case 'patch':
          this.router.patch(path, combinedHandler);
          break;
        case 'head':
          this.router.head(path, combinedHandler);
          break;
        case 'options':
          this.router.options(path, combinedHandler);
          break;
        case 'trace':
          this.router.trace(path, combinedHandler);
          break;
        case 'connect':
          this.router.connect(path, combinedHandler);
          break;
        default:
          throw new Error('不支持的方法');
      }
    }

    // 将新的 handler 添加到 Map 中，以 libraryId 为 key
    this.registerdRounters.get(path)!.set(libraryId, router);
  }

  unregisterRounter(path: string, libraryId?: string, handler?: Handler) {
    if (!this.registerdRounters.has(path)) {
      return;
    }

    const handlersMap = this.registerdRounters.get(path)!;

    if (libraryId) {
      // 移除特定 libraryId 的 handler
      if (handler) {
        // 检查是否是指定的 handler
        const existingHandler = handlersMap.get(libraryId);
        if (existingHandler === handler) {
          handlersMap.delete(libraryId);
        }
      } else {
        // 移除该 libraryId 的 handler
        handlersMap.delete(libraryId);
      }

      // 如果没有更多 handler，移除整个路径
      if (handlersMap.size === 0) {
        this.registerdRounters.delete(path);
        // 注意：这里无法从 express router 中移除路由
        // express 不支持动态移除路由，只能重新创建 router
      }
    } else {
      // 移除整个路径的所有 handlers
      this.registerdRounters.delete(path);
    }
  }

  // 获取指定路径和 libraryId 的 handler
  getHandler(path: string, libraryId: string): Handler | undefined {
    const handlersMap = this.registerdRounters.get(path);
    return handlersMap?.get(libraryId);
  }

  // 获取指定路径的所有 handlers（返回 Map）
  getHandlers(path: string): Map<string, Handler> | undefined {
    return this.registerdRounters.get(path);
  }

  // 获取所有注册的路径
  getRegisteredPaths(): string[] {
    return Array.from(this.registerdRounters.keys());
  }

  // 检查路径是否已注册
  hasPath(path: string): boolean {
    return this.registerdRounters.has(path);
  }

  // 检查特定路径和 libraryId 是否已注册
  hasPathForLibrary(path: string, libraryId: string): boolean {
    const handlersMap = this.registerdRounters.get(path);
    return handlersMap ? handlersMap.has(libraryId) : false;
  }

  private setupRoutes(): void {
    // 插件文件获取接口
    this.router.get('/plugins/:libraryId/:pluginName/*', (req: Request, res: Response) => {
      try {
        const { libraryId, pluginName } = req.params;
        const filePath = req.params[0]; // 获取 * 匹配的部分

        // 从库存储中获取库数据
        const libraries = this.backend.libraries?.getLibraries();
        if (!libraries || !libraries[libraryId]) {
          return res.status(404).json({ error: 'Library not found' });
        }

        const libraryData = libraries[libraryId];

        // 获取库的插件管理器
        const pluginManager = libraryData.pluginManager;
        if (!pluginManager) {
          return res.status(500).json({ error: 'Plugin manager not available for this library' });
        }

        const pluginDir = pluginManager.getPluginDistDir(pluginName);
        const fullFilePath = path.join(pluginDir, filePath);

        // 安全检查：确保文件路径在插件目录内
        const resolvedPath = path.resolve(fullFilePath);
        const resolvedPluginDir = path.resolve(pluginDir);

        if (!resolvedPath.startsWith(resolvedPluginDir)) {
          return res.status(403).json({ error: 'Access denied: path outside plugin directory' });
        }

        console.log({ resolvedPath, filePath });

        // 检查文件是否存在
        if (!fs.existsSync(resolvedPath)) {
          return res.status(404).json({ error: 'File not found' });
        }

        // 检查是否是文件（不是目录）
        const stats = fs.statSync(resolvedPath);
        if (!stats.isFile()) {
          return res.status(400).json({ error: 'Path is not a file' });
        }

        // 根据文件扩展名设置 Content-Type
        const ext = path.extname(resolvedPath).toLowerCase();
        let contentType = 'text/plain';

        switch (ext) {
          case '.js':
            contentType = 'application/javascript; charset=utf-8';
            break;
          case '.vue':
            contentType = 'text/javascript; charset=utf-8';
            break;
          case '.css':
            contentType = 'text/css; charset=utf-8';
            break;
          case '.html':
            contentType = 'text/html; charset=utf-8';
            break;
          case '.json':
            contentType = 'application/json; charset=utf-8';
            break;
          case '.ts':
            contentType = 'text/typescript; charset=utf-8';
            break;
        }        // 设置 CORS 头部支持跨域访问
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET');
        res.header('Access-Control-Allow-Headers', 'Content-Type');

        // 读取并返回文件内容
        const fileContent = fs.readFileSync(resolvedPath, 'utf-8');
        res.setHeader('Content-Type', contentType);
        res.send(fileContent);

        console.log(`Plugin file served: ${libraryId}/${pluginName}/${filePath}`);

      } catch (error) {
        console.error('Error serving plugin file:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  getRouter(): Router {
    return this.router;
  }

  async close(): Promise<void> {
    await Promise.all(this.libraryServices.map(service => service.close()));
    this.libraryServices = [];
  }
}