import { ServerPluginManager, MiraWebsocketServer, ServerPlugin } from 'mira-app-server';
import { ILibraryServerData } from 'mira-storage-sqlite';
import { MiraHttpServer } from 'mira-app-server/dist/server';
import { DuplicateScanner } from './DuplicateScanner';

class MiraDuplicateScanner extends ServerPlugin {
    private readonly httpServer: MiraHttpServer;
    private readonly dbService: ILibraryServerData;

    constructor({ pluginManager, server, dbService }: {
        pluginManager: ServerPluginManager;
        server: MiraWebsocketServer;
        dbService: ILibraryServerData;
    }) {
        super('mira_duplicate_scanner', pluginManager, dbService);
        this.dbService = dbService;
        this.httpServer = server.backend.getHttpServer();

        const libraryId = dbService.getLibraryId();

        // POST /api/duplicate/scan
        this.httpServer.httpRouter.registerRounter(
            libraryId, '/duplicate/scan', 'post',
            async (req: any, res: any) => {
                try {
                    const { mode } = req.body;
                    const scanner = new DuplicateScanner(this.dbService);
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
        this.httpServer.httpRouter.registerRounter(
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

                    const scanner = new DuplicateScanner(this.dbService);
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
        this.registerRoute({
            name: 'DuplicateScanner',
            group: '文件管理',
            path: '/tools/duplicate-scanner',
            component: 'components/DuplicateScanner.js',
            pluginName: 'mira_duplicate_scanner',
            meta: { title: '重复文件扫描', roles: ['super', 'admin', 'user'] },
        });

        console.log(`[mira_duplicate_scanner] Plugin initialized for library: ${libraryId}`);
    }
}

export function init(inst: any): MiraDuplicateScanner {
    return new MiraDuplicateScanner(inst);
}
