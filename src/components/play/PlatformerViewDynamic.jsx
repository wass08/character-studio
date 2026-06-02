"use client";

import dynamic from "next/dynamic";

/**
 * Client-only boundary for the platformer experiment.
 *
 * PlatformerView mounts an EngineCanvas and pulls in three + drei +
 * bvhecctrl + Avatar — a large, strictly client-side bundle. The route
 * page is a Server Component, so the `dynamic(..., { ssr: false })` call
 * has to live here in a client module; importing this from the page keeps
 * the engine out of the route's first-load JS and off the server render.
 */
const PlatformerView = dynamic(() => import("./PlatformerView"), {
  ssr: false,
});

export default PlatformerView;
