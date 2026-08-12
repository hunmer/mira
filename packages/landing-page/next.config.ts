import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静态导出,build 产物输出到 out/ 目录,适合 CDN/Nginx 等纯静态托管
  output: "export",
  // 静态导出没有服务端图片优化器,关闭后直接用原图
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
