/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: "C:/Users/shaan/OneDrive/Desktop/meeho/meeshocopy",
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
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // 🔥 increase limit
    },
  },
};

module.exports = nextConfig;