import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      { source: '/sales/quotations', destination: '/sales/enquiries', permanent: false },
      { source: '/sales/orders', destination: '/sales/enquiries', permanent: false },
    ];
  },
};

export default nextConfig;
