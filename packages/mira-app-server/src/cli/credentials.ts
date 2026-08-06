/**
 * 多 profile 凭证存储
 *
 * 将登录凭证持久化到 ~/.mira/credentials.json，支持多个命名 profile，
 * 通过 current 指针记录当前激活的 profile，便于在不同服务器/账号间切换。
 *
 * 文件结构：
 * {
 *   "current": "default",
 *   "profiles": {
 *     "default": { "server": "...", "token": "...", "username": "...", "updatedAt": "..." }
 *   }
 * }
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

/** 单个 profile 的凭证信息 */
export interface CredentialProfile {
    /** 服务器地址，例如 http://localhost:8081 */
    server: string;
    /** 访问令牌 */
    token: string;
    /** 登录用户名，便于辨识（可选） */
    username?: string;
    /** 最近一次更新时间（ISO 字符串，可选） */
    updatedAt?: string;
}

/** 凭证文件结构 */
export interface CredentialsFile {
    /** 当前激活的 profile 名 */
    current?: string;
    /** 所有 profile */
    profiles: Record<string, CredentialProfile>;
}

/** 默认 profile 名 */
export const DEFAULT_PROFILE_NAME = 'default';

/** 凭证目录：~/.mira */
export const MIRA_DIR = path.join(os.homedir(), '.mira');
/** 凭证文件路径：~/.mira/credentials.json */
export const CREDENTIALS_PATH = path.join(MIRA_DIR, 'credentials.json');

/**
 * 读取凭证文件，容错处理：
 * - 文件不存在 → 返回空结构
 * - 文件损坏/格式异常 → 返回空结构，不抛错（避免 CLI 崩溃）
 */
export function loadCredentials(): CredentialsFile {
    try {
        if (!fs.existsSync(CREDENTIALS_PATH)) {
            return { profiles: {} };
        }
        const raw = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (
            parsed &&
            typeof parsed === 'object' &&
            typeof parsed.profiles === 'object'
        ) {
            return {
                current: parsed.current,
                profiles: parsed.profiles,
            };
        }
        return { profiles: {} };
    } catch {
        return { profiles: {} };
    }
}

/**
 * 写入凭证文件。目录不存在时自动创建（权限 0o700）。
 */
export function saveCredentials(data: CredentialsFile): void {
    if (!fs.existsSync(MIRA_DIR)) {
        fs.mkdirSync(MIRA_DIR, { recursive: true, mode: 0o700 });
    }
    fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(data, null, 2), {
        encoding: 'utf-8',
        mode: 0o600,
    });
}

/**
 * 获取指定名称的 profile
 */
export function getProfile(name: string): CredentialProfile | undefined {
    return loadCredentials().profiles[name];
}

/**
 * 保存（新增或覆盖）一个 profile，并记录更新时间。
 * 如果尚无 current，则将其设为当前。
 */
export function saveProfile(name: string, profile: CredentialProfile): void {
    const data = loadCredentials();
    data.profiles[name] = { ...profile, updatedAt: new Date().toISOString() };
    if (!data.current) {
        data.current = name;
    }
    saveCredentials(data);
}

/**
 * 设置当前激活的 profile
 * @returns 是否设置成功（profile 不存在则返回 false）
 */
export function setCurrent(name: string): boolean {
    const data = loadCredentials();
    if (!data.profiles[name]) {
        return false;
    }
    data.current = name;
    saveCredentials(data);
    return true;
}

/**
 * 删除一个 profile。若删除的是当前 profile，则清空 current。
 */
export function removeProfile(name: string): boolean {
    const data = loadCredentials();
    if (!data.profiles[name]) {
        return false;
    }
    delete data.profiles[name];
    if (data.current === name) {
        data.current = Object.keys(data.profiles)[0];
    }
    saveCredentials(data);
    return true;
}

/**
 * 列出所有 profile 名
 */
export function listProfiles(): string[] {
    return Object.keys(loadCredentials().profiles);
}

/**
 * 获取当前激活的 profile
 * @returns { name, profile } 或 null（无任何 profile 时）
 */
export function getCurrentProfile(): { name: string; profile: CredentialProfile } | null {
    const data = loadCredentials();
    const current = data.current;
    if (current && data.profiles[current]) {
        return { name: current, profile: data.profiles[current] };
    }
    // current 失效时回退到第一个
    const firstEntry = Object.entries(data.profiles)[0];
    if (firstEntry) {
        return { name: firstEntry[0], profile: firstEntry[1] };
    }
    return null;
}

/**
 * 清空当前 profile 的 token（登出）。
 * @returns 是否成功（无当前 profile 则返回 false）
 */
export function clearCurrentToken(): boolean {
    const data = loadCredentials();
    if (!data.current || !data.profiles[data.current]) {
        return false;
    }
    data.profiles[data.current].token = '';
    data.profiles[data.current].updatedAt = new Date().toISOString();
    saveCredentials(data);
    return true;
}
