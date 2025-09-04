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

  async rewrites() {
    return [
      // '/api' 나 '/graphql'로 오는 모든 요청을
      // 비밀 주소('http://backend:8080')로 전달합니다.
      {
        source: '/:path((?!_next).*)', // _next/static 같은 Next.js 내부 요청은 제외
        destination: `${process.env.API_BASE_URL}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;