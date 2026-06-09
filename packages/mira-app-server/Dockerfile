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

ENV SETUPTOOLS_USE_DISTUTILS=stdlib
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

RUN pnpm install --frozen-lockfile

COPY packages/mira-app-core/tsconfig.json ./packages/mira-app-core/
COPY packages/mira-app-core/vite.sdk.config.ts ./packages/mira-app-core/
COPY packages/mira-app-server/tsconfig.json ./packages/mira-app-server/

COPY packages/mira-app-core/src ./packages/mira-app-core/src
COPY packages/mira-app-server/src ./packages/mira-app-server/src

RUN pnpm -C packages/mira-app-core run build
RUN pnpm -C packages/mira-app-server run build

RUN ffmpeg -version && ffprobe -version

RUN apk del python3 make g++ ffmpeg-dev

WORKDIR /app/packages/mira-app-server

EXPOSE 8018
EXPOSE 8081

CMD ["pnpm", "start"]
