/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  typescript: {
    ignoreBuildErrors: false,
  },
  transpilePackages: ['chat', '@chat-adapter/telegram', '@chat-adapter/shared'],
};

export default nextConfig;
