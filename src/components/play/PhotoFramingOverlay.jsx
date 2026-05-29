"use client";

import { useEffect, useRef, useState } from "react";
import {
  PHOTO_ASPECT_RATIOS,
  useConfiguratorStore,
} from "@/stores/useConfiguratorStore";

/**
 * Letterbox / pillarbox overlay showing exactly what capturePhoto will
 * save under the active photoAspectRatio. The "frame" is the largest
 * rectangle of that ratio that fits inside the scene container; the
 * area outside is dimmed via a giant box-shadow so we don't have to
 * render four explicit bars. Pointer-events stay off so the orbit
 * controls underneath keep working.
 */
const PhotoFramingOverlay = () => {
  const open = useConfiguratorStore((s) => s.photoFramingOpen);
  const aspectId = useConfiguratorStore((s) => s.photoAspectRatio);
  const ratio = PHOTO_ASPECT_RATIOS[aspectId] ?? 1;
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  if (!open) return null;

  let frameW = 0;
  let frameH = 0;
  if (size.w > 0 && size.h > 0) {
    if (size.w / size.h > ratio) {
      frameH = size.h;
      frameW = frameH * ratio;
    } else {
      frameW = size.w;
      frameH = frameW / ratio;
    }
  }

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-20"
    >
      {frameW > 0 && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-white/40"
          style={{
            width: `${frameW}px`,
            height: `${frameH}px`,
            boxShadow: "0 0 0 100vmax rgba(0, 0, 0, 0.55)",
          }}
        />
      )}
    </div>
  );
};

export default PhotoFramingOverlay;
