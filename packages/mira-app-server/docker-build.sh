#!/bin/bash

# Docker 构建脚本
# 该脚本将处理插件依赖并构建 Docker 镜像

echo "开始构建 Docker 镜像..."

# 清理之前的构建
echo "清理之前的构建..."
docker rmi mira_server:latest 2>/dev/null || true

# 构建 Docker 镜像
echo "构建 Docker 镜像..."
cd ../..

# 同步外部 procm SDK（mira-app-server 的 link: 依赖）到 build context
if [ -d /g/procm-mcp/packages/procm-sdk/dist ]; then
    echo "同步 procm-mcp SDK -> docker-deps/procm-sdk ..."
    rm -rf docker-deps/procm-sdk
    mkdir -p docker-deps/procm-sdk
    cp /g/procm-mcp/packages/procm-sdk/package.json docker-deps/procm-sdk/
    cp -r /g/procm-mcp/packages/procm-sdk/dist docker-deps/procm-sdk/
else
    echo "警告: 未找到 /g/procm-mcp/packages/procm-sdk/dist，沿用 docker-deps/ 中现有产物"
fi

docker build -f packages/mira-app-server/Dockerfile -t mira_server:latest .
cd packages/mira-app-server

if [ $? -eq 0 ]; then
    echo "Docker 镜像构建成功！"
    echo "保存 Docker 镜像到 mira_server.tar..."
    docker save -o mira_server.tar mira_server:latest
    echo "Docker 镜像已保存到 mira_server.tar"
    read -p "是否启动 Docker 容器？(y/n): " start_container
    if [[ "$start_container" =~ ^[Yy]$ ]]; then
        echo "启动 Docker 容器..."
        docker run -d \
            -p 8018:8018 \
            -p 8081:8081 \
            -v /volume1/文件共享:/library \
            --restart=always \
            --name mira_server \
            mira_server
    else
        echo "已跳过启动 Docker 容器。"
    fi
else
    echo "Docker 镜像构建失败！"
    exit 1
fi
