"use client";

import { Canvas } from "@react-three/fiber";
import type { ComponentProps } from "react";
import { WebGPURenderer } from "three/webgpu";
import { getSharedGpuDevice } from "@/lib/gpu-device";

// ─── Root cure for the StrictMode cold-reload freeze ────────────────────────
// The freeze is a race: R3F v9's dev-only mount→unmount→mount schedules (in
// `unmountComponentAtNode`) a deferred `_roots.delete(canvas)` ~500ms later that
// drops the root from the global render loop. That teardown poisons the LIVE
// session only when the renderer's async `init()` is still in flight when it
// fires — which on a cold reload it is, because `WebGPURenderer.init()` requests
// the GPU adapter + device (slow). Warm SPA nav is fine because init is fast.
//
// We hand every renderer the shared, pre-warmed device (see lib/gpu-device).
// three SKIPS the adapter/device request when `device` is provided
// (three.webgpu.js: `if (parameters.device === undefined) { …request… } else {
// use it }`), so `init()` is near-instant and resolves before the teardown
// window — no race, no freeze. three also does NOT destroy an externally
// provided device on renderer dispose (`if (parameters.device === undefined)
// device.destroy()`), so the one device survives the strict teardown AND every
// recovery remount — zero device churn.

// Per-canvas in-flight renderer cache. R3F v9's Canvas effect has NO dependency
// array, so `configure()` (and thus this factory) runs on every commit; under
// StrictMode's reused canvas, caching the in-flight Promise makes the second
// invocation reuse renderer #1 instead of constructing a second one. Evict only
// on init *failure* so an in-flight R3F await never sees a missing entry.
const RENDERER_CACHE = new WeakMap<
  HTMLCanvasElement,
  Promise<WebGPURenderer>
>();

type RendererParams = ConstructorParameters<typeof WebGPURenderer>[0];

const glFactory = (props: { canvas?: HTMLCanvasElement }) => {
  const canvas = props.canvas;
  const cached = canvas ? RENDERER_CACHE.get(canvas) : undefined;
  if (cached) return cached;

  const promise = (async () => {
    try {
      const device = await getSharedGpuDevice();
      const params = {
        canvas,
        antialias: true,
        alpha: true,
        // Pass the pre-warmed device so init() skips the adapter/device
        // request. Omitted when WebGPU is unavailable → three falls back to a
        // WebGL2 backend internally.
        ...(device ? { device } : {}),
      } as RendererParams;
      const renderer = new WebGPURenderer(params);
      await renderer.init();
      return renderer;
    } catch (err) {
      if (canvas) RENDERER_CACHE.delete(canvas);
      console.error("[engine] WebGPURenderer init failed", err);
      throw err;
    }
  })();

  if (canvas) RENDERER_CACHE.set(canvas, promise);
  return promise;
};

type CanvasOwnProps = ComponentProps<typeof Canvas>;

export const EngineCanvas = (props: Omit<CanvasOwnProps, "gl">) => (
  // R3F's `gl` prop type doesn't list `Promise<Renderer>` returns even
  // though the runtime accepts them; cast through unknown.
  <Canvas {...props} gl={glFactory as unknown as CanvasOwnProps["gl"]} />
);

export default EngineCanvas;
