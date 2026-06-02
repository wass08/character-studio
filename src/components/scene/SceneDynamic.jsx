"use client";

import dynamic from "next/dynamic";

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
 * The views that render this already overlay their own `<LoadingScreen>` /
 * `<Spinner>` tied to store state, so no `loading` placeholder is needed here.
 */
const Scene = dynamic(() => import("./Scene"), { ssr: false });

export default Scene;
