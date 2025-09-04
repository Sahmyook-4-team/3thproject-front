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
      // 규칙 1: /api/ 로 시작하는 모든 REST API 요청을 위한 길
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/:path*`,
      },
      // 규칙 2: /graphql 로 들어오는 모든 GraphQL 요청을 위한 길
      {
        source: '/graphql',
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL}/graphql`,
      },
    ];
  },
};

module.exports = nextConfig;