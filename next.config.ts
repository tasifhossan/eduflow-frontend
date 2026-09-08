import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://eduflow-backend-eu3i.onrender.com';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl.replace(/\/$/, '')}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
