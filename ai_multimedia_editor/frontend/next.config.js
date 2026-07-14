/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use standalone build to allow running inside Docker if needed
  output: 'standalone'
};

module.exports = nextConfig;