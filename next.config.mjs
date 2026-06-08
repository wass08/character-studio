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
  // StrictMode is ON. The dev-only mount→unmount→mount races R3F's async
  // WebGPU renderer init on a cold reload: R3F's deferred `unmountComponentAtNode`
  // runs a 500ms-later `_roots.delete(canvas)` that drops the root from the
  // global render loop, freezing the canvas (no error). We handle it without
  // opting out of StrictMode via: (1) an adapter pre-warm so cold init is fast
  // enough to usually dodge the window (EngineCanvas), and (2) a frame-stall
  // watchdog that remounts the Canvas on a fresh node if the loop dies — which
  // also recovers real GPU device loss (GPUDeviceWatcher + Scene watchdog).
  reactStrictMode: true,
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
