// Shared, pre-warmed WebGPU device — the root cure for the StrictMode
// cold-reload freeze (see EngineCanvas for the full mechanism). Requested ONCE
// and handed to every WebGPURenderer so three skips the slow adapter/device
// request and `init()` resolves before R3F's deferred strict-unmount teardown.
//
// Deliberately three-FREE so it can be imported eagerly (e.g. from SceneDynamic)
// to start the GPU adapter/device request before the heavy engine chunk loads —
// maximizing the head start so the device is ready by the time the canvas
// mounts. three also never destroys an externally-provided device on renderer
// dispose, so this one device survives the strict teardown and every remount.

type GPUDeviceLike = { lost?: Promise<unknown> };
type GPUAdapterLike = { requestDevice?: () => Promise<GPUDeviceLike> };
type GPULike = {
  requestAdapter?: (o?: { powerPreference?: string }) => Promise<GPUAdapterLike | null>;
};

let devicePromise: Promise<GPUDeviceLike | null> | null = null;

export function getSharedGpuDevice(): Promise<GPUDeviceLike | null> {
  if (devicePromise) return devicePromise;
  devicePromise = (async () => {
    try {
      const gpu =
        typeof navigator !== "undefined"
          ? (navigator as unknown as { gpu?: GPULike }).gpu
          : undefined;
      if (!gpu?.requestAdapter) return null; // no WebGPU → three picks WebGL2
      const adapter = await gpu.requestAdapter({
        powerPreference: "high-performance",
      });
      const device = (await adapter?.requestDevice?.()) ?? null;
      // Device lost (GPU reset / driver crash) → drop it so the next renderer
      // builds a fresh one (the <Scene> watchdog remounts the canvas on loss).
      device?.lost?.then(() => {
        devicePromise = null;
      });
      return device;
    } catch {
      devicePromise = null;
      return null;
    }
  })();
  return devicePromise;
}

// Kick off the request as soon as this module is imported.
if (typeof navigator !== "undefined") void getSharedGpuDevice();
