/**
 * 环境依赖自检（doctor）
 *
 * 检测 ffmpeg / ImageMagick / exiftool 是否可用；不可用时可尝试自动安装。
 * 检测约定与 ThumbnailService / MetadataService 保持一致：
 *   优先读环境变量（FFMPEG_PATH / IMAGEMAGICK_PATH / EXIFTOOL_PATH），否则用 which 在 PATH 中查找。
 */

import { Command } from 'commander';
import { promisify } from 'util';
import { exec } from 'child_process';
import os from 'os';
import which from 'which';
import { isJsonMode, output } from './format';

const execAsync = promisify(exec);

/** 平台标识：win32 / darwin / linux（其它平台归入 linux 处理） */
function platform(): 'win32' | 'darwin' | 'linux' {
    return process.platform === 'win32' ? 'win32'
        : process.platform === 'darwin' ? 'darwin'
            : 'linux';
}

/** Linux 包管理器家族 */
type LinuxFamily = 'apt' | 'dnf' | 'yum' | 'pacman';

/**
 * 各包管理器家族对应的包名映射。
 * 不同发行版对同一工具的包名差异较大，必须分别给出：
 *   - Debian/Ubuntu (apt): imagemagick / libimage-exiftool-perl
 *   - RHEL/Fedora/CentOS (dnf/yum): ImageMagick / perl-Image-ExifTool（来自 EPEL）
 *   - Arch (pacman): imagemagick / perl-image-exiftool
 */
interface LinuxInstall {
    apt: string;
    dnf: string;
    yum?: string;    // 默认同 dnf
    pacman?: string; // 默认同 apt
}

interface ToolDef {
    key: string;
    name: string;
    envVar: string;
    /** 可执行文件名候选（按优先级）。ImageMagick 在 v7 为 magick，v6 为 convert。 */
    candidates: string[];
    /** 获取版本的参数 */
    versionArgs: string[];
    /** 从版本命令输出中提取版本号 */
    extractVersion: (stdout: string) => string | null;
    /** 各平台的安装命令；win32/darwin 为字符串，linux 为按家族映射的包名 */
    install: {
        win32?: string;
        darwin?: string;
        linux?: LinuxInstall;
    };
}

const TOOLS: ToolDef[] = [
    {
        key: 'ffmpeg',
        name: 'ffmpeg',
        envVar: 'FFMPEG_PATH',
        candidates: ['ffmpeg'],
        versionArgs: ['-version'],
        extractVersion: (s) => {
            const m = s.match(/ffmpeg version\s+([^\s,]+)/i);
            return m ? m[1] : null;
        },
        install: {
            win32: 'winget install --id=Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements',
            darwin: 'brew install ffmpeg',
            linux: { apt: 'ffmpeg', dnf: 'ffmpeg', pacman: 'ffmpeg' },
        },
    },
    {
        key: 'imagemagick',
        name: 'ImageMagick',
        envVar: 'IMAGEMAGICK_PATH',
        candidates: ['magick', 'convert'],
        versionArgs: ['-version'],
        extractVersion: (s) => {
            const m = s.match(/version:\s*ImageMagick\s+([^\s,]+)/i);
            return m ? m[1] : null;
        },
        install: {
            win32: 'winget install --id=ImageMagick.ImageMagick -e --accept-source-agreements --accept-package-agreements',
            darwin: 'brew install imagemagick',
            linux: { apt: 'imagemagick', dnf: 'ImageMagick', pacman: 'imagemagick' },
        },
    },
    {
        key: 'exiftool',
        name: 'exiftool',
        envVar: 'EXIFTOOL_PATH',
        candidates: ['exiftool'],
        versionArgs: ['-ver'],
        extractVersion: (s) => {
            // exiftool -ver 输出形如 "12.50"
            const m = s.match(/(\d+\.\d+(?:\.\d+)?)/);
            return m ? m[1] : null;
        },
        install: {
            win32: 'winget install --id=OliverBetz.Exiftool -e --accept-source-agreements --accept-package-agreements',
            darwin: 'brew install exiftool',
            linux: { apt: 'libimage-exiftool-perl', dnf: 'perl-Image-ExifTool', pacman: 'perl-image-exiftool' },
        },
    },
];

interface ToolResult {
    key: string;
    name: string;
    available: boolean;
    path: string | null;
    version: string | null;
    envVar: string;
    candidates: string[];
    installTried: boolean;
    installOk: boolean;
    installError: string | null;
}

/** Linux 下探测可用的包管理器，返回家族与安装命令前缀 */
function detectLinuxInstaller(): { family: LinuxFamily; prefix: string } | null {
    const list: Array<{ test: string; family: LinuxFamily; prefix: string }> = [
        { test: 'apt-get', family: 'apt', prefix: 'sudo apt-get update && sudo apt-get' },
        { test: 'apt', family: 'apt', prefix: 'sudo apt update && sudo apt' },
        { test: 'dnf', family: 'dnf', prefix: 'sudo dnf' },
        { test: 'yum', family: 'yum', prefix: 'sudo yum' },
        { test: 'pacman', family: 'pacman', prefix: 'sudo pacman -S --noconfirm' }, // pacman 无 install 子命令
    ];
    for (const { test, family, prefix } of list) {
        try {
            which.sync(test);
            return { family, prefix };
        } catch {
            // continue
        }
    }
    return null;
}

/** 依据包管理器家族解析出实际安装命令 */
function resolveInstallCmd(spec: LinuxInstall): string | null {
    const det = detectLinuxInstaller();
    if (!det) return null;
    const { family, prefix } = det;
    let pkg: string;
    switch (family) {
        case 'dnf': pkg = spec.dnf; break;
        case 'yum': pkg = spec.yum ?? spec.dnf; break;
        case 'pacman': pkg = spec.pacman ?? spec.apt; break;
        default: pkg = spec.apt; break;
    }
    // pacman 前缀已含 -S --noconfirm，直接接包名；其余需 install -y
    return family === 'pacman' ? `${prefix} ${pkg}` : `${prefix} install -y ${pkg}`;
}

/** 执行一条 shell 命令；返回 { ok, error }。非 json 模式下透传 stdout/stderr。 */
async function runShell(cmd: string): Promise<{ ok: boolean; error: string | null }> {
    try {
        const { stdout, stderr } = await execAsync(cmd, {
            windowsHide: true,
            maxBuffer: 1024 * 1024 * 8,
            // Windows 用 cmd, *nix 用默认 shell
            shell: platform() === 'win32' ? process.env.ComSpec || 'cmd.exe' : undefined,
        });
        if (!isJsonMode()) {
            if (stdout) process.stdout.write(stdout);
            if (stderr) process.stderr.write(stderr);
        }
        return { ok: true, error: null };
    } catch (e: any) {
        return { ok: false, error: e?.message || String(e) };
    }
}

/**
 * dnf/yum 系（RHEL/Fedora/CentOS）安装前确保第三方仓库可用：
 *   - EPEL：提供 ImageMagick / perl-Image-ExifTool
 *   - RPM Fusion free：提供 ffmpeg
 * 默认 baseos/appstream 不含这些包。每条命令独立执行，单个失败不阻断
 * （可能已装或离线），后续包安装失败时会给出更明确的错误。
 * 幂等：仓库已启用时 install 会提示已安装，不影响后续。
 */
async function prepareDnfRepos(): Promise<void> {
    if (!isJsonMode()) {
        console.log('📦 确保 EPEL / RPM Fusion 仓库可用（RHEL 系提供 ffmpeg/ImageMagick/exiftool）...');
    }
    // 用 %rhel 宏自动匹配 EL 版本（8/9）；rpm 在 RHEL 系必然存在
    const epel = 'sudo dnf install -y epel-release';
    const rpmfusion = 'sudo dnf install -y --nogpgcheck https://mirrors.rpmfusion.org/free/el/rpmfusion-free-release-$(rpm -E %rhel).noarch.rpm';
    await runShell(epel);
    await runShell(rpmfusion);
}

/** 检测单个工具：先看环境变量，再 which 候选名；可用时尝试取版本 */
async function checkTool(def: ToolDef): Promise<ToolResult> {
    let resolved: string | null = null;

    const envVal = process.env[def.envVar];
    if (envVal) {
        try {
            which.sync(envVal);
            resolved = envVal;
        } catch {
            // 环境变量指向的路径不可用，继续尝试候选名
        }
    }
    if (!resolved) {
        for (const name of def.candidates) {
            try {
                resolved = which.sync(name);
                break;
            } catch {
                // continue
            }
        }
    }

    if (!resolved) {
        return {
            key: def.key, name: def.name, available: false, path: null, version: null,
            envVar: def.envVar, candidates: def.candidates,
            installTried: false, installOk: false, installError: null,
        };
    }

    let version: string | null = null;
    try {
        const { stdout } = await execAsync(`"${resolved}" ${def.versionArgs.join(' ')}`, {
            windowsHide: true,
            maxBuffer: 1024 * 1024 * 2,
        });
        version = def.extractVersion(stdout);
    } catch {
        // 忽略版本获取失败
    }

    return {
        key: def.key, name: def.name, available: true, path: resolved, version,
        envVar: def.envVar, candidates: def.candidates,
        installTried: false, installOk: false, installError: null,
    };
}

/** 执行安装命令；返回 { ok, error } */
async function installTool(def: ToolDef): Promise<{ ok: boolean; error: string | null }> {
    const pf = platform();
    // win32 / darwin：直接取字符串命令
    if (pf !== 'linux') {
        const raw = def.install[pf as 'win32' | 'darwin'];
        if (!raw) {
            return { ok: false, error: `暂不支持在 ${pf} 上自动安装 ${def.name}` };
        }
        return runShell(raw);
    }
    // linux：按检测到的包管理器家族选包名
    const spec = def.install.linux;
    if (!spec) {
        return { ok: false, error: `暂不支持在 linux 上自动安装 ${def.name}` };
    }
    const cmd = resolveInstallCmd(spec);
    if (!cmd) {
        return { ok: false, error: `未检测到可用的包管理器（apt/dnf/yum/pacman）` };
    }
    return runShell(cmd);
}

/** 人类可读格式化 */
function formatReport(results: ToolResult[]): string {
    const lines: string[] = ['🔧 环境依赖检测', ''];
    for (const r of results) {
        const tag = r.available ? '✅' : '❌';
        const ver = r.version ? `v${r.version}` : '版本未知';
        const detail = r.available
            ? `${ver}\t${r.path}`
            : `未找到\t(候选: ${r.candidates.join(', ')}, 环境变量: ${r.envVar})`;
        lines.push(`${tag} ${r.name.padEnd(14)} ${detail}`);
        if (r.installTried) {
            lines.push(`   ↳ 安装${r.installOk ? '成功' : '失败'}${r.installError ? ': ' + r.installError : ''}`);
        }
    }
    const total = results.length;
    const ok = results.filter(r => r.available).length;
    const missing = results.filter(r => !r.available).map(r => r.name);
    lines.push('');
    lines.push(`汇总: ${ok}/${total} 可用${missing.length ? '；缺失: ' + missing.join(', ') : ''}`);
    if (missing.length) {
        lines.push('提示: 运行 `mira-app-server doctor --install` 尝试自动安装缺失工具');
    }
    return lines.join('\n');
}

export function registerDoctor(program: Command): void {
    program
        .command('doctor')
        .description('检测 ffmpeg / ImageMagick / exiftool 等外部依赖是否可用；缺失时可自动安装')
        .option('--install', '检测到缺失项时自动尝试安装（按平台调用 winget/brew/apt/dnf 等；RHEL 系自动启用 EPEL/RPM Fusion）')
        .action(async (options: { install?: boolean }) => {
            const results: ToolResult[] = [];
            for (const def of TOOLS) {
                results.push(await checkTool(def));
            }

            if (options.install) {
                // dnf/yum 系（RHEL/Fedora/CentOS）：安装前一次性启用 EPEL + RPM Fusion
                // 默认仓库不含 ffmpeg/ImageMagick/exiftool，不启用则所有 dnf install 都会失败
                if (platform() === 'linux') {
                    const det = detectLinuxInstaller();
                    if (det && (det.family === 'dnf' || det.family === 'yum')) {
                        await prepareDnfRepos();
                    }
                }
                for (const def of TOOLS) {
                    const idx = results.findIndex(r => r.key === def.key);
                    if (idx < 0 || results[idx].available) continue;

                    if (!isJsonMode()) {
                        console.log(`\n⬇️  正在安装 ${def.name} ...`);
                    }
                    const res = await installTool(def);
                    results[idx] = {
                        ...results[idx],
                        installTried: true,
                        installOk: res.ok,
                        installError: res.error,
                    };
                    // 安装后重新检测一次（PATH 可能未刷新，但部分包管理器会写入已存在路径）
                    if (res.ok) {
                        const recheck = await checkTool(def);
                        if (recheck.available) {
                            results[idx] = {
                                ...results[idx],
                                available: true,
                                path: recheck.path,
                                version: recheck.version,
                            };
                        }
                    }
                }
            }

            const total = results.length;
            const okCount = results.filter(r => r.available).length;
            const missing = results.filter(r => !r.available).map(r => r.name);
            const summary = {
                total,
                available: okCount,
                missing,
                allOk: missing.length === 0,
                platform: platform(),
            };

            output(
                { tools: results, summary },
                () => formatReport(results),
            );

            // 缺失项存在时以非零码退出，便于脚本/CI 感知
            if (missing.length > 0) {
                process.exitCode = 2;
            }
        });
}
