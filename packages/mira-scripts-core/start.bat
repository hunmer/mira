chcp 65001
@echo off
REM Mira Tools 快速启动脚本 (Windows)
REM 请根据您的需求修改以下示例命令

echo ===============================================
echo          Mira Tools 快速启动向导
echo ===============================================
echo.

echo 1. 查看所有可用命令:
echo    npm run help
echo.

echo 2. 数据库转换示例:
echo    npm run script -- convert --sourceDbPath=source.db --targetDir=./target
echo.

echo 3. 文件导入示例:
echo    npm run script -- import --source=./files --target=library.db
echo.

echo 4. 获取特定命令帮助:
echo    npm run script -- convert --help
echo    npm run script -- import --help
echo.

echo ===============================================
echo 选择一个操作:
echo 1) 查看帮助
echo 2) 运行数据库转换 (需要输入参数)
echo 3) 运行文件导入 (需要输入参数)
echo 4) 退出
echo ===============================================

set /p choice="请输入选择 (1-4): "

if "%choice%"=="1" (
    npm run help
    pause
    goto :eof
)

if "%choice%"=="2" (
    echo.
    set /p sourceDb="请输入源数据库路径: "
    set /p targetDir="请输入目标目录路径: "
    npm run script -- convert --sourceDbPath="%sourceDb%" --targetDir="%targetDir%"
    pause
    goto :eof
)

if "%choice%"=="3" (
    echo.
    set /p sourcePath="请输入源文件/目录路径: "
    set /p targetDb="请输入目标数据库路径: "
    npm run script -- import --source="%sourcePath%" --target="%targetDb%"
    pause
    goto :eof
)

if "%choice%"=="4" (
    echo 再见!
    goto :eof
)

echo 无效选择，请重新运行脚本
pause
