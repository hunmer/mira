import { Request, Response } from 'express';
import { MiraServer } from '../server';

export interface ApiResponse<T = any> {
    code: number;
    message: string;
    data: T | null;
}

export class BaseRouter {
    protected backend: MiraServer;

    constructor(backend: MiraServer) {
        this.backend = backend;
    }

    /**
     * 验证并获取Library对象
     */
    protected async validateLibrary(libraryId: string): Promise<{ success: boolean; library?: any; error?: ApiResponse }> {
        if (!libraryId) {
            return {
                success: false,
                error: {
                    code: 400,
                    message: 'Library ID is required',
                    data: null
                }
            };
        }

        const obj = this.backend.libraries!.getLibrary(libraryId);
        if (!obj) {
            return {
                success: false,
                error: {
                    code: 404,
                    message: 'Library not found',
                    data: null
                }
            };
        }

        return { success: true, library: obj };
    }

    /**
     * 发送成功响应
     */
    protected sendSuccess<T>(res: Response, data: T, message: string = 'Success'): void {
        res.json({
            code: 0,
            message,
            data
        });
    }

    /**
     * 发送错误响应
     */
    protected sendError(res: Response, code: number, message: string, data: any = null): void {
        res.status(code).json({
            code,
            message,
            data
        });
    }

    /**
     * 通用的CRUD操作处理器
     */
    protected async handleCrudOperation(
        req: Request,
        res: Response,
        operation: 'create' | 'update' | 'delete' | 'query' | 'getAll',
        serviceMethod: string,
        options: {
            requiresId?: boolean;
            successMessage?: string;
            dataTransform?: (data: any) => any;
            responseTransform?: (data: any) => any;
        } = {}
    ): Promise<void> {
        try {
            // 从请求中获取libraryId
            const libraryId = req.body.libraryId || req.query.libraryId as string;
            
            // 验证library
            const validation = await this.validateLibrary(libraryId);
            if (!validation.success) {
                res.status(validation.error!.code).json(validation.error);
                return;
            }

            const { library } = validation;

            // 验证必需的ID参数
            if (options.requiresId && !req.body.id) {
                res.status(400).json({
                    code: 400,
                    message: `ID is required for ${operation} operation`,
                    data: null
                });
                return;
            }

            // 准备参数并执行服务方法
            let result;
            
            switch (operation) {
                case 'create':
                    const { libraryId: _, ...createData } = req.body;
                    // 应用数据转换（如果提供）
                    const transformedCreateData = options.dataTransform ? options.dataTransform(createData) : createData;
                    result = await library.libraryService[serviceMethod](transformedCreateData);
                    break;
                    
                case 'update':
                    const { libraryId: __, id, ...updateData } = req.body;
                    // 应用数据转换（如果提供）
                    const transformedUpdateData = options.dataTransform ? options.dataTransform(updateData) : updateData;
                    result = await library.libraryService[serviceMethod](id, transformedUpdateData);
                    break;
                    
                case 'delete':
                    result = await library.libraryService[serviceMethod](req.body.id, req.body.deleteFiles);
                    break;
                    
                case 'query':
                    result = await library.libraryService[serviceMethod](req.body.query || {});
                    break;
                    
                case 'getAll':
                    result = await library.libraryService[serviceMethod]();
                    break;
                    
                default:
                    throw new Error(`Unsupported operation: ${operation}`);
            }

            // 应用响应转换（如果提供）
            const transformedResult = options.responseTransform ? options.responseTransform(result) : result;
            this.sendSuccess(res, transformedResult, options.successMessage);
            
        } catch (error) {
            console.error(`${operation} operation error:`, error);
            this.sendError(res, 500, 'Internal server error');
        }
    }

    /**
     * 处理文件关联操作（设置标签、文件夹等）
     */
    protected async handleFileAssociation(
        req: Request,
        res: Response,
        operation: 'set' | 'get',
        serviceMethod: string,
        associationType: string,
        options: {
            successMessage?: string;
        } = {}
    ): Promise<void> {
        try {
            const libraryId = req.body.libraryId || req.query.libraryId as string;
            const fileId = req.body.fileId || req.params.fileId;

            if (!fileId) {
                res.status(400).json({
                    code: 400,
                    message: 'File ID is required',
                    data: null
                });
                return;
            }

            const validation = await this.validateLibrary(libraryId);
            if (!validation.success) {
                res.status(validation.error!.code).json(validation.error);
                return;
            }

            const { library } = validation;

            let result;
            if (operation === 'set') {
                const associationValue = req.body[associationType];
                result = await library.libraryService[serviceMethod](fileId, associationValue);
                this.sendSuccess(res, { fileId, [associationType]: associationValue, result }, options.successMessage);
            } else {
                result = await library.libraryService[serviceMethod](parseInt(fileId));
                this.sendSuccess(res, { [associationType]: result });
            }
            
        } catch (error) {
            console.error(`${operation} file ${associationType} error:`, error);
            this.sendError(res, 500, 'Internal server error');
        }
    }
}
