import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Фото в контактной форме (до 4 МБ) идёт через Server Action; по умолчанию лимит 1 МБ.
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
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
