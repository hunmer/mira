/**
 * 登录凭据本地存储
 *
 * 将用户名/密码按 serverUrl 持久化到 localStorage，用于「记住密码」式回填。
 */

const CREDS_STORAGE_KEY = 'mira_saved_credentials'

interface SavedCredential {
  username: string
  password: string
}

/** 保存凭据到 localStorage（按 serverUrl 归档） */
export function saveCredentials(serverUrl: string, username: string, password: string) {
  try {
    const raw = localStorage.getItem(CREDS_STORAGE_KEY)
    const all: Record<string, SavedCredential> = raw ? JSON.parse(raw) : {}
    all[serverUrl.replace(/\/$/, '')] = { username, password }
    localStorage.setItem(CREDS_STORAGE_KEY, JSON.stringify(all))
  } catch {}
}

/** 读取并回填凭据；返回是否命中 */
export function loadCredentials(
  serverUrl: string,
  apply: (cred: SavedCredential) => void,
) {
  try {
    const raw = localStorage.getItem(CREDS_STORAGE_KEY)
    if (!raw) return
    const all: Record<string, SavedCredential> = JSON.parse(raw)
    const saved = all[serverUrl.replace(/\/$/, '')]
    if (saved) apply(saved)
  } catch {}
}
