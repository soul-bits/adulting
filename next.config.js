/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable experimental features if needed
  experimental: {
    // Add any experimental features here
  },
  // Configure image domains if using external images
  images: {
    domains: ['images.unsplash.com'],
  },
}

module.exports = nextConfig

