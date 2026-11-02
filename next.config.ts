import type { NextConfig } from "next";

/** Optional sub-path to serve the app under (e.g. "/time"); empty serves from the root of its domain. */
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // Room for a 1 MB logo upload, or a client import of a few thousand rows.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  async redirects() {
    return basePath
      ? [{ source: "/", destination: basePath, basePath: false, permanent: false }]
      : [];
  },
};

export default nextConfig;
