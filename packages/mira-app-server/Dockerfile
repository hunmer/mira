FROM node:20-alpine

RUN apk add --no-cache \
    python3 \
    py3-setuptools \
    make \
    g++ \
    sqlite \
    sqlite-dev \
    ffmpeg \
    ffmpeg-dev

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages/mira-app-core/package.json ./packages/mira-app-core/
COPY packages/mira-app-server/package.json ./packages/mira-app-server/
COPY packages/mira-client/package.json ./packages/mira-client/
COPY packages/mira-dashboard-next/package.json ./packages/mira-dashboard-next/
COPY packages/vue-masonry/package.json ./packages/vue-masonry/
COPY packages/vue-selection-box/package.json ./packages/vue-selection-box/
COPY packages/grid-layout-plus/package.json ./packages/grid-layout-plus/

ENV SETUPTOOLS_USE_DISTUTILS=stdlib
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

RUN pnpm install --frozen-lockfile

COPY packages/mira-app-core/tsconfig.json ./packages/mira-app-core/
COPY packages/mira-app-core/vite.sdk.config.ts ./packages/mira-app-core/
COPY packages/mira-app-server/tsconfig.json ./packages/mira-app-server/

COPY packages/mira-app-core/src ./packages/mira-app-core/src
COPY packages/mira-app-server/src ./packages/mira-app-server/src
# app-server 的 build 脚本会调用 scripts/copy-dashboard.mjs
COPY packages/mira-app-server/scripts ./packages/mira-app-server/scripts
# dashboard-next 源码（copy-dashboard.mjs 会构建它并把产物拷给 app-server）
COPY packages/mira-dashboard-next ./packages/mira-dashboard-next
# mira-client 源码及其 workspace 依赖（copy-web.mjs 会构建并复制 Web 产物）
COPY packages/mira-client ./packages/mira-client
COPY packages/vue-masonry ./packages/vue-masonry
COPY packages/vue-selection-box ./packages/vue-selection-box
COPY packages/grid-layout-plus ./packages/grid-layout-plus

RUN pnpm -C packages/mira-app-core run build
RUN pnpm -C packages/vue-masonry run build
RUN pnpm -C packages/vue-selection-box run build
RUN pnpm -C packages/grid-layout-plus run build

# @hunmer/procm-mcp-sdk 在 mira-app-server 中是 link:外部目录 的 devDependency（仅开发期使用），
# 容器内物化一份（package.json + dist）到 server 的 node_modules，供 tsc 与运行时动态 import 解析。
COPY docker-deps/procm-sdk /tmp/procm-sdk
RUN rm -rf packages/mira-app-server/node_modules/@hunmer \
    && mkdir -p packages/mira-app-server/node_modules/@hunmer/procm-mcp-sdk \
    && cp -r /tmp/procm-sdk/. packages/mira-app-server/node_modules/@hunmer/procm-mcp-sdk/ \
    && npm --prefix packages/mira-app-server/node_modules/@hunmer/procm-mcp-sdk install --omit=dev --no-audit --no-fund \
    && rm -rf /tmp/procm-sdk

RUN pnpm -C packages/mira-app-server run build

RUN ffmpeg -version && ffprobe -version

RUN apk del python3 make g++ ffmpeg-dev

WORKDIR /app/packages/mira-app-server

EXPOSE 8018
EXPOSE 8081

CMD ["pnpm", "start"]
