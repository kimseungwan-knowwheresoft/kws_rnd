import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external domains for development testing
  allowedDevOrigins: ['rnd.knws.kr', 'rnd.knowwheresoft.com', 'localhost'],
};

export default nextConfig;
