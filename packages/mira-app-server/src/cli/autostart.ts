/**
 * 跨平台开机自启管理
 *
 * 设计：注册的服务由系统托管（开机/登录时自动拉起，崩溃自动重启）。
 * 调用 enableAutoStart 后，当前进程不再自行启动实例，交由系统机制拉起，
 * 避免与系统的 RunAtLoad 同时启动两个实例导致端口冲突。
 *
 * - macOS  ：LaunchAgent（用户级 ~/Library/LaunchAgents），登录后拉起，无需 root
 * - Linux  ：systemd user service（~/.config/systemd/user/）+ loginctl enable-linger，真正开机自启
 * - Windows：任务计划程序（ONLOGON，用户级普通权限），登录时启动；通过 .cmd 启动器避免引号嵌套
 */
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

export interface AutoStartOptions {
    httpPort: number;
    wsPort: number;
    dataPath?: string;
}

const LABEL = 'com.mira.app-server';
const SERVICE_NAME = 'mira-app-server';
const TASK_NAME = 'MiraAppServer';

/** 当前 cli.js 绝对路径（本模块编译后位于 dist/cli/，cli.js 位于 dist/） */
function cliJsPath(): string {
    return path.join(__dirname, '..', 'cli.js');
}

/** 运行目录 ~/.mira（同时存日志、Windows 启动器） */
function runtimeDir(): string {
    const dir = path.join(os.homedir(), '.mira');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

/** 实际使用的 dataPath（默认 ~/.mira-data，与部署脚本一致） */
function resolveDataPath(dataPath?: string): string {
    return dataPath || process.env.DATA_PATH || path.join(os.homedir(), '.mira-data');
}

/** 启动参数（全部用绝对路径，避免 launchd/systemd 精简 PATH 找不到 node/脚本） */
function startArgv(opts: AutoStartOptions): string[] {
    return [
        process.execPath,
        cliJsPath(),
        'start',
        '--http-port', String(opts.httpPort),
        '--ws-port', String(opts.wsPort),
        '--data-path', resolveDataPath(opts.dataPath),
    ];
}

function run(cmd: string): string {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function tryRun(cmd: string): string | null {
    try {
        return run(cmd);
    } catch {
        return null;
    }
}

/** POSIX shell 引用（仅 macOS / Linux 分支使用） */
function shellQuote(s: string): string {
    return `'${s.replace(/'/g, `'"'"'`)}'`;
}

function escapeXml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================== macOS ==============================
function enableMacos(opts: AutoStartOptions): string {
    const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `${LABEL}.plist`);
    fs.mkdirSync(path.dirname(plistPath), { recursive: true });

    const argv = startArgv(opts);
    const runDir = runtimeDir();
    const argsXml = argv.map(a => `        <string>${escapeXml(a)}</string>`).join('\n');
    const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${LABEL}</string>
    <key>ProgramArguments</key>
    <array>
${argsXml}
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>Crashed</key>
        <true/>
    </dict>
    <key>WorkingDirectory</key>
    <string>${escapeXml(os.homedir())}</string>
    <key>StandardOutPath</key>
    <string>${escapeXml(path.join(runDir, 'mira-server.out.log'))}</string>
    <key>StandardErrorPath</key>
    <string>${escapeXml(path.join(runDir, 'mira-server.err.log'))}</string>
</dict>
</plist>
`;
    fs.writeFileSync(plistPath, plist, 'utf-8');

    const domainTarget = `gui/${process.getuid!()}`;
    // 先卸载旧的（若已存在），再 bootstrap（RunAtLoad=true 会立即拉起实例）
    tryRun(`launchctl bootout ${domainTarget}/${LABEL} 2>/dev/null`);
    try {
        run(`launchctl bootstrap ${domainTarget} ${shellQuote(plistPath)}`);
    } catch {
        // fallback 到旧 API（老版本 macOS）
        tryRun(`launchctl unload -w ${shellQuote(plistPath)} 2>/dev/null`);
        run(`launchctl load -w ${shellQuote(plistPath)}`);
    }
    return plistPath;
}

function disableMacos(): void {
    tryRun(`launchctl bootout gui/${process.getuid!()}/${LABEL} 2>/dev/null`);
    const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `${LABEL}.plist`);
    if (fs.existsSync(plistPath)) fs.unlinkSync(plistPath);
}

// ============================== Linux ==============================
function enableLinux(opts: AutoStartOptions): string {
    if (!tryRun('command -v systemctl')) {
        throw new Error('未检测到 systemctl（当前系统可能未使用 systemd，如 WSL 默认/容器），无法注册开机自启。');
    }
    const svcDir = path.join(os.homedir(), '.config', 'systemd', 'user');
    fs.mkdirSync(svcDir, { recursive: true });
    const svcPath = path.join(svcDir, `${SERVICE_NAME}.service`);

    const execStart = startArgv(opts).map(shellQuote).join(' ');
    const service = `[Unit]
Description=Mira App Server
After=network.target

[Service]
Type=simple
ExecStart=${execStart}
Restart=on-failure
RestartSec=5
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

[Install]
WantedBy=default.target
`;
    fs.writeFileSync(svcPath, service, 'utf-8');
    run('systemctl --user daemon-reload');
    run(`systemctl --user enable ${SERVICE_NAME}`);
    run(`systemctl --user start ${SERVICE_NAME}`);

    // 用户服务默认在注销后被杀；开启 lingering 才能真正开机自启（可能需要 polkit 授权）
    if (!tryRun(`loginctl enable-linger ${os.userInfo().username}`)) {
        console.warn('⚠️  loginctl enable-linger 失败：注销后服务可能停止。可手动执行：sudo loginctl enable-linger $USER');
    }
    return svcPath;
}

function disableLinux(): void {
    tryRun(`systemctl --user disable ${SERVICE_NAME} 2>/dev/null`);
    tryRun(`systemctl --user stop ${SERVICE_NAME} 2>/dev/null`);
    const svcPath = path.join(os.homedir(), '.config', 'systemd', 'user', `${SERVICE_NAME}.service`);
    if (fs.existsSync(svcPath)) fs.unlinkSync(svcPath);
    tryRun('systemctl --user daemon-reload');
}

// ============================== Windows ==============================
function enableWindows(opts: AutoStartOptions): string {
    const argv = startArgv(opts);
    const runDir = runtimeDir();
    // 写一个固定内容的 .cmd 启动器，任务计划只 /TR 指向它（避免 schtasks 引号嵌套地狱）
    const launcherPath = path.join(runDir, 'mira-app-server-autostart.cmd');
    const cmdLines = ['@echo off', argv.map(a => `"${a}"`).join(' ')];
    fs.writeFileSync(launcherPath, cmdLines.join('\r\n') + '\r\n', 'utf-8');

    // /SC ONLOGON 当前用户登录时触发；/RL LIMITED 普通权限无需管理员；/F 强制覆盖
    run(`schtasks /Create /TN "${TASK_NAME}" /TR "${launcherPath}" /SC ONLOGON /RL LIMITED /F`);
    tryRun(`schtasks /Run /TN "${TASK_NAME}"`);
    return launcherPath;
}

function disableWindows(): void {
    tryRun(`schtasks /Delete /TN "${TASK_NAME}" /F`);
}

// ============================== 对外 API ==============================
/** 注册并立即通过系统机制启动；返回注册文件/任务标识 */
export function enableAutoStart(opts: AutoStartOptions): string {
    switch (process.platform) {
        case 'darwin': return enableMacos(opts);
        case 'linux': return enableLinux(opts);
        case 'win32': return enableWindows(opts);
        default:
            throw new Error(`不支持的平台：${process.platform}（仅支持 darwin / linux / win32）`);
    }
}

/** 取消开机自启并停止系统托管的实例 */
export function disableAutoStart(): void {
    switch (process.platform) {
        case 'darwin': return disableMacos();
        case 'linux': return disableLinux();
        case 'win32': return disableWindows();
        default:
            throw new Error(`不支持的平台：${process.platform}`);
    }
}
