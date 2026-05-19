export type { User } from './types';
import { Database } from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

// 用户接口定义

import type { User, Session } from './types';

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
                    console.log('✅ 用户数据库初始化完成');
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

        // 创建索引以提高查询性能
        await this.executeSql('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
        await this.executeSql('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)');
        await this.executeSql('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');
    }

    private async createDefaultAdmin(): Promise<void> {
        const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';

        // 检查是否已存在管理员用户
        const existingAdmin = await this.findUserByUsername(adminUsername);
        if (existingAdmin) {
            console.log(`📝 管理员用户 '${adminUsername}' 已存在`);
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
        console.log(`✅ 默认管理员用户创建成功: ${adminUsername} (ID: ${adminId})`);
        console.log(`🔑 初始密码: ${adminPassword}`);
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
            WHERE s.token = ? AND s.is_active = 1 AND s.expires_at > ? AND u.is_active = 1
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

    // 清理过期会话
    async cleanupExpiredSessions(): Promise<number> {
        const query = 'DELETE FROM sessions WHERE expires_at < ? OR is_active = 0';
        const result = await this.runSql(query, [Date.now()]);
        return result.changes;
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
}
