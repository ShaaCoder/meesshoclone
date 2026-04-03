/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: "C:/Users/shaan/OneDrive/Desktop/meeho/meeshocopy",
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: '**.pexels.com',
      },
      // Add more domains as needed later
      {
        protocol: 'https',
        hostname: 'supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
};
    
module.exports = nextConfig;      