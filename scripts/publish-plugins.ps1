# 批量发布 plugins/plugins 下的服务端插件到 npm (PowerShell 版)
# 参考 publish-packages.ps1。每个插件都是独立的 npm 包 (不在 workspace 内)。
#
# 用法 (PowerShell 交互终端执行):
#   cd <mira repo root>
#   ./scripts/publish-plugins.ps1                        # 发布全部插件
#   ./scripts/publish-plugins.ps1 -Plugins mira_3d_format # 只发指定插件 (可多个, 逗号分隔)
#   ./scripts/publish-plugins.ps1 -Install               # 发布前先 npm install
#   ./scripts/publish-plugins.ps1 -SkipBuild             # 跳过 build, 仅 publish
#   ./scripts/publish-plugins.ps1 -ContinueOnError       # 单个失败不中断, 末尾汇总
#   ./scripts/publish-plugins.ps1 -NoIndex               # 不生成推荐列表 JSON
#   ./scripts/publish-plugins.ps1 -DryRun                # 只打印不实际发布
#
# OTP: 若账号开启 2FA, npm 会在发布时提示输入 6 位码, 或自动打开浏览器授权。

param(
    [string[]]$Plugins = @(),
    [switch]$DryRun,
    [switch]$Install,
    [switch]$SkipBuild,
    [switch]$ContinueOnError,
    [switch]$NoIndex
)

$ErrorActionPreference = "Stop"

# 切到仓库根 (脚本位于 <root>/scripts)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
try {
    $Root = (git -C $ScriptDir rev-parse --show-toplevel).Trim()
} catch {
    $Root = (Resolve-Path (Join-Path $ScriptDir "..")).Path
}
if (-not (Test-Path (Join-Path $Root "package.json"))) {
    throw "无法定位仓库根 (缺少 package.json): $Root"
}
Set-Location $Root
Write-Host "仓库根: $Root"

$PluginsRoot = Join-Path $Root "plugins/plugins"
if (-not (Test-Path $PluginsRoot)) { throw "找不到插件目录: $PluginsRoot" }

# 规范化 -Plugins: 兼容逗号分隔 (pwsh -File 下 "-Plugins a,b,c" 会被当成单字符串)
if ($Plugins.Count -gt 0) {
    $Plugins = ($Plugins -join ',') -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }
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

# ---- 2. 收集待发布插件 (有 package.json 的子目录) ----
$pluginDirs = Get-ChildItem -Path $PluginsRoot -Directory | Where-Object {
    Test-Path (Join-Path $_.FullName "package.json")
}
if ($Plugins.Count -gt 0) {
    $pluginDirs = @($pluginDirs | Where-Object { $Plugins -contains $_.Name })
    if (-not $pluginDirs -or $pluginDirs.Count -eq 0) {
        Write-Host "没有匹配 -Plugins 的插件: $($Plugins -join ', ')"
        exit 0
    }
}

$published = @()
$failed = @()
$skipped = @()

# ---- 3. 逐个 install? + build + publish ----
foreach ($dir in $pluginDirs) {
    $pkgJsonPath = (Join-Path $dir.FullName "package.json") -replace '\\', '/'
    $name    = (node -p "require('$pkgJsonPath').name").Trim()
    $version = (node -p "require('$pkgJsonPath').version").Trim()
    $private = (node -p "!!require('$pkgJsonPath').private").Trim()

    Write-Host "================================================ =="
    Write-Host "==> [$($dir.Name)] $name@$version"
    Write-Host "================================================ =="
    Set-Location $dir.FullName

    if ($private -eq "true") {
        Write-Host "    跳过: private 包不可发布" -ForegroundColor Yellow
        $skipped += "$name (private)"
        Set-Location $Root
        continue
    }

    # 该版本若已存在会被 E403 拒, 直接跳过避免无谓 build
    if (-not $DryRun) {
        npm view "$name@$version" *> $null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ! 警告: $name@$version 已在 npm 上存在, 发布会被拒绝(E403)。跳过。" -ForegroundColor Yellow
            $skipped += "$name@$version (exists)"
            Set-Location $Root
            continue
        }
    }

    try {
        $step = 0
        if ($Install) {
            Write-Host "    [install] npm install..."
            if ($DryRun) { Write-Host "    (dry-run) 跳过 install" } else {
                npm install
                if ($LASTEXITCODE -ne 0) { throw "install 失败" }
            }
        }

        if (-not $SkipBuild) {
            Write-Host "    [build] npm run build..."
            if ($DryRun) { Write-Host "    (dry-run) 跳过 build" } else {
                npm run build
                if ($LASTEXITCODE -ne 0) { throw "build 失败" }
            }
        }

        Write-Host "    [publish] npm publish --access public..."
        if ($DryRun) {
            Write-Host "    (dry-run) 跳过 publish"
        } else {
            npm publish --access public
            if ($LASTEXITCODE -ne 0) { throw "publish 失败" }
        }
        Write-Host "    done $name@$version" -ForegroundColor Green
        $published += "$name@$version"

        # 上架校验 (失败不阻断)
        if (-not $DryRun) {
            Start-Sleep -Seconds 5
            npm view "$name@$version" *> $null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "    npm view 确认已上架"
            } else {
                Write-Host "    ! 警告: npm view 未查到, 可能仍在同步, 稍后再查" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "    ! 失败: $_" -ForegroundColor Red
        $failed += "$name@$version"
        Set-Location $Root
        if (-not $ContinueOnError) {
            Write-Host "中止 (使用 -ContinueOnError 可跳过失败继续)" -ForegroundColor Red
            exit 1
        }
        continue
    }
    Write-Host ""
    Set-Location $Root
}

# ---- 4. 生成推荐列表 JSON (供 dashboard 插件商店拉取) ----
if (-not $NoIndex) {
    Write-Host "==> 生成推荐列表 JSON..."
    # 索引始终基于全部插件, 不受 -Plugins 过滤影响
    $allPluginDirs = Get-ChildItem -Path $PluginsRoot -Directory | Where-Object {
        Test-Path (Join-Path $_.FullName "package.json")
    }
    $index = @()
    foreach ($dir in $allPluginDirs) {
        $pkgJsonPath = (Join-Path $dir.FullName "package.json") -replace '\\', '/'
        $private = (node -p "!!require('$pkgJsonPath').private").Trim()
        if ($private -eq "true") { continue }
        $name    = (node -p "require('$pkgJsonPath').name").Trim()
        $version = (node -p "require('$pkgJsonPath').version").Trim()
        $desc    = (node -p "require('$pkgJsonPath').description || ''").Trim()
        $title   = (node -p "(require('$pkgJsonPath').mira && require('$pkgJsonPath').mira.title) || ''").Trim()
        $icon    = (node -p "(require('$pkgJsonPath').mira && require('$pkgJsonPath').mira.icon) || ''").Trim()
        $cat     = (node -p "(require('$pkgJsonPath').mira && require('$pkgJsonPath').mira.category) || 'general'").Trim()
        $deps    = (node -p "Object.keys(require('$pkgJsonPath').dependencies || {}).join(', ')").Trim()

        $titleVal = if ($title) { $title } else { $name }
        $depsVal  = if ($deps)  { $deps }  else { '--' }
        $index += [PSCustomObject]@{
            name        = $name
            version     = $version
            title       = $titleVal
            description = $desc
            icon        = $icon
            category    = $cat
            deps        = $depsVal
            registry    = ''
        }
    }
    $indexPath = Join-Path $PluginsRoot "plugins.recommend.json"
    @($index) | ConvertTo-Json -Depth 5 -AsArray | Out-File -FilePath $indexPath -Encoding utf8
    Write-Host "    已生成: $indexPath ($($index.Count) 个插件)" -ForegroundColor Green
    Write-Host "    将该文件托管到任意静态 URL (GitHub Raw / Gist / OSS), 在 dashboard 插件商店中填入即可。"
    Write-Host ""
}

# ---- 5. 汇总 ----
Set-Location $Root
Write-Host "======================================== =="
Write-Host "完成:" -ForegroundColor Green
Write-Host "  已发布: $($published.Count)"
$published | ForEach-Object { Write-Host "    $_" -ForegroundColor Green }
if ($skipped.Count) {
    Write-Host "  跳过: $($skipped.Count)" -ForegroundColor Yellow
    $skipped | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
}
if ($failed.Count) {
    Write-Host "  失败: $($failed.Count)" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
}
Write-Host "======================================== =="
if ($failed.Count) { exit 1 }
