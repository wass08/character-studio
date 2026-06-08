"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";

type DeviceLostInfo = {
  api?: string;
  message?: string;
  reason?: string | null;
};

type WatchableRenderer = {
  onDeviceLost?: (info: DeviceLostInfo) => void;
  backend?: {
    device?: {
      addEventListener?: (type: string, cb: (e: Event) => void) => void;
      removeEventListener?: (type: string, cb: (e: Event) => void) => void;
    };
  };
};

/**
 * Logs WebGPU `device.lost` + uncaptured GPU errors (otherwise silent), and on
 * a real device loss (GPU reset, driver crash, tab-reclaim) calls `onLost` —
 * which bumps the Canvas key in <Scene> to remount on a fresh device. Lives
 * inside the Canvas so it can read the live renderer via useThree.
 *
 * (The dev-only StrictMode cold-reload freeze is handled separately by
 * <FrameLimiter>; that's not a device-loss event, so it isn't this watcher's
 * job.)
 */
export const GPUDeviceWatcher = ({ onLost }: { onLost: () => void }) => {
  const gl = useThree((s) => s.gl) as unknown as WatchableRenderer;
  // Keep the latest callback without re-subscribing the device handlers.
  const onLostRef = useRef(onLost);
  onLostRef.current = onLost;

  useEffect(() => {
    if (!gl) return;
    let active = true;

    // three has already flagged _isDeviceLost and stopped drawing by the time
    // this fires — log + recover. Chain (not replace) so three's built-in
    // handling still runs.
    const prev = gl.onDeviceLost?.bind(gl);
    gl.onDeviceLost = (info: DeviceLostInfo) => {
      prev?.(info);
      console.error(
        `[engine] WebGPU device lost (${info?.api ?? "WebGPU"}): ${
          info?.message ?? "unknown"
        }${info?.reason ? ` — ${info.reason}` : ""}`,
      );
      if (active) onLostRef.current();
    };

    // Non-fatal validation errors are normally silent — surface them so a
    // future silent corruption leaves a trail.
    const device = gl.backend?.device;
    const onUncaptured = (e: Event) => {
      const err = (e as unknown as { error?: { message?: string } }).error;
      console.error("[engine] WebGPU uncaptured error:", err?.message ?? err);
    };
    device?.addEventListener?.("uncapturederror", onUncaptured);

    return () => {
      active = false;
      if (prev) gl.onDeviceLost = prev;
      device?.removeEventListener?.("uncapturederror", onUncaptured);
    };
  }, [gl]);

  return null;
};

export default GPUDeviceWatcher;
