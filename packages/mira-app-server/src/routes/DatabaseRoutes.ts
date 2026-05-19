import { Router, Request, Response } from 'express';
import { MiraServer } from '../server';

export class DatabaseRoutes {
    private router: Router;
    private backend: MiraServer;

    constructor(backend: MiraServer) {
        this.backend = backend;
        this.router = Router();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        // 获取数据库表列表
        this.router.get('/tables', async (req: Request, res: Response) => {
            try {
                // 这里需要根据实际的数据库实现来获取表信息
                // 暂时返回一个基本的表列表，后续可以扩展
                const libraryCount = Object.keys(this.backend.libraries!.libraries).length;
                const tables = [
                    { name: 'users', schema: '', rowCount: 0 },
                    { name: 'libraries', schema: '', rowCount: libraryCount },
                    { name: 'plugins', schema: '', rowCount: 0 },
                    { name: 'files', schema: '', rowCount: 0 },
                    { name: 'tags', schema: '', rowCount: 0 }
                ];
                res.json(tables);
            } catch (error) {
                console.error('Error getting database tables:', error);
                res.status(500).json({ error: 'Failed to get database tables' });
            }
        });

        // 获取表数据
        this.router.get('/tables/:tableName/data', async (req: Request, res: Response) => {
            try {
                const { tableName } = req.params;
                let data: any[] = [];

                if (tableName === 'libraries') {
                    for (const [id, libraryObj] of Object.entries(this.backend.libraries!.libraries)) {
                        if (libraryObj.libraryService) {
                            const stats = await libraryObj.libraryService.getStats();
                            data.push({
                                id: id,
                                name: libraryObj.libraryService.config.name,
                                path: libraryObj.libraryService.config.path,
                                type: libraryObj.libraryService.config.type || 'local',
                                file_count: stats.totalFiles,
                                size: stats.totalSize,
                                created_at: libraryObj.libraryService.config.createdAt || new Date().toISOString()
                            });
                        }
                    }
                }

                res.json(data);
            } catch (error) {
                console.error('Error getting table data:', error);
                res.status(500).json({ error: 'Failed to get table data' });
            }
        });

        // 获取表结构
        this.router.get('/tables/:tableName/schema', async (req: Request, res: Response) => {
            try {
                const { tableName } = req.params;
                let schema: any[] = [];

                if (tableName === 'libraries') {
                    schema = [
                        { name: 'id', type: 'TEXT', notnull: 1, pk: 1, dflt_value: null },
                        { name: 'name', type: 'TEXT', notnull: 1, pk: 0, dflt_value: null },
                        { name: 'path', type: 'TEXT', notnull: 1, pk: 0, dflt_value: null },
                        { name: 'type', type: 'TEXT', notnull: 0, pk: 0, dflt_value: 'local' },
                        { name: 'file_count', type: 'INTEGER', notnull: 0, pk: 0, dflt_value: '0' },
                        { name: 'size', type: 'INTEGER', notnull: 0, pk: 0, dflt_value: '0' },
                        { name: 'created_at', type: 'DATETIME', notnull: 0, pk: 0, dflt_value: 'CURRENT_TIMESTAMP' }
                    ];
                }

                res.json(schema);
            } catch (error) {
                console.error('Error getting table schema:', error);
                res.status(500).json({ error: 'Failed to get table schema' });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}