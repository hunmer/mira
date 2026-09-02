# 批量发布 mira workspace 的公开包 (PowerShell 版): core -> server
# 依赖顺序: server 依赖 core (workspace:*), 故 core 先发。
#
# 用法 (在 PowerShell 交互终端执行):
#   cd <mira repo root>
#   ./scripts/publish-packages.ps1 -Release             # 完整发版: bump(patch) -> commit/push -> npm 发布 -> v tag 触发 CI
#   ./scripts/publish-packages.ps1 -Release -Bump minor # bump minor 版本
#   ./scripts/publish-packages.ps1                      # 仅发布当前版本到 npm (不 bump, 不打 tag)
#   ./scripts/publish-packages.ps1 -Packages core       # 只发 core
#   ./scripts/publish-packages.ps1 -DryRun              # 只打印不实际执行
#
# OTP: 若账号开启 2FA, pnpm 会在发布时提示输入 6 位码, 或自动打开浏览器授权。

param(
    [string[]]$Packages = @("core", "server"),
    [switch]$DryRun,
    [switch]$Release,
    [ValidateSet("patch", "minor", "major")]
    [string]$Bump = "patch"
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

# ---- 1.5 Release: bump 版本 + commit + push ----
# 保持 npm 版本与 git tag 一致, 避免脱节。
$NewVersion = $null
if ($Release) {
    $corePkgJson = (Join-Path $Root "packages/mira-app-core/package.json") -replace '\\', '/'
    $oldVer = (node -p "require('$corePkgJson').version").Trim()
    if ($oldVer -notmatch '^\d+\.\d+\.\d+$') {
        throw "core 版本 '$oldVer' 非纯 semver (x.y.z), 不支持自动 bump"
    }

    $p = $oldVer.Split('.')
    switch ($Bump) {
        "major" { $p = @([string]([int]$p[0] + 1), "0", "0") }
        "minor" { $p = @($p[0], [string]([int]$p[1] + 1), "0") }
        default { $p = @($p[0], $p[1], [string]([int]$p[2] + 1)) }
    }
    $NewVersion = $p -join "."
    Write-Host "==> [release] bump: $oldVer -> $NewVersion ($Bump)"

    if ($DryRun) {
        Write-Host "    (dry-run) 跳过 bump/commit/push"
    } else {
        # 工作树必须干净, 否则发版 commit 会混入无关更改
        git diff --quiet HEAD 2> $null
        if ($LASTEXITCODE -ne 0) { throw "工作树有未提交更改, 请先提交或 stash 再发版" }

        # tag 冲突预检 (本地 + 远端)
        git rev-parse -q --verify "refs/tags/v$NewVersion" *> $null
        if ($LASTEXITCODE -eq 0) { throw "本地 tag v$NewVersion 已存在" }
        if ((git ls-remote --tags origin "refs/tags/v$NewVersion").Trim()) {
            throw "远端 tag v$NewVersion 已存在"
        }

        # bump 所有与 core 同版本的 workspace 包 (统一版本惯例)
        $setVer = 'const fs=require("fs");const[a,v]=process.argv.slice(1);fs.writeFileSync(a,fs.readFileSync(a,"utf8").replace(/("version"\s*:\s*)"[^"]+"/,(m,g)=>g+JSON.stringify(v)));'
        Get-ChildItem "$Root/packages/*/package.json" | ForEach-Object {
            $pj = $_.FullName -replace '\\', '/'
            if ((node -p "require('$pj').version").Trim() -eq $oldVer) {
                node -e $setVer $pj $NewVersion
                Write-Host "    bump $($_.Directory.Name) $oldVer -> $NewVersion"
            }
        }

        git add -- "packages/*/package.json"
        git commit -m "chore: release v$NewVersion"
        if ($LASTEXITCODE -ne 0) { throw "git commit 失败" }
        git push origin (git branch --show-current).Trim()
        if ($LASTEXITCODE -ne 0) { throw "git push 失败" }
    }
    Write-Host ""
}

# ---- 2. 逐个 build + publish ----
$publishSkipped = $false
foreach ($short in $Packages) {
    $pkg = Get-DirOf $short
    $dir = Join-Path $Root "packages/$pkg"
    $pkgJsonPath = (Join-Path $dir "package.json") -replace '\\', '/'
    if (-not (Test-Path $pkgJsonPath)) {
        Write-Host "    ! 跳过 ${short}: 找不到 $pkgJsonPath" -ForegroundColor Yellow
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
            $publishSkipped = $true
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

# ---- 3. Release: 打 v tag 触发 CI ----
if ($Release -and -not $DryRun) {
    if ($publishSkipped) {
        Write-Host "! 有包未发布成功, 跳过打 tag 避免与 npm 脱节。" -ForegroundColor Yellow
    } else {
        Write-Host "==> [release] 推送 tag v$NewVersion 触发 CI..."
        git tag "v$NewVersion"
        if ($LASTEXITCODE -ne 0) { throw "git tag 失败" }
        git push origin "v$NewVersion"
        if ($LASTEXITCODE -ne 0) { throw "git push tag 失败" }
        Write-Host "    tag v$NewVersion 已推送, 用 'gh run list' 查看 Action 进度" -ForegroundColor Green
        Write-Host ""
    }
}

Write-Host "======================================== =="
Write-Host "完成:" -ForegroundColor Green
if ($Release -and $NewVersion) { Write-Host "  tag: v$NewVersion" }
foreach ($short in $Packages) {
    $pkg = Get-DirOf $short
    $pkgJsonPath = (Join-Path $Root "packages/$pkg/package.json") -replace '\\', '/'
    if (Test-Path $pkgJsonPath) {
        $name    = (node -p "require('$pkgJsonPath').name").Trim()
        $version = (node -p "require('$pkgJsonPath').version").Trim()
        Write-Host "  $name@$version"
    }
}
Write-Host "======================================== =="
