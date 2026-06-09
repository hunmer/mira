import { HttpClient } from '../client/HttpClient';
import {
    DatabaseTable,
    TableColumn,
} from '../types';

/**
 * 数据库模块
 * 处理数据库表信息查询和数据访问
 */
export class DatabaseModule {
    constructor(private httpClient: HttpClient) { }

    /**
     * 获取数据库中所有表的信息
     * @returns Promise<DatabaseTable[]>
     */
    async getTables(): Promise<DatabaseTable[]> {
        return await this.httpClient.get<DatabaseTable[]>('/api/database/tables');
    }

    /**
     * 获取指定表的数据
     * @param tableName 表名
     * @returns Promise<any[]>
     */
    async getTableData(tableName: string): Promise<any[]> {
        return await this.httpClient.get<any[]>(`/api/database/tables/${tableName}/data`);
    }

    /**
     * 获取指定表的结构信息
     * @param tableName 表名
     * @returns Promise<TableColumn[]>
     */
    async getTableSchema(tableName: string): Promise<TableColumn[]> {
        return await this.httpClient.get<TableColumn[]>(`/api/database/tables/${tableName}/schema`);
    }

    /**
     * 检查表是否存在
     * @param tableName 表名
     * @returns Promise<boolean>
     */
    async tableExists(tableName: string): Promise<boolean> {
        try {
            const tables = await this.getTables();
            return tables.some(table => table.name === tableName);
        } catch {
            return false;
        }
    }

    /**
     * 获取表的行数
     * @param tableName 表名
     * @returns Promise<number>
     */
    async getTableRowCount(tableName: string): Promise<number> {
        const tables = await this.getTables();
        const table = tables.find(t => t.name === tableName);
        return table ? table.rowCount : 0;
    }

    /**
     * 获取表的详细信息（包含数据和结构）
     * @param tableName 表名
     * @returns Promise<{table: DatabaseTable, schema: TableColumn[], data: any[]}>
     */
    async getTableDetails(tableName: string): Promise<{
        table: DatabaseTable;
        schema: TableColumn[];
        data: any[];
    }> {
        const [tables, schema, data] = await Promise.all([
            this.getTables(),
            this.getTableSchema(tableName),
            this.getTableData(tableName),
        ]);

        const table = tables.find(t => t.name === tableName);
        if (!table) {
            throw new Error(`Table ${tableName} not found`);
        }

        return { table, schema, data };
    }

    /**
     * 获取所有表的基本信息
     * @returns Promise<{name: string, rowCount: number}[]>
     */
    async getTablesInfo(): Promise<Array<{ name: string; rowCount: number }>> {
        const tables = await this.getTables();
        return tables.map(table => ({
            name: table.name,
            rowCount: table.rowCount,
        }));
    }

    /**
     * 搜索包含指定关键词的表名
     * @param keyword 搜索关键词
     * @returns Promise<DatabaseTable[]>
     */
    async searchTables(keyword: string): Promise<DatabaseTable[]> {
        const tables = await this.getTables();
        const lowerKeyword = keyword.toLowerCase();

        return tables.filter(table =>
            table.name.toLowerCase().includes(lowerKeyword)
        );
    }

    /**
     * 获取表中的主键列
     * @param tableName 表名
     * @returns Promise<TableColumn[]>
     */
    async getPrimaryKeys(tableName: string): Promise<TableColumn[]> {
        const schema = await this.getTableSchema(tableName);
        return schema.filter(column => column.pk === 1);
    }

    /**
     * 获取表中的非空列
     * @param tableName 表名
     * @returns Promise<TableColumn[]>
     */
    async getNotNullColumns(tableName: string): Promise<TableColumn[]> {
        const schema = await this.getTableSchema(tableName);
        return schema.filter(column => column.notnull === 1);
    }

    /**
     * 获取表中有默认值的列
     * @param tableName 表名
     * @returns Promise<TableColumn[]>
     */
    async getColumnsWithDefaults(tableName: string): Promise<TableColumn[]> {
        const schema = await this.getTableSchema(tableName);
        return schema.filter(column => column.dflt_value !== null);
    }

    /**
     * 按行数排序获取表列表
     * @param order 排序方式 'asc' | 'desc'
     * @returns Promise<DatabaseTable[]>
     */
    async getTablesByRowCount(order: 'asc' | 'desc' = 'desc'): Promise<DatabaseTable[]> {
        const tables = await this.getTables();
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
     * @returns Promise<DatabaseTable[]>
     */
    async getEmptyTables(): Promise<DatabaseTable[]> {
        const tables = await this.getTables();
        return tables.filter(table => table.rowCount === 0);
    }

    /**
     * 获取非空表列表
     * @returns Promise<DatabaseTable[]>
     */
    async getNonEmptyTables(): Promise<DatabaseTable[]> {
        const tables = await this.getTables();
        return tables.filter(table => table.rowCount > 0);
    }
}
