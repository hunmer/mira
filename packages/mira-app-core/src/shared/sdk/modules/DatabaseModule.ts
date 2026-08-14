import { HttpClient } from '../client/HttpClient';
import {
    DatabaseTable,
    TableColumn,
} from '../types';

/**
 * 数据库模块
 * 处理数据库表信息查询和数据访问
 *
 * 注意：服务端 /api/database/* 路由强制要求 libraryId 查询参数，
 * 因此本模块所有方法都需传入 libraryId 以定位目标素材库的数据库。
 */
export class DatabaseModule {
    constructor(private httpClient: HttpClient) { }

    /**
     * 获取数据库中所有表的信息
     * @param libraryId 素材库ID
     * @returns Promise<DatabaseTable[]>
     */
    async getTables(libraryId: string): Promise<DatabaseTable[]> {
        return await this.httpClient.get<DatabaseTable[]>(`/api/database/tables?libraryId=${encodeURIComponent(libraryId)}`);
    }

    /**
     * 执行只读 SQL 查询
     * @param libraryId 素材库ID
     * @param sql SQL 查询语句
     * @returns Promise<any[]> 查询结果行
     */
    async query(libraryId: string, sql: string): Promise<any[]> {
        return await this.httpClient.post<any[]>('/api/database/query', { libraryId, sql });
    }

    /**
     * 获取指定表的数据
     * @param libraryId 素材库ID
     * @param tableName 表名
     * @returns Promise<any[]>
     */
    async getTableData(libraryId: string, tableName: string): Promise<any[]> {
        return await this.httpClient.get<any[]>(`/api/database/tables/${encodeURIComponent(tableName)}/data?libraryId=${encodeURIComponent(libraryId)}`);
    }

    /**
     * 获取指定表的结构信息
     * @param libraryId 素材库ID
     * @param tableName 表名
     * @returns Promise<TableColumn[]>
     */
    async getTableSchema(libraryId: string, tableName: string): Promise<TableColumn[]> {
        return await this.httpClient.get<TableColumn[]>(`/api/database/tables/${encodeURIComponent(tableName)}/schema?libraryId=${encodeURIComponent(libraryId)}`);
    }

    /**
     * 检查表是否存在
     * @param libraryId 素材库ID
     * @param tableName 表名
     * @returns Promise<boolean>
     */
    async tableExists(libraryId: string, tableName: string): Promise<boolean> {
        try {
            const tables = await this.getTables(libraryId);
            return tables.some(table => table.name === tableName);
        } catch {
            return false;
        }
    }

    /**
     * 获取表的行数
     * @param libraryId 素材库ID
     * @param tableName 表名
     * @returns Promise<number>
     */
    async getTableRowCount(libraryId: string, tableName: string): Promise<number> {
        const tables = await this.getTables(libraryId);
        const table = tables.find(t => t.name === tableName);
        return table ? table.rowCount : 0;
    }

    /**
     * 获取表的详细信息（包含数据和结构）
     * @param libraryId 素材库ID
     * @param tableName 表名
     * @returns Promise<{table: DatabaseTable, schema: TableColumn[], data: any[]}>
     */
    async getTableDetails(libraryId: string, tableName: string): Promise<{
        table: DatabaseTable;
        schema: TableColumn[];
        data: any[];
    }> {
        const [tables, schema, data] = await Promise.all([
            this.getTables(libraryId),
            this.getTableSchema(libraryId, tableName),
            this.getTableData(libraryId, tableName),
        ]);

        const table = tables.find(t => t.name === tableName);
        if (!table) {
            throw new Error(`Table ${tableName} not found`);
        }

        return { table, schema, data };
    }

    /**
     * 获取所有表的基本信息
     * @param libraryId 素材库ID
     * @returns Promise<{name: string, rowCount: number}[]>
     */
    async getTablesInfo(libraryId: string): Promise<Array<{ name: string; rowCount: number }>> {
        const tables = await this.getTables(libraryId);
        return tables.map(table => ({
            name: table.name,
            rowCount: table.rowCount,
        }));
    }

    /**
     * 搜索包含指定关键词的表名
     * @param libraryId 素材库ID
     * @param keyword 搜索关键词
     * @returns Promise<DatabaseTable[]>
     */
    async searchTables(libraryId: string, keyword: string): Promise<DatabaseTable[]> {
        const tables = await this.getTables(libraryId);
        const lowerKeyword = keyword.toLowerCase();

        return tables.filter(table =>
            table.name.toLowerCase().includes(lowerKeyword)
        );
    }

    /**
     * 获取表中的主键列
     * @param libraryId 素材库ID
     * @param tableName 表名
     * @returns Promise<TableColumn[]>
     */
    async getPrimaryKeys(libraryId: string, tableName: string): Promise<TableColumn[]> {
        const schema = await this.getTableSchema(libraryId, tableName);
        return schema.filter(column => column.pk === 1);
    }

    /**
     * 获取表中的非空列
     * @param libraryId 素材库ID
     * @param tableName 表名
     * @returns Promise<TableColumn[]>
     */
    async getNotNullColumns(libraryId: string, tableName: string): Promise<TableColumn[]> {
        const schema = await this.getTableSchema(libraryId, tableName);
        return schema.filter(column => column.notnull === 1);
    }

    /**
     * 获取表中有默认值的列
     * @param libraryId 素材库ID
     * @param tableName 表名
     * @returns Promise<TableColumn[]>
     */
    async getColumnsWithDefaults(libraryId: string, tableName: string): Promise<TableColumn[]> {
        const schema = await this.getTableSchema(libraryId, tableName);
        return schema.filter(column => column.dflt_value !== null);
    }

    /**
     * 按行数排序获取表列表
     * @param libraryId 素材库ID
     * @param order 排序方式 'asc' | 'desc'
     * @returns Promise<DatabaseTable[]>
     */
    async getTablesByRowCount(libraryId: string, order: 'asc' | 'desc' = 'desc'): Promise<DatabaseTable[]> {
        const tables = await this.getTables(libraryId);
        return tables.sort((a, b) => {
            if (order === 'asc') {
                return a.rowCount - b.rowCount;
            } else {
                return b.rowCount - a.rowCount;
            }
        });
    }

    /**
     * 获取空表列表
     * @param libraryId 素材库ID
     * @returns Promise<DatabaseTable[]>
     */
    async getEmptyTables(libraryId: string): Promise<DatabaseTable[]> {
        const tables = await this.getTables(libraryId);
        return tables.filter(table => table.rowCount === 0);
    }

    /**
     * 获取非空表列表
     * @param libraryId 素材库ID
     * @returns Promise<DatabaseTable[]>
     */
    async getNonEmptyTables(libraryId: string): Promise<DatabaseTable[]> {
        const tables = await this.getTables(libraryId);
        return tables.filter(table => table.rowCount > 0);
    }
}
