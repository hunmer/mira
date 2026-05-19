chcp 65001 >nul
@echo off
set http_proxy=http://127.0.0.1:7890 & set https_proxy=http://127.0.0.1:7890

echo 开始构建 Docker 镜像...

echo 清理之前的构建...
docker rmi mira_server:latest 2>nul

echo 构建 Docker 镜像...
cd ..\..
docker build -f packages/mira-app-server/Dockerfile -t mira_server:latest .
cd packages\mira-app-server

echo Docker 镜像构建成功！
echo 保存 Docker 镜像到 mira_server.tar...
docker save -o mira_server.tar mira_server:latest
echo Docker 镜像已保存到 mira_server.tar

set /p start_container=是否启动 Docker 容器？(y/n):

if /i "%start_container%"=="y" (
    echo 启动 Docker 容器...
    docker run -d ^
        -p 8018:8018 ^
        -p 8081:8081 ^
        -v /volume1/文件共享:/library ^
        --restart=always ^
        --name mira_server ^
        mira_server
) else (
    echo 已跳过启动 Docker 容器。
)
