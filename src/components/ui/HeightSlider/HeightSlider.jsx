import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { cn } from "../primitives/cn";

export const HeightSlider = () => {
  const height = useConfiguratorStore((state) => state.height);
  const setHeight = useConfiguratorStore((state) => state.setHeight);

  const min = 0;
  const max = 2.0;
  const numericValue = height || 0;
  const ratio = (numericValue - min) / (max - min);
  const fillWidth = `calc(2px + ${ratio} * (100% - 4px))`;
  const displayValue = numericValue.toFixed(2);

  return (
    <div
      className="w-full max-md:w-[180px]"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="group relative flex h-10 shrink-0 items-center overflow-hidden rounded-md border border-white/[0.05] bg-black/25 px-3 transition-colors hover:border-white/15 hover:bg-black/30 focus-within:border-white/15 focus-within:bg-black/30"
        onMouseLeave={(e) => e.currentTarget.querySelector("input")?.blur()}
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-0 rounded-md bg-white/[0.04] transition-colors group-hover:bg-white/[0.10] group-focus-within:bg-white/[0.10]"
          style={{ width: fillWidth }}
        />
        <span className="pointer-events-none relative z-[1] flex-1 truncate text-[10px] font-medium tracking-wide text-white/45 transition-colors select-none group-hover:text-white/90 group-focus-within:text-white/90">
          Height
        </span>
        <span className="pointer-events-none relative z-[1] min-w-[2.4ch] text-right text-[10px] font-normal tracking-wide text-white/80 opacity-0 transition-opacity select-none group-hover:opacity-100 group-focus-within:opacity-100">
          {displayValue}
        </span>
        <input
          className={cn(
            "absolute inset-y-0 left-[2px] right-[2px] z-[2] cursor-pointer appearance-none bg-transparent",
            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-[2px] [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:bg-white/35 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-colors",
            "group-hover:[&::-webkit-slider-thumb]:bg-white group-focus-within:[&::-webkit-slider-thumb]:bg-white",
            "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-[2px] [&::-moz-range-thumb]:rounded-sm [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white/35 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:transition-colors",
            "group-hover:[&::-moz-range-thumb]:bg-white group-focus-within:[&::-moz-range-thumb]:bg-white",
          )}
          type="range"
          min={min}
          max={max}
          step="0.01"
          value={numericValue}
          onChange={(e) => setHeight(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
};
