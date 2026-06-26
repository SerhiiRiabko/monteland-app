import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker standalone build (Dockerfile.prod)
  output: "standalone",

  // API proxy — requests to /api/* go to FastAPI backend
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
