# 使用Node.js官方镜像作为基础
FROM node:20-alpine

# 安装构建依赖和 FFmpeg（用于编译native modules如sqlite3）
RUN apk add --no-cache \
    python3 \
    py3-setuptools \
    make \
    g++ \
    sqlite \
    sqlite-dev \
    ffmpeg \
    ffmpeg-dev

# 创建工作目录
WORKDIR /app

# 首先复制根目录的 package.json 和相关配置文件
COPY tsconfig.json ./
COPY packages/package*.json ./packages/
COPY packages/mira-app-server/package*.json ./packages/mira-app-server/

# 复制各包的 package.json
COPY packages/mira-app-core/package*.json ./packages/mira-app-core/
COPY packages/mira-storage-sqlite/package*.json ./packages/mira-storage-sqlite/
COPY packages/mira-server-sdk/package*.json ./packages/mira-server-sdk/

# 复制 tsconfig 和其他配置文件
COPY packages/mira-app-server/tsconfig.json ./packages/mira-app-server/
COPY packages/mira-app-core/tsconfig.json ./packages/mira-app-core/
COPY packages/mira-storage-sqlite/tsconfig.json ./packages/mira-storage-sqlite/
COPY packages/mira-server-sdk/tsconfig.json ./packages/mira-server-sdk/

# 复制源代码
COPY packages/mira-app-core/src ./packages/mira-app-core/src
COPY packages/mira-app-server/src ./packages/mira-app-server/src
COPY packages/mira-storage-sqlite/src ./packages/mira-storage-sqlite/src
COPY packages/mira-server-sdk/src ./packages/mira-server-sdk/src

# 设置环境变量修复distutils问题并安装依赖
ENV SETUPTOOLS_USE_DISTUTILS=stdlib
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

# 清理现有的node_modules和package-lock.json（如果存在）
RUN rm -rf packages/*/node_modules packages/*/package-lock.json

# 先安装根目录的依赖
WORKDIR /app/packages
RUN npm install

# 安装并构建 mira-app-core
WORKDIR /app/packages/mira-app-core
RUN npm install
RUN npm run build

# 安装并构建 mira-storage-sqlite
WORKDIR /app/packages/mira-storage-sqlite
RUN npm install
RUN npm run build

# 安装并构建 mira-app-server
WORKDIR /app/packages/mira-app-server
RUN npm install
RUN npm run build

# 安装并构建 mira-server-sdk
WORKDIR /app/packages/mira-server-sdk
RUN npm install
RUN npm run build

# 验证 FFmpeg 安装
RUN ffmpeg -version && ffprobe -version

# 清理构建依赖以减小镜像大小（保留 ffmpeg）
RUN apk del python3 make g++ ffmpeg-dev

# 设置工作目录为 mira-app-server
WORKDIR /app/packages/mira-app-server

# 暴露端口
EXPOSE 8018
EXPOSE 8081

# 启动命令(使用JSON格式)
CMD ["npm", "start"]