import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // typedRoutes는 동적 redirect 대상 처리 비호환으로 비활성. 필요 시 후속 PR에서 재활성.
};

export default nextConfig;
