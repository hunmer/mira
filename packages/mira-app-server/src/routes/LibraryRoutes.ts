import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { MiraServer } from '..';
import { LibraryWatcher } from '../LibraryWatcher';

export class LibraryRoutes {
    private router: Router;
    private backend: MiraServer;

    constructor(backend: MiraServer) {
        this.backend = backend;
        this.router = Router();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        // 获取资源库列表
        this.router.get('/', async (req: Request, res: Response) => {
            try {
                const libraries = [];

                // 读取配置文件以获取所有库的信息（包括禁用的）
                const fsPromises = require('fs').promises;
                const librarysPath = path.join(this.backend.dataPath, 'librarys.json');

                let libraryConfigs: any[] = [];
                try {
                    const data = await fsPromises.readFile(librarysPath, 'utf8');
                    libraryConfigs = JSON.parse(data);
                } catch (error) {
                    console.warn('Failed to read librarys.json:', error);
                }

                for (const config of libraryConfigs) {
                    const id = config.id;
                    const libraryObj = this.backend.libraries!.getLibrary(id);

                    let stats = { totalFiles: 0, totalSize: 0 };
                    const status = this.backend.libraries!.getLibraryStatus(id);

                    // 获取库的配置信息（优先从内存，然后从文件）
                    const libraryConfig = this.backend.libraries!.getLibraryConfig(id) || config;

                    // 如果库服务存在且活跃，获取统计信息
                    if (libraryObj?.libraryService && this.backend.libraries!.isLibraryActive(id)) {
                        try {
                            stats = await libraryObj.libraryService.getStats();
                        } catch (error) {
                            console.warn(`Failed to get stats for library ${id}:`, error);
                        }
                    }

                    // 处理路径字段，兼容新旧配置格式
                    const configPath = libraryConfig.path || libraryConfig.customFields?.path || '';

                    libraries.push({
                        id: id,
                        name: libraryConfig.name,
                        path: configPath,
                        status: status,
                        fileCount: stats.totalFiles,
                        size: stats.totalSize,
                        description: libraryConfig.description || '',
                        icon: libraryConfig.icon || 'default',
                        ...(libraryConfig.pluginsDir && { pluginsDir: libraryConfig.pluginsDir }),
                        ...(libraryConfig.customFields && { customFields: libraryConfig.customFields }),
                        ...(libraryConfig.allowedRoles && { allowedRoles: libraryConfig.allowedRoles }),
                        createdAt: libraryConfig.createdAt || new Date().toISOString(),
                        updatedAt: libraryConfig.updatedAt || new Date().toISOString()
                    });
                }

                res.json(libraries);
            } catch (error) {
                console.error('Error getting libraries:', error);
                res.status(500).json({ error: 'Failed to get libraries' });
            }
        });        // 创建新资源库
        this.router.post('/', async (req: Request, res: Response) => {
            try {
                const {
                    name,
                    path: libraryPath,
                    description,
                    icon,
                    customFields,
                    pluginsDir,
                    allowedRoles
                } = req.body;

                if (!name || !libraryPath) {
                    return res.status(400).json({ error: 'Name and path are required' });
                }

                // 检查路径是否已存在
                for (const [id, libraryObj] of Object.entries(this.backend.libraries!.getLibraries())) {
                    const existingPath = libraryObj.libraryService?.config?.path ||
                        libraryObj.libraryService?.config?.customFields?.path;
                    if (existingPath === libraryPath) {
                        return res.status(400).json({ error: 'Library with this path already exists' });
                    }
                }

                // 生成新的 ID
                const newId = Date.now().toString();

                // 创建库配置，支持新的字段结构
                const libraryConfig: any = {
                    id: newId,
                    name,
                    path: libraryPath,
                    description: description || '',
                    icon: icon || 'default',
                    customFields: {
                        path: libraryPath,
                        enableHash: customFields?.enableHash || false,
                        enableAutoSync: customFields?.enableAutoSync ?? true,
                        enableAutoBackup: customFields?.enableAutoBackup ?? true,
                        ...(customFields || {})
                    },
                    ...(allowedRoles && { allowedRoles }),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    status: 'active' // 新建的库默认为活动状态
                };

                // 添加插件目录（如果提供）
                if (pluginsDir) {
                    libraryConfig.pluginsDir = pluginsDir;
                }

                // 读取现有的 librarys.json
                const fsPromises = require('fs').promises;
                const librarysPath = path.join(this.backend.dataPath, 'librarys.json');

                let libraries = [];
                try {
                    const data = await fsPromises.readFile(librarysPath, 'utf8');
                    libraries = JSON.parse(data);
                } catch (error) {
                    // 文件不存在，使用空数组
                    libraries = [];
                }

                // 添加新库到配置
                libraries.push(libraryConfig);

                // 写回文件
                await fsPromises.writeFile(librarysPath, JSON.stringify(libraries, null, 2), 'utf8');

                // 加载新库
                try {
                    await this.backend.libraries!.load(libraryConfig);
                } catch (loadError) {
                    console.warn('Failed to load new library immediately:', loadError);
                }

                // 返回创建的库信息
                const createdLibrary = {
                    id: newId,
                    name,
                    path: libraryPath,
                    status: 'active',
                    fileCount: 0,
                    size: 0,
                    description: description || '',
                    icon: icon || 'default',
                    customFields: libraryConfig.customFields,
                    ...(pluginsDir && { pluginsDir }),
                    ...(allowedRoles && { allowedRoles }),
                    createdAt: libraryConfig.createdAt,
                    updatedAt: libraryConfig.updatedAt
                };

                res.status(201).json(createdLibrary);
            } catch (error) {
                console.error('Error creating library:', error);
                res.status(500).json({ error: 'Failed to create library' });
            }
        });

        // 更新资源库
        this.router.put('/:id', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const {
                    name,
                    path: libraryPath,
                    description,
                    icon,
                    customFields,
                    pluginsDir,
                    allowedRoles
                } = req.body;

                const libraryObj = this.backend.libraries!.getLibrary(id);
                if (!libraryObj) {
                    return res.status(404).json({ error: 'Library not found' });
                }

                // 获取当前配置（可能来自活跃的服务或保存的配置）
                const currentConfig = this.backend.libraries!.getLibraryConfig(id);
                if (!currentConfig) {
                    return res.status(404).json({ error: 'Library configuration not found' });
                }

                // 如果路径变了，检查新路径是否与其他库冲突
                const currentPath = currentConfig.path || currentConfig.customFields?.path;
                if (libraryPath && libraryPath !== currentPath) {
                    for (const [otherId, otherLibraryObj] of Object.entries(this.backend.libraries!.getLibraries())) {
                        const otherConfig = this.backend.libraries!.getLibraryConfig(otherId);
                        const otherPath = otherConfig?.path || otherConfig?.customFields?.path;
                        if (otherId !== id && otherPath === libraryPath) {
                            return res.status(400).json({ error: 'Library with this path already exists' });
                        }
                    }
                }

                // 更新配置，支持新的字段结构
                const updatedConfig: any = {
                    ...currentConfig,
                    name: name || currentConfig.name,
                    path: libraryPath || currentConfig.path,
                    description: description !== undefined ? description : currentConfig.description,
                    icon: icon || currentConfig.icon || 'default',
                    customFields: {
                        ...currentConfig.customFields,
                        path: libraryPath || currentConfig.path,
                        enableHash: customFields?.enableHash !== undefined ? customFields.enableHash : (currentConfig.customFields?.enableHash || false),
                        ...(customFields || {})
                    },
                    updatedAt: new Date().toISOString()
                };

                // 更新插件目录
                if (pluginsDir !== undefined) {
                    if (pluginsDir) {
                        updatedConfig.pluginsDir = pluginsDir;
                    } else {
                        delete updatedConfig.pluginsDir;
                    }
                }

                // 更新 allowedRoles
                if (allowedRoles !== undefined) {
                    updatedConfig.allowedRoles = allowedRoles;
                }

                // 更新内存中的配置（如果库是活跃的）
                if (libraryObj.libraryService) {
                    libraryObj.libraryService.config = updatedConfig;

                    // 处理 watcher 启停
                    const shouldWatch = updatedConfig.customFields?.enableAutoSync ?? true;
                    if (shouldWatch && !libraryObj.watcher) {
                        const watcher = new LibraryWatcher(libraryObj.libraryService, this.backend.getWebSocketServer());
                        libraryObj.watcher = watcher;
                        watcher.start();
                    } else if (!shouldWatch && libraryObj.watcher) {
                        await libraryObj.watcher.stop();
                        libraryObj.watcher = undefined;
                    }
                } else if (libraryObj.savedConfig) {
                    // 更新保存的配置
                    libraryObj.savedConfig = updatedConfig;
                }

                // 同时更新 librarys.json 文件
                const fsPromises = require('fs').promises;
                const librarysPath = path.join(this.backend.dataPath, 'librarys.json');

                try {
                    const data = await fsPromises.readFile(librarysPath, 'utf8');
                    let libraries = JSON.parse(data);

                    // 找到并更新对应的库配置
                    const libraryIndex = libraries.findIndex((lib: any) => lib.id === id);
                    if (libraryIndex !== -1) {
                        libraries[libraryIndex] = updatedConfig;
                        await fsPromises.writeFile(librarysPath, JSON.stringify(libraries, null, 2), 'utf8');
                    }
                } catch (fileError) {
                    console.warn('Failed to update librarys.json:', fileError);
                }

                // 获取更新后的统计信息
                let stats = { totalFiles: 0, totalSize: 0 };
                if (libraryObj.libraryService) {
                    try {
                        stats = await libraryObj.libraryService.getStats();
                    } catch (error) {
                        console.warn('Failed to get stats after update:', error);
                    }
                }

                const updatedLibrary = {
                    id: id,
                    name: updatedConfig.name,
                    path: updatedConfig.path || updatedConfig.customFields?.path,
                    status: this.backend.libraries!.getLibraryStatus(id),
                    fileCount: stats.totalFiles,
                    size: stats.totalSize,
                    description: updatedConfig.description || '',
                    icon: updatedConfig.icon,
                    customFields: updatedConfig.customFields,
                    ...(updatedConfig.pluginsDir && { pluginsDir: updatedConfig.pluginsDir }),
                    ...(updatedConfig.allowedRoles && { allowedRoles: updatedConfig.allowedRoles }),
                    createdAt: updatedConfig.createdAt,
                    updatedAt: updatedConfig.updatedAt
                };

                res.json(updatedLibrary);
            } catch (error) {
                console.error('Error updating library:', error);
                res.status(500).json({ error: 'Failed to update library' });
            }
        });

        // 切换资源库状态
        this.router.patch('/:id/status', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const { status } = req.body;

                if (!status || !['active', 'inactive'].includes(status)) {
                    return res.status(400).json({ error: 'Invalid status. Must be active or inactive' });
                }

                const libraryObj = this.backend.libraries!.getLibrary(id);
                if (!libraryObj) {
                    return res.status(404).json({ error: 'Library not found' });
                }

                // 获取当前状态
                const currentStatus = this.backend.libraries!.getLibraryStatus(id);
                if (currentStatus === status) {
                    return res.json({ message: `Library is already ${status}` });
                }

                // 执行启用/禁用操作
                let success = false;
                if (status === 'active') {
                    success = await this.backend.libraries!.enableLibrary(id);
                } else {
                    success = await this.backend.libraries!.disableLibrary(id);
                }

                if (!success) {
                    return res.status(500).json({ error: `Failed to ${status === 'active' ? 'enable' : 'disable'} library` });
                }

                // 更新配置文件中的状态
                try {
                    const fsPromises = require('fs').promises;
                    const librarysPath = path.join(this.backend.dataPath, 'librarys.json');

                    const data = await fsPromises.readFile(librarysPath, 'utf8');
                    let libraries = JSON.parse(data);

                    // 找到并更新对应的库配置
                    const libraryIndex = libraries.findIndex((lib: any) => lib.id === id);
                    if (libraryIndex !== -1) {
                        libraries[libraryIndex].status = status;
                        libraries[libraryIndex].updatedAt = new Date().toISOString();
                        await fsPromises.writeFile(librarysPath, JSON.stringify(libraries, null, 2), 'utf8');
                    }
                } catch (fileError) {
                    console.warn('Failed to update librarys.json:', fileError);
                    // 即使文件更新失败，也不影响内存中的状态切换
                }

                res.json({
                    message: `Library ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
                    status: status
                });
            } catch (error) {
                console.error('Error toggling library status:', error);
                res.status(500).json({ error: 'Failed to toggle library status' });
            }
        });

        // 获取资源库统计信息
        this.router.get('/:id/stats', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const libraryObj = this.backend.libraries!.getLibrary(id);

                if (!libraryObj) {
                    return res.status(404).json({ error: 'Library not found' });
                }

                // 检查库是否处于活动状态
                if (!this.backend.libraries!.isLibraryActive(id)) {
                    return res.status(400).json({
                        error: 'Library is inactive',
                        message: 'Cannot get statistics for inactive library. Please enable the library first.'
                    });
                }

                if (!libraryObj.libraryService) {
                    return res.status(500).json({ error: 'Library service not available' });
                }

                const stats = await libraryObj.libraryService.getStats();

                // 获取文件夹数量
                let totalFolders = 0;
                try {
                    const folderResult = await libraryObj.libraryService.getSql('SELECT COUNT(*) as total_folders FROM files WHERE type = "folder" AND recycled = 0');
                    totalFolders = folderResult[0]?.total_folders || 0;
                } catch (error) {
                    console.warn('Failed to get folder count:', error);
                }

                // 获取标签数量
                let totalTags = 0;
                try {
                    const tagResult = await libraryObj.libraryService.getSql('SELECT COUNT(DISTINCT tag) as total_tags FROM file_tags');
                    totalTags = tagResult[0]?.total_tags || 0;
                } catch (error) {
                    console.warn('Failed to get tag count:', error);
                }

                // 获取文件类型分布
                let fileTypes = {};
                try {
                    const typeResult = await libraryObj.libraryService.getSql('SELECT type, COUNT(*) as count FROM files WHERE recycled = 0 GROUP BY type');
                    fileTypes = typeResult.reduce((acc: any, row: any) => {
                        acc[row.type] = row.count;
                        return acc;
                    }, {});
                } catch (error) {
                    console.warn('Failed to get file types:', error);
                }

                const detailedStats = {
                    totalFiles: stats.totalFiles || 0,
                    totalFolders: totalFolders,
                    totalSize: stats.totalSize || 0,
                    totalTags: totalTags,
                    fileTypes: fileTypes,
                    lastUpdated: new Date().toISOString()
                };

                res.json(detailedStats);
            } catch (error) {
                console.error('Error getting library stats:', error);
                res.status(500).json({ error: 'Failed to get library stats' });
            }
        });

        // SQL 查询接口
        this.router.post('/:id/query', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const { sql, params } = req.body;

                if (!sql) {
                    return res.status(400).json({ error: 'SQL query is required' });
                }

                const libraryObj = this.backend.libraries!.getLibrary(id);
                if (!libraryObj) {
                    return res.status(404).json({ error: 'Library not found' });
                }

                // 检查库是否处于活动状态
                if (!this.backend.libraries!.isLibraryActive(id)) {
                    return res.status(400).json({
                        error: 'Library is inactive',
                        message: 'Cannot execute SQL query on inactive library. Please enable the library first.'
                    });
                }

                if (!libraryObj.libraryService) {
                    return res.status(500).json({ error: 'Library service not available' });
                }

                // 执行查询，支持参数化查询
                const result = await libraryObj.libraryService.getSql(sql, params);
                res.json({ success: true, data: result });
            } catch (error) {
                console.error('Error executing SQL query:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to execute SQL query',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // SQL 执行接口 (INSERT, UPDATE, DELETE)
        this.router.post('/:id/execute', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const { sql, params } = req.body;

                if (!sql) {
                    return res.status(400).json({ error: 'SQL statement is required' });
                }

                const libraryObj = this.backend.libraries!.getLibrary(id);
                if (!libraryObj) {
                    return res.status(404).json({ error: 'Library not found' });
                }

                // 检查库是否处于活动状态
                if (!this.backend.libraries!.isLibraryActive(id)) {
                    return res.status(400).json({
                        error: 'Library is inactive',
                        message: 'Cannot execute SQL statement on inactive library. Please enable the library first.'
                    });
                }

                if (!libraryObj.libraryService) {
                    return res.status(500).json({ error: 'Library service not available' });
                }

                // 执行 SQL 语句，支持参数化查询
                const result = await (libraryObj.libraryService as any).runSql(sql, params);
                res.json({
                    success: true,
                    lastID: result.lastID,
                    changes: result.changes
                });
            } catch (error) {
                console.error('Error executing SQL statement:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to execute SQL statement',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // 获取表结构信息
        this.router.get('/:id/schema/:table', async (req: Request, res: Response) => {
            try {
                const { id, table } = req.params;

                const libraryObj = this.backend.libraries!.getLibrary(id);
                if (!libraryObj) {
                    return res.status(404).json({ error: 'Library not found' });
                }

                // 检查库是否处于活动状态
                if (!this.backend.libraries!.isLibraryActive(id)) {
                    return res.status(400).json({
                        error: 'Library is inactive',
                        message: 'Cannot get table schema from inactive library. Please enable the library first.'
                    });
                }

                if (!libraryObj.libraryService) {
                    return res.status(500).json({ error: 'Library service not available' });
                }

                // 获取表结构
                const schemaQuery = `PRAGMA table_info(${table})`;
                const schema = await libraryObj.libraryService.getSql(schemaQuery);

                res.json({ success: true, data: schema });
            } catch (error) {
                console.error('Error getting table schema:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to get table schema',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // 更新记录接口
        this.router.put('/:id/record/:table/:recordId', async (req: Request, res: Response) => {
            try {
                const { id, table, recordId } = req.params;
                const updateData = req.body;

                const libraryObj = this.backend.libraries!.getLibrary(id);
                if (!libraryObj) {
                    return res.status(404).json({ error: 'Library not found' });
                }

                // 检查库是否处于活动状态
                if (!this.backend.libraries!.isLibraryActive(id)) {
                    return res.status(400).json({
                        error: 'Library is inactive',
                        message: 'Cannot update records in inactive library. Please enable the library first.'
                    });
                }

                if (!libraryObj.libraryService) {
                    return res.status(500).json({ error: 'Library service not available' });
                }

                // 构建 UPDATE SQL
                const updateFields = Object.keys(updateData)
                    .filter(key => key !== 'id')
                    .map(key => `${key} = ?`)
                    .join(', ');

                const values = Object.keys(updateData)
                    .filter(key => key !== 'id')
                    .map(key => updateData[key]);

                const updateSql = `UPDATE ${table} SET ${updateFields} WHERE id = ?`;
                values.push(recordId);

                const result = await libraryObj.libraryService.getSql(updateSql, values);
                res.json({ success: true, data: result });
            } catch (error) {
                console.error('Error updating record:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to update record',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });        // 删除资源库
        this.router.delete('/:id', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;

                const libraryObj = this.backend.libraries!.getLibrary(id);
                if (!libraryObj) {
                    return res.status(404).json({ error: 'Library not found' });
                }

                // 读取现有的 librarys.json
                const fsPromises = require('fs').promises;
                const librarysPath = path.join(this.backend.dataPath, 'librarys.json');

                let libraries = [];
                try {
                    const data = await fsPromises.readFile(librarysPath, 'utf8');
                    libraries = JSON.parse(data);
                } catch (error) {
                    return res.status(500).json({ error: 'Failed to read libraries configuration' });
                }

                // 从配置中移除库
                libraries = libraries.filter((lib: any) => lib.id !== id);

                // 写回文件
                await fsPromises.writeFile(librarysPath, JSON.stringify(libraries, null, 2), 'utf8');

                // 关闭库服务
                if (libraryObj.libraryService) {
                    try {
                        libraryObj.libraryService.close();
                    } catch (closeError) {
                        console.warn('Failed to close library service:', closeError);
                    }
                }

                // 从内存中移除
                this.backend.libraries!.removeLibrary(id);

                res.json({ message: 'Library deleted successfully' });
            } catch (error) {
                console.error('Error deleting library:', error);
                res.status(500).json({ error: 'Failed to delete library' });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}
