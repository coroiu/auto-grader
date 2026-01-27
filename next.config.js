/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    // Allow images from our own API routes
    unoptimized: process.env.NODE_ENV === 'development',
  },
};

module.exports = nextConfig;
