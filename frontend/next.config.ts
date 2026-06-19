import type { NextConfig } from "next";

function getBackendRewriteDestination(): string {
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  if (backendUrl) {
    return `${backendUrl.replace(/\/$/, "")}/api/v1/:path*`;
  }
  if (process.env.VERCEL) {
    return "/_/backend/api/v1/:path*";
  }
  return "http://127.0.0.1:8000/api/v1/:path*";
}

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: getBackendRewriteDestination(),
      },
    ];
  },
};

export default nextConfig;
