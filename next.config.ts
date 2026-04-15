/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: "C:/Users/shaan/OneDrive/Desktop/yourshop/meeshocopy",
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "yobayudahkjtlgolcuoh.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      }, 
      {
        protocol: "https",
        hostname: "example.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // 🔥 increase limit
    },
  },
};

module.exports = nextConfig;