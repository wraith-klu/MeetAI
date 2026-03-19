import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["better-auth"],
  },

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      zod: path.resolve(__dirname, "node_modules/zod"),
    };
    return config;
  },
};

export default nextConfig;