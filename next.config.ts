import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
