import path from "node:path";
import { fileURLToPath } from "node:url";

// Declare Turbopack's workspace root explicitly so the "multiple
// lockfiles" dev-overlay warning goes away. We anchor to the parent
// directory (the one that holds yarn.lock and was already being
// auto-inferred); setting it to the project dir instead breaks CSS
// module resolution because the @tailwindcss/postcss resolver walks
// up from src/app/globals.css and a tighter root rejects the lookup.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.dirname(projectRoot);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  turbopack: {
    root: workspaceRoot,
  },
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
      // Playground was renamed to Photo Booth; preserve any saved links.
      {
        source: "/c/:id/try/playground",
        destination: "/c/:id/try/photobooth",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
