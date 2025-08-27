/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
  // 만약 reactStrictMode 같은 다른 설정이 있었다면 여기에 추가하세요.
  // 예: reactStrictMode: true,
};

module.exports = nextConfig;