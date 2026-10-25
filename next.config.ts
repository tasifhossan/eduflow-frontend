import type { NextConfig } from "next";

// Ensure backendUrl has no trailing slash and no /api suffix
const rawBackendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const backendUrl = rawBackendUrl.replace(/\/$/, '').replace(/\/api$/, '');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
