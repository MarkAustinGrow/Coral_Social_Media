/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Force Next.js to ignore .env.local and use our custom environment loading
  env: {},
  // Disable automatic environment variable loading
  experimental: {
    // This ensures we control environment loading completely
  }
}

export default nextConfig
