import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@react-pdf/renderer"],
  // The in-build TypeScript type-check is the most memory-heavy part of
  // `next build` and was OOM-killing the container on the VPS ("Running
  // TypeScript ..." then exit 255). We run `tsc --noEmit` separately before
  // every push, so skip it here to keep the production build lean and reliable.
  // Do NOT remove without restoring a pre-deploy type-check gate.
  // (Next 16 no longer runs ESLint during `next build`, so no eslint key needed.)
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "arizonachristiantuition.com",
        pathname: "/wp-content/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.qrserver.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
