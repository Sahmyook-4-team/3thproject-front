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
    // 이 설정은 개발 환경(npm run dev)과 배포 환경 모두에서 작동합니다.
    return [
      {
        // 사용자가 '/api/...'로 요청을 보내면,
        source: '/api/:path*',
        // Next.js 서버가 대신 백엔드 서버로 요청을 전달해준다.
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;