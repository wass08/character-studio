"use client";

import { Canvas } from "@react-three/fiber";
import type { ComponentProps } from "react";
import { WebGPURenderer } from "three/webgpu";

// Cache the renderer promise per DOM canvas. Strict-mode remounts and HMR
// would otherwise try to construct a second WebGPURenderer on a canvas
// that already has a GPU context attached. The WeakMap auto-evicts when
// the canvas DOM node is GC'd.
const RENDERER_CACHE = new WeakMap<
  HTMLCanvasElement,
  Promise<WebGPURenderer>
>();

const glFactory = (props: { canvas?: HTMLCanvasElement }) => {
  const canvas = props.canvas;
  const cached = canvas ? RENDERER_CACHE.get(canvas) : undefined;
  if (cached) return cached;
  const promise = (async () => {
    try {
      const renderer = new WebGPURenderer({
        canvas,
        antialias: true,
        alpha: true,
      });
      // WebGPURenderer falls back to a WebGL2 backend internally when
      // navigator.gpu is unavailable — init() resolves either way.
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
