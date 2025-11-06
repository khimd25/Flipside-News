/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server Actions are now stable in Next.js 16, no need for experimental flag
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Keep webpack config for compatibility
  webpack: (config, { isServer }) => {
    // This fixes the "Module not found: Can't resolve 'fs'" error
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
      };
    }
    return config;
  },
  // Add empty turbopack config to silence the warning
  turbopack: {},
};

module.exports = nextConfig;
