"use client";

import dynamic from "next/dynamic";
import EngineBoot from "@/components/ui/EngineBoot/EngineBoot";
// Pre-warm the shared WebGPU device before the engine chunk loads (see
// SceneDynamic / lib/gpu-device).
import "@/lib/gpu-device";

/**
 * Client-only boundary for the platformer experiment.
 *
 * PlatformerView mounts an EngineCanvas and pulls in three + drei +
 * bvhecctrl + Avatar — a large, strictly client-side bundle. The route
 * page is a Server Component, so the `dynamic(..., { ssr: false })` call
 * has to live here in a client module; importing this from the page keeps
 * the engine out of the route's first-load JS and off the server render.
 *
 * Shares the EngineBoot (logo + spinner) "3D scene loading" screen.
 */
const PlatformerView = dynamic(() => import("./PlatformerView"), {
  ssr: false,
  loading: () => <EngineBoot />,
});

export default PlatformerView;
