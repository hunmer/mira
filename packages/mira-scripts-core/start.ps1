[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
# Mira Tools 快速启动脚本 (PowerShell)
# 请根据您的需求修改以下示例命令

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "          Mira Tools 快速启动向导" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. 查看所有可用命令:" -ForegroundColor Yellow
Write-Host "   npm run help" -ForegroundColor Gray
Write-Host ""

Write-Host "2. 数据库转换示例:" -ForegroundColor Yellow
Write-Host "   npm run script -- convert --sourceDbPath=source.db --targetDir=./target" -ForegroundColor Gray
Write-Host ""

Write-Host "3. 文件导入示例:" -ForegroundColor Yellow
Write-Host "   npm run script -- import --source=./files --target=library.db" -ForegroundColor Gray
Write-Host ""

Write-Host "4. 获取特定命令帮助:" -ForegroundColor Yellow
Write-Host "   npm run script -- convert --help" -ForegroundColor Gray
Write-Host "   npm run script -- import --help" -ForegroundColor Gray
Write-Host ""

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "选择一个操作:" -ForegroundColor Green
Write-Host "1) 查看帮助" -ForegroundColor White
Write-Host "2) 运行数据库转换 (需要输入参数)" -ForegroundColor White
Write-Host "3) 运行文件导入 (需要输入参数)" -ForegroundColor White
Write-Host "4) 退出" -ForegroundColor White
Write-Host "===============================================" -ForegroundColor Cyan

$choice = Read-Host "请输入选择 (1-4)"

switch ($choice) {
    "1" {
        npm run help
        Read-Host "按任意键继续..."
    }
    "2" {
        Write-Host ""
        $sourceDb = Read-Host "请输入源数据库路径"
        $targetDir = Read-Host "请输入目标目录路径"
        npm run script -- convert --sourceDbPath="$sourceDb" --targetDir="$targetDir"
        Read-Host "按任意键继续..."
    }
    "3" {
        Write-Host ""
        $sourcePath = Read-Host "请输入源文件/目录路径"
        $targetDb = Read-Host "请输入目标数据库路径"
        npm run script -- import --source="$sourcePath" --target="$targetDb"
        Read-Host "按任意键继续..."
    }
    "4" {
        Write-Host "再见!" -ForegroundColor Green
    }
    default {
        Write-Host "无效选择，请重新运行脚本" -ForegroundColor Red
        Read-Host "按任意键继续..."
    }
}
