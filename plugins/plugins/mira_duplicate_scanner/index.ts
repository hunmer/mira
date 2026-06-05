import { DuplicateScanner } from './DuplicateScanner';

class MiraDuplicateScanner {
    private pluginName = 'mira_duplicate_scanner';
    private routes: any[] = [];

    getRoutes() {
        return [...this.routes];
    }

    constructor(inst: any) {
        const { pluginManager } = inst;
        const dbService = inst.dbService;
        const backend = pluginManager.server.backend;
        const httpRouter = backend.getHttpServer().httpRouter;
        const libraryId = dbService.getLibraryId();

        // POST /api/duplicate/scan
        httpRouter.registerRounter(
            libraryId, '/duplicate/scan', 'post',
            async (req: any, res: any) => {
                try {
                    const { mode } = req.body;
                    const scanner = new DuplicateScanner(dbService);
                    const result = await scanner.scan(mode || 'quick');
                    res.json({ success: true, data: result });
                } catch (error) {
                    console.error('[mira_duplicate_scanner] scan error:', error);
                    res.status(500).json({
                        success: false,
                        error: error instanceof Error ? error.message : 'Scan failed',
                    });
                }
            }
        );

        // POST /api/duplicate/delete
        httpRouter.registerRounter(
            libraryId, '/duplicate/delete', 'post',
            async (req: any, res: any) => {
                try {
                    const { fileIds } = req.body;
                    if (!Array.isArray(fileIds) || fileIds.length === 0) {
                        return res.status(400).json({
                            success: false,
                            error: 'Missing fileIds',
                        });
                    }

                    const scanner = new DuplicateScanner(dbService);
                    const result = await scanner.deleteFiles(fileIds);
                    res.json({ success: true, data: result });
                } catch (error) {
                    console.error('[mira_duplicate_scanner] delete error:', error);
                    res.status(500).json({
                        success: false,
                        error: error instanceof Error ? error.message : 'Delete failed',
                    });
                }
            }
        );

        // Register Dashboard frontend route
        this.routes.push({
            name: 'DuplicateScanner',
            group: '文件管理',
            path: '/tools/duplicate-scanner',
            component: 'components/DuplicateScanner.js',
            pluginName: this.pluginName,
            meta: { title: '重复文件扫描', roles: ['super', 'admin', 'user'] },
        });

        console.log(`[mira_duplicate_scanner] Plugin initialized for library: ${libraryId}`);
    }
}

export function init(inst: any) {
    return new MiraDuplicateScanner(inst);
}
