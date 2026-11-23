import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native addon (resvg) — keep it external so Next doesn't try to bundle the .node binary.
  // @react-pdf/renderer must load from node_modules too: bundled into a route
  // handler it resolves React's react-server build, which has no renderer
  // internals, and every PDF route failed with "reading 'S'".
  serverExternalPackages: ["@resvg/resvg-js", "@react-pdf/renderer"],
  // The in-build TypeScript type-check is the most memory-heavy part of
  // `next build` and was OOM-killing the container on the VPS ("Running
  // TypeScript ..." then exit 255). We run `tsc --noEmit` separately before
  // every push, so skip it here to keep the production build lean and reliable.
  // Do NOT remove without restoring a pre-deploy type-check gate.
  // (Next 16 no longer runs ESLint during `next build`, so no eslint key needed.)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Natural guesses at the donor dashboards' addresses. The individual donor
  // dashboard lives at /dashboard/donor, and a reviewer reaching for another
  // spelling got a 404.
  // Private, link-only donor proposals (/p/<token>) are never indexed, and the
  // secret link is never sent on as a Referer when someone clicks out.
  async headers() {
    return [
      {
        source: "/p/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
  // OAuth discovery for the ACT MCP connector (see app/api/oauth/metadata/*).
  async rewrites() {
    return [
      { source: "/.well-known/oauth-protected-resource", destination: "/api/oauth/metadata/resource" },
      { source: "/.well-known/oauth-protected-resource/:path*", destination: "/api/oauth/metadata/resource" },
      { source: "/.well-known/oauth-authorization-server", destination: "/api/oauth/metadata/server" },
      { source: "/.well-known/oauth-authorization-server/:path*", destination: "/api/oauth/metadata/server" },
      { source: "/.well-known/openid-configuration", destination: "/api/oauth/metadata/server" },
    ];
  },
  async redirects() {
    return [
      ...["individual", "individual-donor", "donor-individual", "donor_individual"].map((alias) => ({
        source: `/dashboard/${alias}/:path*`,
        destination: "/dashboard/donor/:path*",
        permanent: false,
      })),
      ...["business-donor", "donor-business", "donor_business", "corporate"].map((alias) => ({
        source: `/dashboard/${alias}/:path*`,
        destination: "/dashboard/business/:path*",
        permanent: false,
      })),
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "arizonachristiantuition.com",
        pathname: "/wp-content/**",
      },
      {
        // Partner school logos and photos are hosted on the schools' own sites.
        // Without this, next/image refuses them and the logo renders broken.
        protocol: "https",
        hostname: "valleychristianaz.org",
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
