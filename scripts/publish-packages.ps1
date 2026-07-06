# 批量发布 mira workspace 的公开包 (PowerShell 版): core -> server
# 依赖顺序: server 依赖 core (workspace:*), 故 core 先发。
#
# 用法 (在 PowerShell 交互终端执行):
#   cd <mira repo root>
#   ./scripts/publish-packages.ps1                     # 默认发 core server
#   ./scripts/publish-packages.ps1 -Packages core      # 只发 core
#   ./scripts/publish-packages.ps1 -DryRun             # 只打印不实际发布
#
# OTP: 若账号开启 2FA, pnpm 会在发布时提示输入 6 位码, 或自动打开浏览器授权。

param(
    [string[]]$Packages = @("core", "server"),
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# 切到仓库根 (脚本位于 <root>/scripts)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
try {
    $Root = (git -C $ScriptDir rev-parse --show-toplevel).Trim()
} catch {
    $Root = Resolve-Path (Join-Path $ScriptDir "..")
}
if (-not (Test-Path (Join-Path $Root "package.json"))) {
    throw "无法定位仓库根 (缺少 package.json): $Root"
}
Set-Location $Root
Write-Host "仓库根: $Root"

# 短名 -> 实际目录名
function Get-DirOf([string]$short) {
    switch ($short) {
        "core"   { return "mira-app-core" }
        "server" { return "mira-app-server" }
        default  { return $short }
    }
}

# ---- 1. 登录状态检查 ----
Write-Host "==> 检查 npm 登录状态..."
$registry = (npm config get registry).Trim()
if ($registry -ne "https://registry.npmjs.org/") {
    Write-Host "    ! 当前 registry 不是官方: $registry"
    $ans = Read-Host "    是否切换到 https://registry.npmjs.org/ 并继续? (y/N)"
    if ($ans -ne "y") { exit 1 }
    npm config set registry https://registry.npmjs.org/
}

$NPM_USER = $null
try { $NPM_USER = (npm whoami 2>$null).Trim() } catch {}
if ([string]::IsNullOrWhiteSpace($NPM_USER)) {
    Write-Host "    未登录, 开始 web 授权登录 (浏览器会自动打开)..."
    npm login --auth-type=web
    $NPM_USER = (npm whoami).Trim()
}
Write-Host "    已登录: $NPM_USER  (registry: $registry)"
Write-Host ""

# ---- 2. 逐个 build + publish ----
foreach ($short in $Packages) {
    $pkg = Get-DirOf $short
    $dir = Join-Path $Root "packages/$pkg"
    $pkgJsonPath = Join-Path $dir "package.json"
    if (-not (Test-Path $pkgJsonPath)) {
        Write-Host "    ! 跳过 $short: 找不到 $pkgJsonPath" -ForegroundColor Yellow
        continue
    }
    $name    = (node -p "require('$pkgJsonPath').name").Trim()
    $version = (node -p "require('$pkgJsonPath').version").Trim()
    $private = (node -p "!!require('$pkgJsonPath').private").Trim()

    Write-Host "================================================ =="
    Write-Host "==> [$short] $name@$version"
    Write-Host "================================================ =="

    if ($private -eq "true") {
        Write-Host "    跳过: private 包不可发布" -ForegroundColor Yellow
        continue
    }

    # 发版前预检: 该版本若已存在则会被 E403 拒, 直接跳过避免无谓 build
    if (-not $DryRun) {
        npm view "$name@$version" *> $null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ! 警告: $name@$version 已在 npm 上存在, 发布会被拒绝(E403)。" -ForegroundColor Yellow
            Write-Host "      请先 bump 版本号再跑。跳过此包。"
            continue
        }
    }

    Write-Host "    [1/2] build..."
    if ($DryRun) { Write-Host "    (dry-run) 跳过 build" } else {
        pnpm --filter $name run build
        if ($LASTEXITCODE -ne 0) { Write-Host "    build 失败" -ForegroundColor Red; exit 1 }
    }

    Write-Host "    [2/2] publish..."
    if ($DryRun) {
        Write-Host "    (dry-run) 跳过 publish"
    } else {
        pnpm --filter $name publish --no-git-checks --access public
        if ($LASTEXITCODE -ne 0) { Write-Host "    publish 失败" -ForegroundColor Red; exit 1 }
    }
    Write-Host "    done $name@$version" -ForegroundColor Green
    Write-Host ""

    # 上架校验 (失败不阻断)
    if (-not $DryRun) {
        Start-Sleep -Seconds 2
        npm view "$name@$version" *> $null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    npm view 确认已上架"
        } else {
            Write-Host "    ! 警告: npm view 未查到, 可能仍在同步, 稍后再查" -ForegroundColor Yellow
        }
        Write-Host ""
    }
}

Write-Host "======================================== =="
Write-Host "完成:" -ForegroundColor Green
foreach ($short in $Packages) {
    $pkg = Get-DirOf $short
    $pkgJsonPath = Join-Path $Root "packages/$pkg/package.json"
    if (Test-Path $pkgJsonPath) {
        $name    = (node -p "require('$pkgJsonPath').name").Trim()
        $version = (node -p "require('$pkgJsonPath').version").Trim()
        Write-Host "  $name@$version"
    }
}
Write-Host "======================================== =="
