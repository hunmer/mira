export type { User } from './types';
import { Database } from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

// 用户接口定义

import type { User, Session } from './types';

/** expires_at 哨兵值：永不过期 */
export const NEVER_EXPIRES = -1;

/** API Token 信息（不含 user_id，面向接口输出） */
export interface ApiTokenInfo {
    id: number;
    name: string;
    token: string;
    createdAt: number;
    expiresAt: number; // -1 表示永不过期
}

export class UserStorage {
    private db: Database | null = null;
    private dbPath: string;

    constructor(dataDir: string = './data') {
        // 确保数据目录存在
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        this.dbPath = path.join(dataDir, 'users.db');
    }

    async initialize(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db = new Database(this.dbPath, async (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                try {
                    await this.createTables();
                    await this.createDefaultAdmin();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    private async createTables(): Promise<void> {
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT,
                role TEXT NOT NULL DEFAULT 'user',
                permissions TEXT NOT NULL DEFAULT '[]',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT 1
            )
        `;

        const createSessionsTable = `
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `;

        await this.executeSql(createUsersTable);
        await this.executeSql(createSessionsTable);

        // 老库迁移：sessions 表补 name / kind 列（kind='token' 为手动创建的 API Token，'session' 为登录会话）
        await this.ensureColumn('sessions', 'name', "TEXT NOT NULL DEFAULT ''");
        await this.ensureColumn('sessions', 'kind', "TEXT NOT NULL DEFAULT 'session'");

        // 创建索引以提高查询性能
        await this.executeSql('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
        await this.executeSql('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)');
        await this.executeSql('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');

        // 下载站点 cookie 管理（按用户私有，同一 url 可有多组，其中至多一组 is_default=1）
        const createCookieSitesTable = `
            CREATE TABLE IF NOT EXISTS cookie_sites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                cookies TEXT NOT NULL DEFAULT '[]',
                remark TEXT DEFAULT '',
                label TEXT NOT NULL DEFAULT '',
                is_default INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `;
        await this.executeSql(createCookieSitesTable);
        await this.executeSql('CREATE INDEX IF NOT EXISTS idx_cookie_sites_user ON cookie_sites(user_id)');
        // 老库迁移：cookie_sites 表已存在但缺 label / is_default 列时补上（幂等）
        await this.ensureColumn('cookie_sites', 'label', "TEXT NOT NULL DEFAULT ''");
        await this.ensureColumn('cookie_sites', 'is_default', 'INTEGER NOT NULL DEFAULT 0');
    }

    /** 幂等加列：若表已存在但缺 col 列，则 ALTER TABLE ADD COLUMN。 */
    private async ensureColumn(table: string, col: string, def: string): Promise<void> {
        const rows = await this.getSql(`PRAGMA table_info(${table})`);
        if (!rows.some((r: any) => r.name === col)) {
            await this.executeSql(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
        }
    }

    private async createDefaultAdmin(): Promise<void> {
        const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';

        // 检查是否已存在管理员用户
        const existingAdmin = await this.findUserByUsername(adminUsername);
        if (existingAdmin) {
            return;
        }

        // 创建默认超级管理员用户
        const hashedPassword = this.hashPassword(adminPassword);
        const now = Date.now();

        const admin: Omit<User, 'id'> = {
            username: adminUsername,
            password: hashedPassword,
            role: 'super',
            permissions: ['*'],
            created_at: now,
            updated_at: now,
            is_active: true
        };

        const adminId = await this.createUser(admin);
    }

    // 密码哈希
    public hashPassword(password: string): string {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return `${salt}:${hash}`;
    }

    // 验证密码
    private verifyPassword(password: string, hashedPassword: string): boolean {
        const [salt, hash] = hashedPassword.split(':');
        const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return hash === verifyHash;
    }

    public verifyPasswordDirect(password: string, hashedPassword: string): boolean {
        return this.verifyPassword(password, hashedPassword);
    }

    // 生成令牌
    generateToken(userId: number): string {
        const randomBytes = crypto.randomBytes(32).toString('hex');
        return `mira-token-${userId}-${Date.now()}-${randomBytes}`;
    }

    // 用户操作方法
    async createUser(userData: Omit<User, 'id'>): Promise<number> {
        const query = `
            INSERT INTO users (username, password, email, role, permissions, created_at, updated_at, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            userData.username,
            userData.password,
            userData.email || null,
            userData.role,
            JSON.stringify(userData.permissions),
            userData.created_at,
            userData.updated_at,
            userData.is_active ? 1 : 0
        ];

        const result = await this.runSql(query, params);
        return result.lastID;
    }

    async findUserByUsername(username: string): Promise<User | null> {
        const query = 'SELECT * FROM users WHERE username = ? AND is_active = 1 LIMIT 1';
        const rows = await this.getSql(query, [username]);

        if (rows.length === 0) {
            return null;
        }

        return this.rowToUser(rows[0]);
    }

    // 查找用户名（包括已删除的用户）
    async findUserByUsernameIncludeInactive(username: string): Promise<User | null> {
        const query = 'SELECT * FROM users WHERE username = ? LIMIT 1';
        const rows = await this.getSql(query, [username]);

        if (rows.length === 0) {
            return null;
        }

        return this.rowToUser(rows[0]);
    }

    async findUserById(id: number): Promise<User | null> {
        const query = 'SELECT * FROM users WHERE id = ? AND is_active = 1 LIMIT 1';
        const rows = await this.getSql(query, [id]);

        if (rows.length === 0) {
            return null;
        }

        return this.rowToUser(rows[0]);
    }

    async authenticateUser(username: string, password: string): Promise<User | null> {
        const user = await this.findUserByUsername(username);
        if (!user) {
            return null;
        }

        if (this.verifyPassword(password, user.password)) {
            return user;
        }

        return null;
    }

    // 会话管理方法
    async createSession(userId: number, tokenLifetime: number = 24 * 60 * 60 * 1000): Promise<string> {
        const token = this.generateToken(userId);
        const now = Date.now();
        const expiresAt = now + tokenLifetime;

        const query = `
            INSERT INTO sessions (token, user_id, created_at, expires_at, is_active)
            VALUES (?, ?, ?, ?, 1)
        `;

        await this.runSql(query, [token, userId, now, expiresAt]);
        return token;
    }

    async validateSession(token: string): Promise<User | null> {
        const query = `
            SELECT s.*, u.* FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ? AND s.is_active = 1 AND (s.expires_at = ${NEVER_EXPIRES} OR s.expires_at > ?) AND u.is_active = 1
            LIMIT 1
        `;

        const rows = await this.getSql(query, [token, Date.now()]);

        if (rows.length === 0) {
            return null;
        }

        return this.rowToUser(rows[0]);
    }

    async revokeSession(token: string): Promise<boolean> {
        const query = 'UPDATE sessions SET is_active = 0 WHERE token = ?';
        const result = await this.runSql(query, [token]);
        return result.changes > 0;
    }

    async revokeAllUserSessions(userId: number): Promise<boolean> {
        const query = 'UPDATE sessions SET is_active = 0 WHERE user_id = ?';
        const result = await this.runSql(query, [userId]);
        return result.changes > 0;
    }

    // 清理过期会话（expires_at = -1 表示永不过期，不清理）
    async cleanupExpiredSessions(): Promise<number> {
        const query = `DELETE FROM sessions WHERE (expires_at != ${NEVER_EXPIRES} AND expires_at < ?) OR is_active = 0`;
        const result = await this.runSql(query, [Date.now()]);
        return result.changes;
    }

    // ==================== API Token 管理（基于 sessions 表，kind='token'）====================

    private rowToApiToken(row: any): ApiTokenInfo {
        return {
            id: row.rowid ?? row.id,
            name: row.name || '',
            token: row.token,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
        };
    }

    /** 列出用户的所有 API Token（不含登录会话） */
    async listUserTokens(userId: number): Promise<ApiTokenInfo[]> {
        const rows = await this.getSql(
            `SELECT rowid, * FROM sessions WHERE user_id = ? AND kind = 'token' AND is_active = 1 ORDER BY created_at DESC`,
            [userId],
        );
        return rows.map((r) => this.rowToApiToken(r));
    }

    /** 创建 API Token。expiresInDays 为 null/undefined 时永不过期 */
    async createUserToken(userId: number, data: { name?: string; expiresInDays?: number | null }): Promise<ApiTokenInfo> {
        const token = this.generateToken(userId);
        const now = Date.now();
        const expiresAt = data.expiresInDays && data.expiresInDays > 0
            ? now + data.expiresInDays * 24 * 60 * 60 * 1000
            : NEVER_EXPIRES;

        const result = await this.runSql(
            `INSERT INTO sessions (token, user_id, created_at, expires_at, is_active, name, kind) VALUES (?, ?, ?, ?, 1, ?, 'token')`,
            [token, userId, now, expiresAt, data.name || ''],
        );
        const rows = await this.getSql(`SELECT rowid, * FROM sessions WHERE rowid = ?`, [result.lastID]);
        return this.rowToApiToken(rows[0]);
    }

    /** 更新 API Token（名称 / 过期时间）。expiresInDays 为 null 时改为永不过期，数值则从当前时间起重新计算 */
    async updateUserToken(userId: number, tokenId: number, data: { name?: string; expiresInDays?: number | null }): Promise<ApiTokenInfo | null> {
        const fields: string[] = [];
        const params: any[] = [];
        if (data.name !== undefined) {
            fields.push('name = ?');
            params.push(data.name);
        }
        if (data.expiresInDays !== undefined) {
            const expiresAt = data.expiresInDays && data.expiresInDays > 0
                ? Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000
                : NEVER_EXPIRES;
            fields.push('expires_at = ?');
            params.push(expiresAt);
        }
        if (fields.length) {
            params.push(tokenId, userId);
            await this.runSql(
                `UPDATE sessions SET ${fields.join(', ')} WHERE rowid = ? AND user_id = ? AND kind = 'token'`,
                params,
            );
        }
        const rows = await this.getSql(`SELECT rowid, * FROM sessions WHERE rowid = ? AND user_id = ? AND kind = 'token'`, [tokenId, userId]);
        return rows.length ? this.rowToApiToken(rows[0]) : null;
    }

    /** 删除 API Token */
    async deleteUserToken(userId: number, tokenId: number): Promise<boolean> {
        const result = await this.runSql(
            `DELETE FROM sessions WHERE rowid = ? AND user_id = ? AND kind = 'token'`,
            [tokenId, userId],
        );
        return result.changes > 0;
    }

    /** 各用户的 API Token 数量（user_id → count），用于列表展示 */
    async getUserTokenCounts(): Promise<Map<number, number>> {
        const rows = await this.getSql(
            `SELECT user_id, COUNT(*) as count FROM sessions WHERE kind = 'token' AND is_active = 1 GROUP BY user_id`,
        );
        const map = new Map<number, number>();
        for (const row of rows) {
            map.set(row.user_id, row.count);
        }
        return map;
    }

    // 工具方法
    private rowToUser(row: any): User {
        return {
            id: row.id,
            username: row.username,
            password: row.password,
            role: row.role,
            permissions: JSON.parse(row.permissions || '[]'),
            created_at: row.created_at,
            updated_at: row.updated_at,
            is_active: Boolean(row.is_active)
        };
    }

    // 获取用户信息（不包含密码）
    getUserInfo(user: User) {
        const { password, ...userInfo } = user;
        return userInfo;
    }

    // 获取所有用户
    async getAllUsers(): Promise<User[]> {
        const rows = await this.getSql('SELECT * FROM users WHERE is_active = 1 ORDER BY created_at DESC');
        return rows.map(row => this.rowToUser(row));
    }

    // 更新用户信息
    async updateUser(id: number, userData: Partial<Omit<User, 'id' | 'created_at'>>): Promise<boolean> {
        const fields: string[] = [];
        const params: any[] = [];

        if (userData.username !== undefined) {
            fields.push('username = ?');
            params.push(userData.username);
        }
        if (userData.email !== undefined) {
            fields.push('email = ?');
            params.push(userData.email);
        }
        if (userData.password !== undefined) {
            fields.push('password = ?');
            params.push(this.hashPassword(userData.password));
        }
        if (userData.role !== undefined) {
            fields.push('role = ?');
            params.push(userData.role);
        }
        if (userData.permissions !== undefined) {
            fields.push('permissions = ?');
            params.push(JSON.stringify(userData.permissions));
        }

        if (fields.length === 0) {
            return false; // 没有需要更新的字段
        }

        fields.push('updated_at = ?');
        params.push(Date.now());
        params.push(id);

        const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND is_active = 1`;
        const result = await this.runSql(query, params);
        return result.changes > 0;
    }

    // 软删除用户
    async softDeleteUser(id: number): Promise<boolean> {
        const query = 'UPDATE users SET is_active = 0, updated_at = ? WHERE id = ? AND is_active = 1';
        const result = await this.runSql(query, [Date.now(), id]);

        if (result.changes > 0) {
            // 撤销该用户的所有会话
            await this.revokeAllUserSessions(id);
            return true;
        }
        return false;
    }

    // 硬删除用户（彻底删除记录）
    async hardDeleteUser(id: number): Promise<boolean> {
        // 先删除相关的会话记录
        await this.revokeAllUserSessions(id);

        // 然后删除用户记录
        const query = 'DELETE FROM users WHERE id = ?';
        const result = await this.runSql(query, [id]);

        return result.changes > 0;
    }

    // 删除非活跃用户（清理已软删除的用户，释放用户名）
    async deleteInactiveUsers(): Promise<number> {
        // 先删除这些用户的会话
        const inactiveUsersQuery = 'SELECT id FROM users WHERE is_active = 0';
        const inactiveUsers = await this.getSql(inactiveUsersQuery, []);

        for (const user of inactiveUsers) {
            await this.revokeAllUserSessions(user.id);
        }

        // 删除非活跃用户
        const deleteQuery = 'DELETE FROM users WHERE is_active = 0';
        const result = await this.runSql(deleteQuery, []);

        return result.changes;
    }

    // 检查用户名是否存在(用于创建和更新时验证)
    async isUsernameExists(username: string, excludeId?: number): Promise<boolean> {
        let query = 'SELECT COUNT(*) as count FROM users WHERE username = ? AND is_active = 1';
        const params: any[] = [username];

        if (excludeId !== undefined) {
            query += ' AND id != ?';
            params.push(excludeId);
        }

        const rows = await this.getSql(query, params);
        return rows[0].count > 0;
    }

    // 根据权限获取用户（扩展查询方法）
    async getUsersWithPermission(permission: string): Promise<User[]> {
        const users = await this.getAllUsers();
        return users.filter(user =>
            user.permissions.includes('*') ||
            user.permissions.includes('admin:*') ||
            user.permissions.includes(permission)
        );
    }

    // 数据库操作工具方法
    private executeSql(sql: string, params?: any[]): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            this.db.run(sql, params, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    private runSql(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            this.db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }

    private getSql(sql: string, params?: any[]): Promise<any[]> {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async close(): Promise<void> {
        if (this.db) {
            return new Promise((resolve) => {
                this.db!.close(() => {
                    this.db = null;
                    resolve();
                });
            });
        }
    }

    // ==================== Cookie 站点管理（按用户私有）====================
    // 行 → CookieSite
    private rowToCookieSite(row: any): any {
        return {
            id: row.id,
            userId: row.user_id,
            name: row.name,
            url: row.url,
            cookies: JSON.parse(row.cookies || '[]'),
            remark: row.remark || '',
            label: row.label || '',
            isDefault: Boolean(row.is_default),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    async listCookieSites(userId: number): Promise<any[]> {
        const rows = await this.getSql(
            'SELECT * FROM cookie_sites WHERE user_id = ? ORDER BY url ASC, is_default DESC, updated_at DESC',
            [userId],
        );
        return rows.map((r) => this.rowToCookieSite(r));
    }

    async createCookieSite(userId: number, data: { name: string; url: string; remark?: string; cookies?: any[]; label?: string; isDefault?: boolean }): Promise<any> {
        const now = Date.now();
        const cookies = Array.isArray(data.cookies) ? data.cookies : [];
        const isDefault = data.isDefault ? 1 : 0;
        // 若设为默认，先把同 url 的其他组清零
        if (isDefault) await this.clearDefaultForUrl(userId, data.url);
        const result = await this.runSql(
            `INSERT INTO cookie_sites (user_id, name, url, cookies, remark, label, is_default, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, data.name, data.url, JSON.stringify(cookies), data.remark || '', data.label || '', isDefault, now, now],
        );
        const rows = await this.getSql('SELECT * FROM cookie_sites WHERE id = ?', [result.lastID]);
        return rows.length ? this.rowToCookieSite(rows[0]) : null;
    }

    async updateCookieSite(userId: number, id: number, data: { name?: string; url?: string; remark?: string; cookies?: any[]; label?: string; isDefault?: boolean }): Promise<any | null> {
        const fields: string[] = [];
        const params: any[] = [];
        if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
        if (data.url !== undefined) { fields.push('url = ?'); params.push(data.url); }
        if (data.remark !== undefined) { fields.push('remark = ?'); params.push(data.remark); }
        if (data.label !== undefined) { fields.push('label = ?'); params.push(data.label); }
        if (data.cookies !== undefined) {
            fields.push('cookies = ?');
            params.push(JSON.stringify(Array.isArray(data.cookies) ? data.cookies : []));
        }
        if (data.isDefault !== undefined) {
            fields.push('is_default = ?');
            params.push(data.isDefault ? 1 : 0);
        }
        if (fields.length === 0) {
            const rows = await this.getSql('SELECT * FROM cookie_sites WHERE id = ? AND user_id = ?', [id, userId]);
            return rows.length ? this.rowToCookieSite(rows[0]) : null;
        }
        fields.push('updated_at = ?'); params.push(Date.now());
        params.push(id); params.push(userId);
        await this.runSql(`UPDATE cookie_sites SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, params);
        // 设为默认时联动清零同 url 其他组
        if (data.isDefault) {
            const rows = await this.getSql('SELECT url FROM cookie_sites WHERE id = ? AND user_id = ?', [id, userId]);
            if (rows.length) await this.clearDefaultForUrl(userId, rows[0].url, id);
        }
        const rows = await this.getSql('SELECT * FROM cookie_sites WHERE id = ? AND user_id = ?', [id, userId]);
        return rows.length ? this.rowToCookieSite(rows[0]) : null;
    }

    /** 把某用户某 url 下所有组 is_default 置 0，exceptId 对应的除外 */
    private async clearDefaultForUrl(userId: number, url: string, exceptId?: number): Promise<void> {
        if (exceptId != null) {
            await this.runSql('UPDATE cookie_sites SET is_default = 0 WHERE user_id = ? AND url = ? AND id != ?', [userId, url, exceptId]);
        } else {
            await this.runSql('UPDATE cookie_sites SET is_default = 0 WHERE user_id = ? AND url = ?', [userId, url]);
        }
    }

    /** 把指定组设为该站点的默认组（同 url 其他组自动取消） */
    async setDefaultCookieSite(userId: number, id: number): Promise<any | null> {
        const rows = await this.getSql('SELECT url FROM cookie_sites WHERE id = ? AND user_id = ?', [id, userId]);
        if (!rows.length) return null;
        await this.clearDefaultForUrl(userId, rows[0].url);
        await this.runSql('UPDATE cookie_sites SET is_default = 1, updated_at = ? WHERE id = ? AND user_id = ?', [Date.now(), id, userId]);
        const after = await this.getSql('SELECT * FROM cookie_sites WHERE id = ? AND user_id = ?', [id, userId]);
        return after.length ? this.rowToCookieSite(after[0]) : null;
    }

    async deleteCookieSite(userId: number, id: number): Promise<boolean> {
        const result = await this.runSql('DELETE FROM cookie_sites WHERE id = ? AND user_id = ?', [id, userId]);
        return result.changes > 0;
    }
}
