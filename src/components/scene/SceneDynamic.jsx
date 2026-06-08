"use client";

import dynamic from "next/dynamic";
import EngineBoot from "@/components/ui/EngineBoot/EngineBoot";
// Side-effect import: starts the shared WebGPU device request immediately (at
// view mount), before the heavy engine chunk below finishes loading — so the
// device is ready when the canvas mounts and init() resolves before R3F's
// StrictMode teardown window. three-free, so it doesn't pull in the engine.
import "@/lib/gpu-device";

/**
 * Client-only boundary for the studio `<Scene>`.
 *
 * `Scene` pulls in three + three/webgpu + @react-three/drei — a ~1.6 MB,
 * strictly client-side bundle (WebGPU/WebGL can't run during SSR). Importing
 * it statically dragged that whole graph into every consuming route's
 * first-load JS *and* the server render pass, so the page couldn't paint or
 * hydrate until it downloaded.
 *
 * Loading it through `next/dynamic` with `ssr: false` splits the engine into
 * its own async chunk that streams in after the shell paints, and keeps it
 * off the server entirely. Consumers import this in place of `./Scene` with
 * no API change — it forwards children and props straight through.
 *
 * The `loading` bridge (EngineBoot: logo + spinner) covers the engine-boot gap
 * — chunk download + WebGPU init — before the canvas is live. Once it is, the
 * in-canvas 3D diamond takes over until the character's meshes decode.
 */
const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => <EngineBoot />,
});

export default Scene;
