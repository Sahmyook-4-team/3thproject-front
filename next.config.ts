import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // fs 모듈이 클라이언트 사이드 번들에 포함되지 않도록 설정합니다.
    // 이렇게 하면 'Module not found: Can't resolve 'fs'' 오류가 해결됩니다.
    config.resolve.fallback = {
      ...config.resolve.fallback, // 기존의 fallback 설정을 유지합니다.
      fs: false, // 'fs' 모듈에 대한 fallback을 'false'로 설정하여 무시하도록 합니다.
    };

    return config;
  },
};

export default nextConfig;
