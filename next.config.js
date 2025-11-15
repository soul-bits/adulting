/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable instrumentation for startup initialization
  experimental: {
    instrumentationHook: true,
  },
  // Configure image domains if using external images
  images: {
    domains: ['images.unsplash.com'],
  },
}

module.exports = nextConfig

