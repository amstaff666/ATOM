const path = require('path');

const backendUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_BASE_URL ||
  process.env.BACKEND_URL ||
  process.env.PYTHON_BACKEND_URL ||
  'http://127.0.0.1:4490';

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: false, // Disable compression to prevent zlib Array buffer errors
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  transpilePackages: ["@chakra-ui/react", "@chakra-ui/icons", "@ark-ui/react"],
  outputFileTracingRoot: process.cwd(),

  // Disable SWC minification to work around "erator is not defined" bug
  // See: Phase 247-02 SUMMARY.md for details
  productionBrowserSourceMaps: true,

  experimental: {
    externalDir: true,
  },

  // Disable minification via webpack configuration
  webpack: (config, { isServer }) => {
    // Disable minification for both client and server
    config.optimization = config.optimization || {};
    config.optimization.minimize = false;
    return config;
  },

  // Silence Turbopack + webpack config conflict
  turbopack: {},
  async redirects() {
    return [
      { source: '/auth/:path*', destination: '/', permanent: false },
      { source: '/login', destination: '/', permanent: false },
      { source: '/settings/sessions', destination: '/settings', permanent: false },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/sales/:path*",
        destination: `${backendUrl}/api/sales/:path*`,
      },
      {
        source: "/api/accounting/:path*",
        destination: `${backendUrl}/api/accounting/:path*`,
      },
      {
        source: "/api/integrations/:path*",
        destination: `${backendUrl}/api/integrations/:path*`,
      },
      {
        source: "/api/workflows/:path*",
        destination: `${backendUrl}/api/v1/workflow-ui/:path*`,
      },
      {
        source: "/api/ai/:path*",
        destination: `${backendUrl}/api/v1/ai/:path*`,
      },
      {
        source: "/api/system/:path*",
        destination: `${backendUrl}/api/v1/system/:path*`,
      },
      {
        source: "/api/analytics/:path*",
        destination: `${backendUrl}/api/v1/analytics/:path*`,
      },
      {
        source: "/api/workflow-templates/:path*",
        destination: `${backendUrl}/api/workflow-templates/:path*`,
      },
      {
        source: "/api/workflow-agent/:path*",
        destination: `${backendUrl}/api/workflow-agent/:path*`,
      },
      {
        source: "/api/v1/employee/:path*",
        destination: `${backendUrl}/api/v1/employee/:path*`,
      },
      {
        source: "/api/atom-agent/:path*",
        destination: `${backendUrl}/api/atom-agent/:path*`,
      },
      {
        source: "/api/intelligence/:path*",
        destination: `${backendUrl}/api/intelligence/:path*`,
      },
      {
        source: "/api/time-travel/:path*",
        destination: `${backendUrl}/api/time-travel/:path*`,
      },
      {
        source: "/api/workflow-templates/:path*",
        destination: `${backendUrl}/api/workflow-templates/:path*`,
      },
      // Chat Rewrite
      {
        source: "/api/chat/:path*",
        destination: `${backendUrl}/api/chat/:path*`,
      },
      // Documents API
      {
        source: "/api/documents/:path*",
        destination: `${backendUrl}/api/documents/:path*`,
      },
      {
        source: "/api/documents",
        destination: `${backendUrl}/api/documents`,
      },
      // Financial API
      {
        source: "/api/financial/:path*",
        destination: `${backendUrl}/api/financial/:path*`,
      },
      // Health endpoints
      {
        source: "/api/health/:path*",
        destination: `${backendUrl}/health/:path*`,
      },
      // Add general API rewrite for other endpoints
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
      // Specific Auth Rewrites (Delegate only these to Python Backend)
      {
        source: "/api/auth/login",
        destination: `${backendUrl}/api/auth/login`,
      },
      {
        source: "/api/auth/register",
        destination: `${backendUrl}/api/auth/register`,
      },
      {
        source: "/api/auth/profile",
        destination: `${backendUrl}/api/auth/profile`,
      },
      {
        source: "/api/auth/me",
        destination: `${backendUrl}/api/auth/me`,
      },
      {
        source: "/api/auth/logout",
        destination: `${backendUrl}/api/auth/logout`,
      },
      {
        source: "/api/auth/refresh",
        destination: `${backendUrl}/api/auth/refresh`,
      },
      {
        source: "/api/auth/forgot-password",
        destination: `${backendUrl}/api/auth/forgot-password`,
      },
      {
        source: "/api/auth/reset-password",
        destination: `${backendUrl}/api/auth/reset-password`,
      },
      {
        source: "/api/auth/verify-token",
        destination: `${backendUrl}/api/auth/verify-token`,
      },
      {
        source: "/api/auth/change-password",
        destination: `${backendUrl}/api/auth/change-password`,
      },
      {
        source: "/api/atom/:path*",
        destination: `${backendUrl}/api/atom/:path*`,
      },
      {
        source: "/api/agents",
        destination: `${backendUrl}/api/agents/`,
      },
      {
        source: "/api/agents/",
        destination: `${backendUrl}/api/agents/`,
      },
      {
        source: "/api/agents/:path*",
        destination: `${backendUrl}/api/agents/:path*`,
      },
      // WebSocket Proxy - REMOVED to prevent ECONNRESET crashes
      // Frontend now connects directly to port 8000 (see hooks/useWebSocket.ts)
      /*
      {
        source: "/ws",
        destination: "http://127.0.0.1:8000/ws",
      },
      {
        source: "/ws/:path*",
        destination: "http://127.0.0.1:8000/ws/:path*",
      }
      */
    ];
  },
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
