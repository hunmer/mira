import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

export class FsRouter {
    private router: Router;

    constructor() {
        this.router = Router();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        this.router.post('/mkdir', async (req: Request, res: Response) => {
            try {
                const { path: parentPath, name } = req.body;
                if (!parentPath || !name) {
                    res.status(400).json({ error: 'path and name are required' });
                    return;
                }
                const newPath = path.join(parentPath, name);
                await fs.promises.mkdir(newPath);
                res.json({ label: name, value: newPath, isLeaf: false });
            } catch (error: any) {
                res.status(500).json({ error: error.message || 'Failed to create directory' });
            }
        });

        this.router.get('/dirs', async (req: Request, res: Response) => {
            try {
                const dirPath = req.query.path as string;

                if (!dirPath) {
                    if (process.platform === 'win32') {
                        const drives: any[] = [];
                        for (let i = 65; i <= 90; i++) {
                            const drive = `${String.fromCharCode(i)}:\\`;
                            try {
                                fs.accessSync(drive);
                                drives.push({ label: drive, value: drive, isLeaf: false });
                            } catch { /* drive not available */ }
                        }
                        res.json(drives);
                        return;
                    }
                    // Unix: list root
                    const rootEntries = await fs.promises.readdir('/', { withFileTypes: true });
                    const dirs = rootEntries
                        .filter(e => e.isDirectory() && !e.name.startsWith('.'))
                        .map(e => ({ label: e.name, value: `/${e.name}`, isLeaf: false }))
                        .sort((a, b) => a.label.localeCompare(b.label));
                    res.json(dirs);
                    return;
                }

                const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
                const dirs = entries
                    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
                    .map(e => ({ label: e.name, value: path.join(dirPath, e.name), isLeaf: false }))
                    .sort((a, b) => a.label.localeCompare(b.label));
                res.json(dirs);
            } catch (error: any) {
                res.status(500).json({ error: error.message || 'Failed to list directories' });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}
