import { ServerPluginManager, MiraWebsocketServer, ServerPlugin, PluginRouteDefinition } from 'mira-app-server';
import { ILibraryServerData } from 'mira-storage-sqlite';
import { MiraHttpServer } from 'mira-app-server/dist/server';

class UploadStatistics extends ServerPlugin {
    private readonly server: MiraWebsocketServer;
    private httpServer: MiraHttpServer;
    private dbService: ILibraryServerData;

    constructor({ pluginManager, server, dbService }: { pluginManager: ServerPluginManager, server: MiraWebsocketServer, dbService: ILibraryServerData }) {
        super('upload_statistics', pluginManager, dbService);
        this.server = server;
        this.dbService = dbService;
        const backend = pluginManager.server.backend;
        const httpServer = backend.getHttpServer();
        this.httpServer = httpServer;

        // 注册前端路由
        this.initializeRoutes();

        // 注册所需的字段
        pluginManager.registerFields([
            { action: 'create', type: 'file', field: 'username' },
        ]);

        const libraryId = dbService.getLibraryId();

        // 获取所有统计接口
        httpServer.httpRouter.registerRounter(libraryId, '/upload_statistics/list', 'get', async (req, res) => {
            const { username, startDate, endDate } = req.query;
            console.log({ username, startDate, endDate });
            const filters: Record<string, any> = {};

            if (username) {
                filters.custom_fields = { uploader: username as string };
            }

            if (startDate && endDate) {
                filters.dateRange = {
                    start: new Date(startDate as string),
                    end: new Date(endDate as string)
                };
            }

            try {
                const { result } = await this.dbService.getFiles({ filters });
                console.log({ result })
                res.status(200).json(result.map(file => ({
                    id: file.id,
                    name: file.name,
                    uploader: file.custom_fields?.uploader,
                    created_at: new Date(file.created_at).toISOString(),
                    size: file.size
                })));
            } catch (error) {
                res.status(500).json({ error: 'Failed to get upload statistics' });
            }
        });

        // 绑定文件创建事件

        const obj = httpServer.backend.libraries!.getLibrary(dbService.getLibraryId());
        if (obj) {
            obj.eventManager.on('file::created', this.onAfterUploaded.bind(this));
        }
    }

    /**
     * 初始化前端路由
     */
    private initializeRoutes() {
        // 上传统计主页面
        const statisticsRoute: PluginRouteDefinition = {
            name: 'UploadStatistics',
            group: "数据统计",
            path: '/statistics/upload',
            component: 'components/UploadStatistics.js',
            meta: {
                roles: ['super', 'admin', 'user'], // 所有用户都可以查看
                icon: 'lucide:trending-up',
                title: '上传统计',
                order: 1
            }
        };

        // 详细数据页面
        const detailRoute: PluginRouteDefinition = {
            name: 'UploadDetails',
            group: "数据统计",
            path: '/statistics/upload/details',
            component: 'components/UploadDetails.js',
            meta: {
                roles: ['super', 'admin'],
                icon: 'lucide:file-text',
                title: '上传详情',
                order: 2
            }
        };

        this.registerRoutes([statisticsRoute, detailRoute]);
        console.log(`✅ Upload Statistics Plugin routes registered: ${this.getRoutes().length} routes`);
    }

    // 用户上传事件处理函数
    private async onAfterUploaded(event: any): Promise<boolean> {
        try {
            const { message, ws, result } = event.args;
            const { libraryId, clientId, fields } = message;
            if (fields?.username === undefined) return false;

            const { username } = fields;
            const newData = Object.assign(result, {
                custom_fields: JSON.stringify(Object.assign(result.custom_fields ? JSON.parse(result.custom_fields) : {}, { uploader: username }))
            });
            this.dbService.updateFile(result.id, newData);
            return true;

        } catch (err) {
            console.error('Error in onAfterUploaded:', err);
            return false;
        }
    }

}


export function init(inst: any): UploadStatistics {
    return new UploadStatistics(inst);
}
