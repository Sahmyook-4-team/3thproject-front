/** @type {import('next').NextConfig} **/
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
  
  // NODE_ENV가 'development'일 때만 rewrites를 적용하고, 
  // 'production'일 때는 빈 배열을 반환하여 아무것도 적용하지 않습니다.
  rewrites: async () => {
    // npm run dev (개발 환경)
    if (process.env.NODE_ENV === 'development') {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
      return [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/api/:path*`,
        },
        {
          source: '/graphql',
          destination: `${apiUrl}/graphql`,
        },
        {
        source: '/ws/:path*',
        destination: 'http://localhost:8080/ws/:path*',
      },
      ];
    }
    // npm run build (배포 환경)
    return [];
  },
};

module.exports = nextConfig;