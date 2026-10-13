import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/dashboard/subscribition",
        destination: "/dashboard/subscription",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
