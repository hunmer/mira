import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { randomUUID } from 'crypto';
import PQueue from 'p-queue';
import type { MiraServer } from '../';

/**
 * 下载执行器：消费用户已配置的 cookie 站点，把一批图片 URL 下载并入库到指定素材库。
 *
 * 流程（每个 URL）：
 *   1. 按 host 匹配该用户的 cookie 组（is_default 优先，否则同 url 第一组），拼 Cookie header
 *   2. axios stream 下载到 backend.dataPath/temp
 *   3. libraryService.createFileFromPath(tmp, { uploader, folder_id }, { importType:'move' })
 *      —— 自动 hash 去重 + 文件搬运 + 触发 file::created（生成缩略图）
 *   4. WebSocket 推送 download::progress / download::item 到对应 library
 *
 * 并发用 p-queue（同 MetadataService 模式）；进度存内存 Map，重启清空。
 */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface DownloadTaskInput {
    url: string;
    libraryId: string;
    userId: number;
    folderId?: number | null;
    clientId?: string | null;
}

export interface BatchProgress {
    batchId: string;
    total: number;
    completed: number;
    failed: number;
    skipped: number;
    done: boolean;
}

export class DownloadExecutorService {
    private readonly queue = new PQueue({ concurrency: 3 });
    private readonly progress = new Map<string, BatchProgress>();
    private readonly backend: MiraServer;

    constructor(backend: MiraServer) {
        this.backend = backend;
    }

    /** 拿 UserStorage（通过 httpServer.authRouter） */
    private getUserStorage() {
        return this.backend.httpServer!.authRouter.getAuthService().getUserStorage();
    }

    /** 入队一批下载任务，返回 batchId */
    async enqueueBatch(tasks: DownloadTaskInput[]): Promise<string> {
        const batchId = randomUUID();
        const progress: BatchProgress = {
            batchId,
            total: tasks.length,
            completed: 0,
            failed: 0,
            skipped: 0,
            done: false,
        };
        this.progress.set(batchId, progress);

        for (const task of tasks) {
            void this.queue.add(() => this.runOne(batchId, task, progress));
        }
        return batchId;
    }

    getProgress(batchId: string): BatchProgress | null {
        return this.progress.get(batchId) ?? null;
    }

    private async runOne(batchId: string, task: DownloadTaskInput, progress: BatchProgress): Promise<void> {
        const { url, libraryId, userId, folderId, clientId } = task;
        const ws = this.backend.webSocketServer;
        try {
            // 校验 library
            const libObj = this.backend.libraries?.getLibrary(libraryId);
            if (!libObj?.libraryService) throw new Error('素材库不可用');

            // 1. 匹配 cookie
            const cookieHeader = await this.matchCookieHeader(userId, url);

            // 2. 下载到 temp
            const tempDir = path.join(this.backend.dataPath, 'temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            const basename = this.guessFilename(url);
            const tmpPath = path.join(tempDir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${basename}`);

            const resp = await axios.get(url, {
                responseType: 'stream',
                headers: {
                    'User-Agent': USER_AGENT,
                    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
                },
                timeout: 60000,
                maxRedirects: 5,
            });
            await pipeline(resp.data, fs.createWriteStream(tmpPath));

            // 3. 入库（move 自动清理 temp + hash 去重）
            const result = await libObj.libraryService.createFileFromPath(
                tmpPath,
                { uploader: userId, folder_id: folderId ?? null },
                { importType: 'move' },
            );
            const isDup = result?.duplicate === true;
            if (!isDup && result?.id != null) {
                // 补写来源 URL 到 custom_fields，便于追溯（与插件窗口 addFromUrl 模式一致）
                try {
                    await libObj.libraryService.updateFile(result.id, {
                        custom_fields: { ...(result.custom_fields || {}), source_url: url },
                    });
                } catch { /* 元数据写入失败不影响下载结果 */ }
            }
            if (isDup) progress.skipped++; else progress.completed++;

            // 4. 推送
            ws?.broadcastLibraryEvent(libraryId, 'download::item', {
                batchId, url, status: isDup ? 'duplicate' : 'success', file: result, libraryId,
            });
            if (clientId) {
                const wsClient = ws?.getWsClientById(libraryId, clientId);
                wsClient && ws?.sendToWebsocket(wsClient, {
                    eventName: 'download::item',
                    data: { batchId, url, status: isDup ? 'duplicate' : 'success', libraryId },
                });
            }
        } catch (e: any) {
            progress.failed++;
            ws?.broadcastLibraryEvent(libraryId, 'download::item', {
                batchId, url, status: 'failed', error: e?.message || String(e), libraryId,
            });
        } finally {
            // 更新整体进度并推送
            progress.done = progress.completed + progress.failed + progress.skipped >= progress.total;
            ws?.broadcastLibraryEvent(libraryId, 'download::progress', { ...progress, libraryId });
            if (clientId) {
                const wsClient = ws?.getWsClientById(libraryId, clientId);
                wsClient && ws?.sendToWebsocket(wsClient, {
                    eventName: 'download::progress',
                    data: { ...progress, libraryId },
                });
            }
        }
    }

    /** 按 host 匹配该用户的 cookie 组：is_default 优先，否则该 url 第一组。返回 "a=b; c=d" 或空串 */
    private async matchCookieHeader(userId: number, url: string): Promise<string> {
        try {
            const host = new URL(url).host;
            const sites = await this.getUserStorage().listCookieSites(userId);
            const sameHost = sites.filter((s: any) => {
                try { return new URL(s.url).host === host; } catch { return false; }
            });
            const chosen = sameHost.find((s: any) => s.isDefault) || sameHost[0];
            const cookies: any[] = chosen?.cookies || [];
            return cookies.map((c) => `${c.name}=${c.value}`).filter(Boolean).join('; ');
        } catch {
            return '';
        }
    }

    /** 从 URL 猜测文件名，失败则用占位名 */
    private guessFilename(url: string): string {
        try {
            const u = new URL(url);
            const last = u.pathname.split('/').filter(Boolean).pop();
            if (last && /\.[A-Za-z0-9]{2,5}$/.test(last)) return last.slice(0, 120);
        } catch { /* ignore */ }
        return `mira-${Date.now()}.bin`;
    }
}
