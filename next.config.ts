import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp ships native binaries — bundling it into serverless functions breaks
  // at runtime on Vercel ("Could not load the sharp module"). Externalize it so
  // the platform installs the correct prebuilt binaries for the runtime.
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google OAuth avatars
      },
      {
        protocol: "https",
        hostname: "**.icecat.biz", // Icecat product images (images.icecat.biz)
      },
    ],
  },
};

export default nextConfig;
