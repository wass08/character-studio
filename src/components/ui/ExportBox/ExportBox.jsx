"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  COMPRESSION,
  UI_MODES,
  useConfiguratorStore,
} from "@/stores/useConfiguratorStore";
import { cn } from "../primitives/cn";

const COMPRESSION_OPTIONS = [
  { value: COMPRESSION.NONE, label: "None" },
  { value: COMPRESSION.DRACO, label: "Draco" },
  { value: COMPRESSION.MESHOPT, label: "Meshopt" },
];

const PILL_SPRING = { type: "spring", stiffness: 380, damping: 32 };

const SECTIONS = [
  {
    items: [
      {
        key: "animations",
        label: "Animations",
        description: "Include skeletal animation clips",
      },
      {
        key: "tpose",
        label: "T-Pose",
        description: "Export in neutral bind pose",
      },
    ],
  },
  {
    title: "Shape Keys",
    items: [
      {
        key: "visemes",
        label: "Visemes",
        description: "Include lip-sync morph targets",
      },
      {
        key: "arkit",
        label: "ARKit",
        description: "Include ARKit face-tracking blendshapes",
      },
    ],
  },
  {
    divider: true,
    items: [
      {
        key: "optimize",
        label: "Optimize",
        description: "Merge, dedupe & quantize (gltf-transform)",
      },
    ],
  },
];

const CompressionPicker = ({ value, onChange }) => (
  <div className="px-1 pt-2">
    <div className="mb-1.5 px-1.5 text-[10px] font-semibold tracking-[0.14em] text-white/65 uppercase">
      Compression
    </div>
    <div className="relative flex flex-row items-stretch gap-0.5 rounded-lg bg-black/15 p-1 ring-1 ring-white/[0.04]">
      {COMPRESSION_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative flex flex-1 items-center justify-center rounded-md px-2 py-1.5 text-[11px] font-medium tracking-tight transition-colors",
              active ? "text-white" : "text-white/55 hover:text-white/85",
            )}
          >
            {active && (
              <motion.div
                layoutId="export-compression-pill"
                transition={PILL_SPRING}
                className="absolute inset-0 rounded-md bg-white/12 ring-1 ring-white/25 shadow-[0_0_16px_rgba(255,255,255,0.12)]"
              />
            )}
            <span className="relative">{opt.label}</span>
          </button>
        );
      })}
    </div>
  </div>
);

const formatBytes = (bytes) => {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const Checkbox = ({ checked, label, description, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className="group flex w-full items-start gap-3 rounded-md p-2.5 text-left transition-colors hover:bg-white/[0.04]"
  >
    <span
      className={cn(
        "relative mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
        checked
          ? "border-white/60 bg-white/15"
          : "border-white/15 bg-white/[0.04] group-hover:border-white/30",
      )}
    >
      <motion.svg
        initial={false}
        animate={{ scale: checked ? 1 : 0.4, opacity: checked ? 1 : 0 }}
        transition={{ duration: 0.15 }}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="h-3 w-3 text-white"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m4.5 12.75 6 6 9-13.5"
        />
      </motion.svg>
    </span>
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium tracking-tight text-white/90">
        {label}
      </span>
      <span className="text-[10px] tracking-tight text-white/45">
        {description}
      </span>
    </div>
  </button>
);

const ExportBox = () => {
  const exportSettings = useConfiguratorStore((s) => s.exportSettings);
  const setExportSetting = useConfiguratorStore((s) => s.setExportSetting);
  const download = useConfiguratorStore((s) => s.download);
  const setMode = useConfiguratorStore((s) => s.setMode);
  const exporting = useConfiguratorStore((s) => s.exporting);
  const setExporting = useConfiguratorStore((s) => s.setExporting);
  const estimating = useConfiguratorStore((s) => s.estimating);
  const setEstimating = useConfiguratorStore((s) => s.setEstimating);
  const estimatedSize = useConfiguratorStore((s) => s.estimatedSize);
  const setEstimatedSize = useConfiguratorStore((s) => s.setEstimatedSize);

  const estimateSeq = useRef(0);

  useEffect(() => {
    const seq = ++estimateSeq.current;
    setEstimating(true);
    const timer = setTimeout(async () => {
      try {
        const size = await download({ ...exportSettings, dryRun: true });
        if (seq === estimateSeq.current) setEstimatedSize(size);
      } catch (e) {
        console.error("Estimate failed", e);
        if (seq === estimateSeq.current) setEstimatedSize(null);
      } finally {
        if (seq === estimateSeq.current) setEstimating(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [exportSettings, download]);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await download(exportSettings);
      setMode(UI_MODES.CUSTOMIZE);
    } catch (e) {
      console.error("Export failed", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex max-h-[60vh] w-full px-2 pb-2",
        "md:absolute md:inset-x-auto md:bottom-auto md:top-1/2 md:left-4 md:max-h-[calc(100vh-32px)] md:w-[300px] md:-translate-y-1/2 md:px-0 md:pb-0",
      )}
    >
      <div className="glass-panel flex w-full flex-col gap-3 overflow-hidden rounded-xl p-4">
        <h3 className="px-1 text-[10px] font-semibold tracking-[0.14em] text-white/70 uppercase">
          Export Settings
        </h3>

        <div className="flex flex-col gap-1">
          {SECTIONS.map((section, idx) => (
            <div
              key={idx}
              className={cn(
                "flex flex-col gap-0.5",
                section.divider && "mt-1 border-t border-white/[0.08] pt-2",
              )}
            >
              {section.title && (
                <div className="mt-1 mb-0.5 px-2.5 text-[9px] font-semibold tracking-[0.14em] text-white/40 uppercase">
                  {section.title}
                </div>
              )}
              {section.items.map((s) => (
                <Checkbox
                  key={s.key}
                  checked={!!exportSettings[s.key]}
                  label={s.label}
                  description={s.description}
                  onChange={() =>
                    setExportSetting(s.key, !exportSettings[s.key])
                  }
                />
              ))}
            </div>
          ))}
          <CompressionPicker
            value={exportSettings.compression}
            onChange={(v) => setExportSetting("compression", v)}
          />
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.08] px-1 pt-3">
          <span className="text-[10px] tracking-[0.12em] text-white/45 uppercase">
            Estimated size
          </span>
          <span className="text-xs font-medium text-white/85">
            {estimating ? "Estimating…" : formatBytes(estimatedSize)}
          </span>
        </div>

        <motion.button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          whileHover={{ scale: exporting ? 1 : 1.02 }}
          whileTap={{ scale: exporting ? 1 : 0.97 }}
          className={cn(
            "inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-medium tracking-tight transition-colors",
            exporting
              ? "cursor-not-allowed bg-white/10 text-white/50"
              : "bg-white text-black hover:bg-white/90",
          )}
        >
          {exporting ? "Exporting…" : "Export GLB"}
        </motion.button>
      </div>
    </div>
  );
};

export default ExportBox;
