/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // Vocabulary lock from plans/app-nav-and-positioning.md phase 1 renamed
  // a few routes; redirects preserve any external links into the old paths.
  // /play/[experiment] becomes per-character at /c/[id]/try/[experiment] —
  // the bare path can't carry the IA, so it redirects to the workspace.
  async redirects() {
    return [
      { source: "/me", destination: "/studio", permanent: true },
      { source: "/me/:path*", destination: "/studio/:path*", permanent: true },
      { source: "/create", destination: "/editor", permanent: true },
      {
        source: "/create/:id",
        destination: "/editor/:id",
        permanent: true,
      },
      {
        source: "/play/:experiment",
        destination: "/studio",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
