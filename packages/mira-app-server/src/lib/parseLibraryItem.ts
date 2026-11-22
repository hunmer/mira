import { Request, Response } from 'express';
import { FileService } from './FileService';

/**
 * 解析 :libraryId/:id 路由参数对应的库服务与素材。
 * 失败时已向客户端发送 404，返回 void；调用方判断返回值即可。
 */
export async function parseLibraryItem(
    files: FileService,
    req: Request,
    res: Response,
): Promise<{ service: any; item: any } | void> {
    const { libraryId, id } = req.params;
    const library = files.getLibrary(libraryId);
    if (!library) {
        res.status(404).send('Library not found');
        return;
    }

    const item = await library.libraryService.getFile(parseInt(id));
    if (!item) {
        res.status(404).send('Item not found');
        return;
    }
    return { service: library.libraryService, item };
}
