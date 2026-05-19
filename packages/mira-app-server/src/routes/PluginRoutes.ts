import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync, spawn } from 'child_process';

import { MiraServer } from '..';

interface PluginInfo {
    id: string;
    pluginName: string;
    name: string;
    version: string;
    description: string;
    author: string;
    status: string;
    configurable: boolean;
    dependencies: any[];
    main: string;
    libraryId: string;
    createdAt: string;
    updatedAt: string;
    icon?: string;
    category: string;
    tags: any[];
}

export class PluginRoutes {
    private router: Router;
    private backend: MiraServer;

    constructor(backend: MiraServer) {
        this.backend = backend;
        this.router = Router();
        this.setupRoutes();
    }

    /**
     * 通用方法：将插件数据格式化为标准格式
     */
    private formatPluginInfo(plugin: any, libraryId: string): PluginInfo {
        return {
            id: `${libraryId}`, // 使用 libraryId 作为插件ID
            pluginName: plugin.name,
            name: plugin.name,
            version: plugin.version || '1.0.0',
            description: plugin.description || '',
            author: plugin.author || 'Unknown',
            status: plugin.status || 'active',
            configurable: plugin.configurable || false,
            dependencies: plugin.dependencies || [],
            main: plugin.main || 'index.js',
            libraryId: libraryId,
            createdAt: plugin.createdAt || new Date().toISOString(),
            updatedAt: plugin.updatedAt || new Date().toISOString(),
            icon: plugin.icon || null,
            category: plugin.category || 'general',
            tags: plugin.tags || []
        };
    }

    /**
     * 通用方法：获取所有插件信息
     */
    private getAllPlugins(): PluginInfo[] {
        const plugins: PluginInfo[] = [];
        for (const [id, libraryObj] of Object.entries(this.backend.libraries!.getLibraries())) {
            if (libraryObj.pluginManager) {
                const libraryPlugins = libraryObj.pluginManager.getPluginsList();
                plugins.push(...libraryPlugins.map((plugin: any) => this.formatPluginInfo(plugin, id)));
            }
        }
        return plugins;
    }

    /**
     * 通用方法：通过ID查找插件
     * 支持格式: 纯插件名(需提供libraryId)、libraryId-pluginName、或直接libraryId
     */
    private findPluginById(id: string, queryLibraryId?: string): { plugin: PluginInfo; libraryObj: any } | null {
        // 优先使用查询参数中的 libraryId + 插件名查找
        if (queryLibraryId) {
            const libraryObj = this.backend.libraries!.getLibrary(queryLibraryId);
            if (libraryObj && libraryObj.pluginManager) {
                const libraryPlugins = libraryObj.pluginManager.getPluginsList();
                const foundPlugin = libraryPlugins.find((p: any) => p.name === id);
                if (foundPlugin) {
                    const plugin = this.formatPluginInfo(foundPlugin, queryLibraryId);
                    return { plugin, libraryObj };
                }
            }
        }

        // 尝试通过 libraryId 查找
        const libraryObj = this.backend.libraries!.getLibrary(id);
        if (libraryObj && libraryObj.pluginManager) {
            const libraryPlugins = libraryObj.pluginManager.getPluginsList();
            if (libraryPlugins.length > 0) {
                const plugin = this.formatPluginInfo(libraryPlugins[0], id);
                return { plugin, libraryObj };
            }
        }

        // 如果没找到，遍历所有库查找插件名
        for (const [libId, lib] of Object.entries(this.backend.libraries!.getLibraries())) {
            if (lib.pluginManager) {
                const libraryPlugins = lib.pluginManager.getPluginsList();
                const foundPlugin = libraryPlugins.find((p: any) => p.name === id);
                if (foundPlugin) {
                    const plugin = this.formatPluginInfo(foundPlugin, libId);
                    return { plugin, libraryObj: lib };
                }
            }
        }

        return null;
    }

    /**
     * 通用方法：验证库是否存在且有插件管理器
     */
    private validateLibrary(libraryId: string) {
        const library = this.backend.libraries!.getLibrary(libraryId);
        if (!library) {
            return { valid: false, error: `Library ${libraryId} not found`, library: null };
        }
        if (!library.pluginManager) {
            return { valid: false, error: '素材库未初始化，请检查是否被禁用！', library: null };
        }
        return { valid: true, error: null, library };
    }

    /**
     * 通用方法：读取插件配置文件
     */
    private readPluginsConfig(pluginsDir: string): any[] {
        const pluginsConfigPath = path.join(pluginsDir, 'plugins.json');
        try {
            if (fs.existsSync(pluginsConfigPath)) {
                return JSON.parse(fs.readFileSync(pluginsConfigPath, 'utf-8'));
            }
        } catch (error) {
            console.error('Error reading plugins config:', error);
        }
        return [];
    }

    /**
     * 通用方法：写入插件配置文件
     */
    private writePluginsConfig(pluginsDir: string, config: any[]): boolean {
        const pluginsConfigPath = path.join(pluginsDir, 'plugins.json');
        try {
            fs.writeFileSync(pluginsConfigPath, JSON.stringify(config, null, 2));
            return true;
        } catch (error) {
            console.error('Error writing plugins config:', error);
            return false;
        }
    }

    private setupRoutes(): void {
        // 获取插件列表
        this.router.get('/', async (req: Request, res: Response) => {
            try {
                const plugins = this.getAllPlugins();
                res.json(plugins);
            } catch (error) {
                console.error('Error getting plugins:', error);
                res.status(500).json({ error: 'Failed to get plugins' });
            }
        });

        // 按素材库分组获取插件列表
        this.router.get('/by-library', async (req: Request, res: Response) => {
            try {
                const librariesWithPlugins = [];
                for (const [id, libraryObj] of Object.entries(this.backend.libraries!.getLibraries())) {
                    const libraryInfo: any = {
                        id: id,
                        name: libraryObj.libraryService?.config.name || id,
                        description: `素材库: ${id}`,
                        plugins: []
                    };

                    if (libraryObj.pluginManager) {
                        const libraryPlugins = libraryObj.pluginManager.getPluginsList();
                        libraryInfo.plugins = libraryPlugins.map((plugin: any) => this.formatPluginInfo(plugin, id));
                    }

                    librariesWithPlugins.push(libraryInfo);
                }
                res.json(librariesWithPlugins);
            } catch (error) {
                console.error('Error getting plugins by library:', error);
                res.status(500).json({ error: 'Failed to get plugins by library' });
            }
        });

        // 安装插件（从npm）
        this.router.post('/install', async (req: Request, res: Response) => {
            try {
                const { name, version = 'latest', libraryId, proxy } = req.body;

                if (!name) {
                    return res.status(400).json({ error: 'Plugin name is required' });
                }
                if (!libraryId) {
                    return res.status(400).json({ error: 'Library ID is required' });
                }

                // 验证库
                const validation = this.validateLibrary(libraryId);
                if (!validation.valid) {
                    return res.status(400).json({ error: validation.error });
                }

                const library = validation.library!;
                let pluginsDir = library.pluginManager!.pluginsDir;

                // 确保插件目录存在
                if (!fs.existsSync(pluginsDir)) {
                    fs.mkdirSync(pluginsDir, { recursive: true });
                }

                const packageName = version === 'latest' ? name : `${name}@${version}`;

                // 支持通过环境变量设置npm代理
                
                const env = { ...process.env };
                if(proxy){
                    env.HTTP_PROXY = proxy;
                    env.HTTPS_PROXY = proxy;
                } else if (!env.HTTP_PROXY && !env.HTTPS_PROXY) {
                    env.HTTP_PROXY = 'http://127.0.0.1:7890';
                    env.HTTPS_PROXY = 'http://127.0.0.1:7890';
                }

                // 初始化npm项目
                spawnSync('npm', ['init', '-y'], {
                    cwd: pluginsDir,
                    stdio: 'pipe',
                    shell: true
                });

                const npmProcess = spawn('npm', ['install', packageName, '-save'], {
                    cwd: pluginsDir,
                    stdio: 'pipe',
                    env,
                    shell: true,
                    timeout: 60000
                });

                let output = '';
                let errorOutput = '';
                let isTimedOut = false;

                const timeoutId = setTimeout(() => {
                    isTimedOut = true;
                    npmProcess.kill('SIGTERM');
                    console.error('npm install timeout after 60 seconds');
                }, 60000);

                npmProcess.stdout.on('data', (data: Buffer) => {
                    output += data.toString();
                });

                npmProcess.stderr.on('data', (data: Buffer) => {
                    errorOutput += data.toString();
                });

                npmProcess.on('close', async (code: number) => {
                    clearTimeout(timeoutId);

                    if (isTimedOut) {
                        return res.status(500).json({
                            error: 'Plugin installation timeout (60s). Please check your network connection.',
                            details: 'Installation was terminated due to timeout'
                        });
                    }

                    if (code === 0) {
                        try {
                            const pluginDir = path.join(pluginsDir, 'node_modules', name);
                            let packageInfo = {};

                            try {
                                const packageJsonPath = path.join(pluginDir, 'package.json');
                                if (fs.existsSync(packageJsonPath)) {
                                    packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
                                }
                            } catch (error) {
                                console.error('Error reading package.json:', error);
                            }

                            await library.pluginManager!.addPlugin({
                                name: name,
                                enabled: false,
                                path: `node_modules/${name}`
                            });

                            res.json({
                                message: 'Plugin installed successfully',
                                plugin: {
                                    name,
                                    version: (packageInfo as any).version || version,
                                    ...packageInfo
                                }
                            });
                        } catch (error) {
                            console.error('Error configuring plugin:', error);
                            res.status(500).json({ error: 'Plugin installed but configuration failed' });
                        }
                    } else {
                        console.error('npm install failed:', errorOutput);

                        const isTimeout = errorOutput.includes('timeout') ||
                            errorOutput.includes('ETIMEDOUT') ||
                            (code === null && errorOutput === '');

                        res.status(500).json({
                            error: isTimeout ? 'Plugin installation timeout (60s). Please check your network connection.' : 'Failed to install plugin',
                            details: errorOutput || 'Installation timeout'
                        });
                    }
                });

            } catch (error) {
                console.error('Error installing plugin:', error);
                res.status(500).json({ error: 'Failed to install plugin' });
            }
        });

        // 上传安装插件
        this.router.post('/upload', async (req: Request, res: Response) => {
            try {
                const multer = require('multer');
                const yauzl = require('yauzl');

                const storage = multer.memoryStorage();
                const upload = multer({
                    storage: storage,
                    limits: { fileSize: 100 * 1024 * 1024 },
                    fileFilter: (req: any, file: any, cb: any) => {
                        if (file.mimetype === 'application/zip' ||
                            file.mimetype === 'application/x-zip-compressed' ||
                            file.originalname.endsWith('.zip') ||
                            file.originalname.endsWith('.tar.gz')) {
                            cb(null, true);
                        } else {
                            cb(new Error('只支持 .zip 和 .tar.gz 格式的插件包'), false);
                        }
                    }
                }).single('file');

                upload(req, res, async (err: any) => {
                    if (err) {
                        console.error('File upload error:', err);
                        return res.status(400).json({ error: err.message || 'File upload failed' });
                    }

                    const file = (req as any).file;
                    const libraryId = req.body.libraryId;

                    if (!file) {
                        return res.status(400).json({ error: 'No file uploaded' });
                    }
                    if (!libraryId) {
                        return res.status(400).json({ error: 'No library ID provided' });
                    }

                    try {
                        const validation = this.validateLibrary(libraryId);
                        if (!validation.valid) {
                            return res.status(400).json({ error: validation.error });
                        }

                        const library = validation.library!;
                        let pluginsDir = library.pluginManager!.pluginsDir;

                        if (!fs.existsSync(pluginsDir)) {
                            fs.mkdirSync(pluginsDir, { recursive: true });
                        }

                        const tempFilePath = path.join(pluginsDir, `temp_${Date.now()}_${file.originalname}`);
                        fs.writeFileSync(tempFilePath, file.buffer);

                        let pluginName = '';
                        let packageInfo: any = {};

                        try {
                            if (file.originalname.endsWith('.zip')) {
                                await new Promise<void>((resolve, reject) => {
                                    yauzl.open(tempFilePath, { lazyEntries: true }, (err: any, zipfile: any) => {
                                        if (err) return reject(err);

                                        zipfile.readEntry();
                                        zipfile.on('entry', (entry: any) => {
                                            if (/\/$/.test(entry.fileName)) {
                                                zipfile.readEntry();
                                            } else {
                                                const outputPath = path.join(pluginsDir, entry.fileName);
                                                const outputDir = path.dirname(outputPath);

                                                if (!fs.existsSync(outputDir)) {
                                                    fs.mkdirSync(outputDir, { recursive: true });
                                                }

                                                zipfile.openReadStream(entry, (err: any, readStream: any) => {
                                                    if (err) return reject(err);

                                                    const writeStream = fs.createWriteStream(outputPath);
                                                    readStream.pipe(writeStream);

                                                    writeStream.on('finish', () => {
                                                        zipfile.readEntry();
                                                    });

                                                    writeStream.on('error', reject);
                                                });
                                            }
                                        });

                                        zipfile.on('end', () => {
                                            resolve();
                                        });

                                        zipfile.on('error', reject);
                                    });
                                });
                            } else {
                                throw new Error('目前仅支持 .zip 格式的插件包');
                            }

                            if (fs.existsSync(tempFilePath)) {
                                fs.unlinkSync(tempFilePath);
                            }

                            if (!pluginName) {
                                pluginName = path.basename(file.originalname, path.extname(file.originalname));
                            }

                            if (library && library.pluginManager) {
                                await library.pluginManager.addPlugin({
                                    name: pluginName,
                                    enabled: false,
                                    path: 'node_modules/' + pluginName
                                });
                            }

                            res.json({
                                message: '插件上传安装成功',
                                plugin: {
                                    name: pluginName,
                                    version: packageInfo.version || '1.0.0',
                                    ...packageInfo
                                }
                            });

                        } catch (extractError) {
                            if (fs.existsSync(tempFilePath)) {
                                fs.unlinkSync(tempFilePath);
                            }
                            throw extractError;
                        }

                    } catch (error) {
                        console.error('Error processing uploaded plugin:', error);
                        res.status(500).json({
                            error: 'Failed to process uploaded plugin',
                            details: (error as Error).message
                        });
                    }
                });

            } catch (error) {
                console.error('Error uploading plugin:', error);
                res.status(500).json({ error: 'Failed to upload plugin' });
            }
        });

        // 上传安装插件
        this.router.post('/upload', async (req: Request, res: Response) => {
            try {
                const multer = require('multer');
                const yauzl = require('yauzl');

                // 配置multer用于文件上传
                const storage = multer.memoryStorage();
                const upload = multer({
                    storage: storage,
                    limits: { fileSize: 100 * 1024 * 1024 }, // 限制文件大小为100MB
                    fileFilter: (req: any, file: any, cb: any) => {
                        // 只允许zip和tar.gz文件
                        if (file.mimetype === 'application/zip' ||
                            file.mimetype === 'application/x-zip-compressed' ||
                            file.originalname.endsWith('.zip') ||
                            file.originalname.endsWith('.tar.gz')) {
                            cb(null, true);
                        } else {
                            cb(new Error('只支持 .zip 和 .tar.gz 格式的插件包'), false);
                        }
                    }
                }).single('file');

                // 使用multer处理文件上传
                upload(req, res, async (err: any) => {
                    if (err) {
                        console.error('File upload error:', err);
                        return res.status(400).json({ error: err.message || 'File upload failed' });
                    }

                    const file = (req as any).file; // 修正：使用 req.file 而不是 req.body.file
                    const libraryId = req.body.libraryId;

                    if (!file) {
                        return res.status(400).json({ error: 'No file uploaded' });
                    }
                    if (!libraryId) {
                        return res.status(400).json({ error: 'No library ID provided' });
                    }

                    try {
                        // 确定插件安装目录
                        const library = this.backend.libraries!.getLibrary(libraryId);
                        if (!library) {
                            return res.status(400).json({ error: `Library ${libraryId} not found` });
                        }
                        let pluginsDir = library.pluginManager!.pluginsDir;
                        if (!library.pluginManager) {
                            return res.status(400).json({ error: `素材库未初始化，请检查是否被禁用！` });
                        }
                        // 确保插件目录存在
                        if (!fs.existsSync(pluginsDir)) {
                            fs.mkdirSync(pluginsDir, { recursive: true });
                        }

                        // 创建临时文件
                        const tempFilePath = path.join(pluginsDir, `temp_${Date.now()}_${file.originalname}`);
                        fs.writeFileSync(tempFilePath, file.buffer);

                        let pluginName = '';
                        let packageInfo: any = {};

                        try {
                            if (file.originalname.endsWith('.zip')) {
                                // 处理ZIP文件
                                await new Promise<void>((resolve, reject) => {
                                    yauzl.open(tempFilePath, { lazyEntries: true }, (err: any, zipfile: any) => {
                                        if (err) return reject(err);

                                        zipfile.readEntry();
                                        zipfile.on('entry', (entry: any) => {
                                            if (/\/$/.test(entry.fileName)) {
                                                // 目录
                                                zipfile.readEntry();
                                            } else {
                                                // 文件
                                                const outputPath = path.join(pluginsDir, entry.fileName);
                                                const outputDir = path.dirname(outputPath);

                                                if (!fs.existsSync(outputDir)) {
                                                    fs.mkdirSync(outputDir, { recursive: true });
                                                }

                                                zipfile.openReadStream(entry, (err: any, readStream: any) => {
                                                    if (err) return reject(err);

                                                    const writeStream = fs.createWriteStream(outputPath);
                                                    readStream.pipe(writeStream);

                                                    writeStream.on('finish', () => {
                                                        // 检查是否是package.json文件(暂时不需要)
                                                        // if (entry.fileName.endsWith('package.json') && !entry.fileName.includes('/')) {
                                                        //     try {
                                                        //         packageInfo = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
                                                        //         pluginName = packageInfo.name || path.basename(entry.fileName, '.json');
                                                        //     } catch (e) {
                                                        //         console.warn('Error reading package.json:', e);
                                                        //     }
                                                        // }
                                                        zipfile.readEntry();
                                                    });

                                                    writeStream.on('error', reject);
                                                });
                                            }
                                        });

                                        zipfile.on('end', () => {
                                            resolve();
                                        });

                                        zipfile.on('error', reject);
                                    });
                                });
                            } else {
                                // 暂不支持tar.gz，返回错误
                                throw new Error('目前仅支持 .zip 格式的插件包');
                            }

                            // 删除临时文件
                            if (fs.existsSync(tempFilePath)) {
                                fs.unlinkSync(tempFilePath);
                            }

                            // 如果没有找到插件名称，使用文件名
                            if (!pluginName) {
                                pluginName = path.basename(file.originalname, path.extname(file.originalname));
                            }

                            // 为指定库或所有库的插件管理器添加新插件
                            const library = this.backend.libraries!.getLibrary(libraryId);
                            if (library && library.pluginManager) {
                                await library.pluginManager.addPlugin({
                                    name: pluginName,
                                    enabled: false,
                                    path: 'node_modules/' + pluginName
                                });
                            }

                            res.json({
                                message: '插件上传安装成功',
                                plugin: {
                                    name: pluginName,
                                    version: packageInfo.version || '1.0.0',
                                    ...packageInfo
                                }
                            });

                        } catch (extractError) {
                            // 删除临时文件
                            if (fs.existsSync(tempFilePath)) {
                                fs.unlinkSync(tempFilePath);
                            }
                            throw extractError;
                        }

                    } catch (error) {
                        console.error('Error processing uploaded plugin:', error);
                        res.status(500).json({
                            error: 'Failed to process uploaded plugin',
                            details: (error as Error).message
                        });
                    }
                });

            } catch (error) {
                console.error('Error uploading plugin:', error);
                res.status(500).json({ error: 'Failed to upload plugin' });
            }
        });

        // 插件状态切换 (POST方法，避免URL字符冲突)
        this.router.post('/toggle-status', async (req: Request, res: Response) => {
            try {
                const { libraryId, pluginName, status } = req.body;

                if (!libraryId || !pluginName || !status) {
                    return res.status(400).json({ error: 'Library ID, plugin name and status are required' });
                }

                const validation = this.validateLibrary(libraryId);
                if (!validation.valid) {
                    return res.status(404).json({ error: validation.error });
                }

                const library = validation.library!;
                let config = this.readPluginsConfig(library.pluginManager!.pluginsDir);

                const pluginIndex = config.findIndex((p: any) => p.name === pluginName);
                if (pluginIndex === -1) {
                    return res.status(404).json({ error: 'Plugin not found in config' });
                }

                config[pluginIndex].enabled = status === 'active';
                config[pluginIndex].status = status;

                if (!this.writePluginsConfig(library.pluginManager!.pluginsDir, config)) {
                    return res.status(500).json({ error: 'Failed to update plugin config' });
                }

                // 精确处理插件加载/卸载
                try {
                    if (status === 'active') {
                        const pluginConfig = { name: pluginName, enabled: true, path: config[pluginIndex].path };
                        await library.pluginManager!.loadPlugin(pluginConfig, false);
                    } else {
                        library.pluginManager!.unloadPlugin(pluginName);
                    }
                } catch (error) {
                    console.error('Error managing plugin:', error);
                }

                res.json({
                    success: true,
                    message: `Plugin ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
                    pluginName: pluginName,
                    status: status
                });
            } catch (error) {
                console.error('Error toggling plugin status:', error);
                res.status(500).json({ error: 'Failed to toggle plugin status' });
            }
        });

        // 启动插件
        this.router.post('/:id/start', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const result = this.findPluginById(id, req.query.libraryId as string);

                if (!result) {
                    return res.status(404).json({
                        error: 'Plugin not found',
                        id: id
                    });
                }

                const { plugin, libraryObj } = result;
                let config = this.readPluginsConfig(libraryObj.pluginManager.pluginsDir);

                const pluginIndex = config.findIndex((p: any) => p.name === plugin.pluginName);
                if (pluginIndex === -1) {
                    return res.status(404).json({ error: 'Plugin not found in config' });
                }

                config[pluginIndex].enabled = true;
                config[pluginIndex].status = 'active';

                if (!this.writePluginsConfig(libraryObj.pluginManager.pluginsDir, config)) {
                    return res.status(500).json({ error: 'Failed to update plugin config' });
                }

                try {
                    const pluginConfig = { name: plugin.pluginName, enabled: true, path: config[pluginIndex].path };
                    await libraryObj.pluginManager.loadPlugin(pluginConfig, false);
                } catch (error) {
                    console.error('Error starting plugin:', error);
                    return res.status(500).json({ error: 'Failed to start plugin' });
                }

                res.json({
                    success: true,
                    message: 'Plugin started successfully',
                    pluginId: id,
                    status: 'active'
                });
            } catch (error) {
                console.error('Error starting plugin:', error);
                res.status(500).json({ error: 'Failed to start plugin' });
            }
        });

        // 停止插件
        this.router.post('/:id/stop', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const result = this.findPluginById(id, req.query.libraryId as string);

                if (!result) {
                    return res.status(404).json({
                        error: 'Plugin not found',
                        id: id
                    });
                }

                const { plugin, libraryObj } = result;
                let config = this.readPluginsConfig(libraryObj.pluginManager.pluginsDir);

                const pluginIndex = config.findIndex((p: any) => p.name === plugin.pluginName);
                if (pluginIndex === -1) {
                    return res.status(404).json({ error: 'Plugin not found in config' });
                }

                config[pluginIndex].enabled = false;
                config[pluginIndex].status = 'inactive';

                if (!this.writePluginsConfig(libraryObj.pluginManager.pluginsDir, config)) {
                    return res.status(500).json({ error: 'Failed to update plugin config' });
                }

                try {
                    libraryObj.pluginManager.unloadPlugin(plugin.pluginName);
                } catch (error) {
                    console.error('Error stopping plugin:', error);
                    return res.status(500).json({ error: 'Failed to stop plugin' });
                }

                res.json({
                    success: true,
                    message: 'Plugin stopped successfully',
                    pluginId: id,
                    status: 'inactive'
                });
            } catch (error) {
                console.error('Error stopping plugin:', error);
                res.status(500).json({ error: 'Failed to stop plugin' });
            }
        });

        // 获取插件配置
        this.router.get('/:id/config', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const result = this.findPluginById(id, req.query.libraryId as string);

                if (!result) {
                    return res.status(404).json({
                        error: 'Plugin not found',
                        id: id
                    });
                }

                const { plugin, libraryObj } = result;
                const pluginDir = libraryObj.pluginManager.getPluginDir(plugin.pluginName);
                const configPath = path.join(pluginDir, 'config.json');

                let config = {};
                if (fs.existsSync(configPath)) {
                    try {
                        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                    } catch (error) {
                        res.json({});
                    }
                }

                res.json(config);
            } catch (error) {
                console.error('Error getting plugin config:', error);
                res.status(500).json({ error: 'Failed to get plugin config' });
            }
        });

        // 更新插件配置
        this.router.put('/:id/config', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const config = req.body;

                const result = this.findPluginById(id, req.query.libraryId as string);

                if (!result) {
                    return res.status(404).json({
                        error: 'Plugin not found',
                        id: id
                    });
                }

                const { plugin, libraryObj } = result;
                const pluginDir = libraryObj.pluginManager.getPluginDir(plugin.pluginName);
                const configPath = path.join(pluginDir, 'config.json');

                try {
                    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                } catch (error) {
                    console.error('Error writing config file:', error);
                    return res.status(500).json({ error: 'Failed to write config file' });
                }

                res.json({
                    success: true,
                    message: 'Plugin config updated successfully'
                });
            } catch (error) {
                console.error('Error updating plugin config:', error);
                res.status(500).json({ error: 'Failed to update plugin config' });
            }
        });

        // 卸载插件
        this.router.delete('/:id', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const result = this.findPluginById(id, req.query.libraryId as string);

                if (!result) {
                    return res.status(404).json({
                        error: 'Plugin not found',
                        id: id
                    });
                }

                const { plugin, libraryObj } = result;
                let config = this.readPluginsConfig(libraryObj.pluginManager.pluginsDir);

                // 从配置中移除
                const newConfig = config.filter((p: any) => p.name !== plugin.pluginName);
                if (!this.writePluginsConfig(libraryObj.pluginManager.pluginsDir, newConfig)) {
                    return res.status(500).json({ error: 'Failed to update plugin config' });
                }

                // 尝试使用npm卸载（如果是npm安装的）
                const { spawn } = require('child_process');
                const npmProcess = spawn('npm', ['uninstall', plugin.pluginName], {
                    cwd: libraryObj.pluginManager.pluginsDir,
                    stdio: 'pipe',
                    shell: true
                });

                npmProcess.on('close', (code: number) => {
                    if (code === 0) {
                        console.log(`Plugin ${plugin.pluginName} uninstalled successfully`);
                    } else {
                        console.warn(`Failed to uninstall plugin ${plugin.pluginName} via npm`);
                    }
                });

                res.json({
                    success: true,
                    message: 'Plugin uninstalled successfully',
                    pluginId: id,
                    pluginName: plugin.pluginName
                });
            } catch (error) {
                console.error('Error uninstalling plugin:', error);
                res.status(500).json({ error: 'Failed to uninstall plugin' });
            }
        });

        // 获取插件图标
        this.router.get('/:pluginName/icon/:filename', async (req: Request, res: Response) => {
            try {
                const { pluginName, filename } = req.params;

                // 查找插件所在的库
                let pluginDir: string | null = null;
                for (const [id, libraryObj] of Object.entries(this.backend.libraries!.getLibraries())) {
                    if (libraryObj.pluginManager) {
                        const testPluginDir = libraryObj.pluginManager.getPluginDir(pluginName);
                        const iconPath = path.join(testPluginDir, filename);
                        if (fs.existsSync(iconPath)) {
                            pluginDir = testPluginDir;
                            break;
                        }
                    }
                }

                if (!pluginDir) {
                    return res.status(404).json({ error: 'Plugin icon not found' });
                }

                const iconPath = path.join(pluginDir, filename);

                if (!fs.existsSync(iconPath)) {
                    return res.status(404).json({ error: 'Icon file not found' });
                }

                // 设置合适的Content-Type
                const ext = path.extname(filename).toLowerCase();
                const mimeTypes: { [key: string]: string } = {
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.svg': 'image/svg+xml',
                    '.ico': 'image/x-icon'
                };

                const contentType = mimeTypes[ext] || 'application/octet-stream';
                res.setHeader('Content-Type', contentType);
                res.setHeader('Cache-Control', 'public, max-age=86400'); // 缓存1天

                const fileStream = fs.createReadStream(iconPath);
                fileStream.pipe(res);
            } catch (error) {
                console.error('Error serving plugin icon:', error);
                res.status(500).json({ error: 'Failed to serve plugin icon' });
            }
        });

        // 获取单个插件信息 - 放在最后避免路由冲突
        this.router.get('/:id', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const result = this.findPluginById(id, req.query.libraryId as string);

                if (!result) {
                    return res.status(404).json({
                        error: 'Plugin not found',
                        id: id,
                        message: `Plugin with ID '${id}' does not exist`
                    });
                }

                res.json(result.plugin);
            } catch (error) {
                console.error('Error getting plugin:', error);
                res.status(500).json({ error: 'Failed to get plugin information' });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}
