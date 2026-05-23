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

    private getLibraryService(libraryId: string) {
        const libraryObj = this.backend.libraries!.getLibrary(libraryId);
        if (!libraryObj?.libraryService) return null;
        if (!this.backend.libraries!.isLibraryActive(libraryId)) return null;
        return libraryObj.libraryService;
    }

    private setupRoutes(): void {
        // 获取数据库表列表
        this.router.get('/tables', async (req: Request, res: Response) => {
            try {
                const libraryId = req.query.libraryId as string;
                if (!libraryId) {
                    return res.status(400).json({ error: 'libraryId is required' });
                }

                const service = this.getLibraryService(libraryId);
                if (!service) {
                    return res.status(404).json({ error: 'Library not found or inactive' });
                }

                // 查询 SQLite 真实表列表
                const tables: any[] = [];
                const tableNames = await service.getSql("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");

                for (const row of tableNames) {
                    const name = row.name;
                    const countResult = await service.getSql(`SELECT COUNT(*) as cnt FROM "${name}"`);
                    const schemaResult = await service.getSql(`PRAGMA table_info("${name}")`);
                    const schemaStr = schemaResult.map((c: any) => `${c.name}(${c.type})`).join(', ');
                    tables.push({
                        name,
                        schema: schemaStr,
                        rowCount: countResult[0]?.cnt || 0,
                    });
                }

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
                const libraryId = req.query.libraryId as string;
                const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
                const offset = parseInt(req.query.offset as string) || 0;

                if (!libraryId) {
                    return res.status(400).json({ error: 'libraryId is required' });
                }

                const service = this.getLibraryService(libraryId);
                if (!service) {
                    return res.status(404).json({ error: 'Library not found or inactive' });
                }

                const data = await service.getSql(`SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`, [limit, offset]);
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
                const libraryId = req.query.libraryId as string;

                if (!libraryId) {
                    return res.status(400).json({ error: 'libraryId is required' });
                }

                const service = this.getLibraryService(libraryId);
                if (!service) {
                    return res.status(404).json({ error: 'Library not found or inactive' });
                }

                const schema = await service.getSql(`PRAGMA table_info("${tableName}")`);
                res.json(schema);
            } catch (error) {
                console.error('Error getting table schema:', error);
                res.status(500).json({ error: 'Failed to get table schema' });
            }
        });

        // SQL 查询
        this.router.post('/query', async (req: Request, res: Response) => {
            try {
                const { sql, libraryId } = req.body;
                if (!sql || !libraryId) {
                    return res.status(400).json({ error: 'sql and libraryId are required' });
                }

                const service = this.getLibraryService(libraryId);
                if (!service) {
                    return res.status(404).json({ error: 'Library not found or inactive' });
                }

                const result = await service.getSql(sql);
                res.json(result);
            } catch (error) {
                console.error('Error executing SQL:', error);
                res.status(500).json({ error: 'Failed to execute SQL' });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}
