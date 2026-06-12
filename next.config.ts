/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: "C:/Users/shaan/OneDrive/Desktop/yourshop/newupdates/meeshocopy",
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "xchetjeduucxdavfmhjy.supabase.co", // ✅ YOUR ACTUAL PROJECT
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
        hostname:
          "xchetjeduucxdavfmhjy.supabase.co",
      },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

module.exports = nextConfig;