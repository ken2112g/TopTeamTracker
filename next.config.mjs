/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.etsystatic.com' },
      { protocol: 'https', hostname: '**.etsy.com' }
    ]
  }
};

export default nextConfig;
