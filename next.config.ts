import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack CSS configuration
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
