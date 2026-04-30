import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import { cn } from "../primitives/cn";

export const HeightSlider = () => {
  const height = useConfiguratorStore((state) => state.height);
  const setHeight = useConfiguratorStore((state) => state.setHeight);

  const min = 0;
  const max = 2.0;
  const numericValue = height || 0;
  const fillPercent = ((numericValue - min) / (max - min)) * 100;
  const displayValue = numericValue.toFixed(2);

  return (
    <div
      className="w-full max-md:w-[180px]"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="relative flex h-7 items-center rounded-md border border-white/10 bg-white/[0.06] px-2.5">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 rounded-md bg-white/15"
          style={{ width: `${fillPercent}%` }}
        />
        <span className="pointer-events-none relative z-[1] flex-1 truncate text-[10px] font-normal tracking-wide text-white/85 select-none">
          Height
        </span>
        <span className="pointer-events-none relative z-[1] min-w-[2.4ch] text-right text-[10px] font-normal tracking-wide text-white/75 select-none">
          {displayValue}
        </span>
        <input
          className={cn(
            "absolute inset-0 z-[2] h-full w-full cursor-pointer appearance-none bg-transparent",
            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-[3px] [&::-webkit-slider-thumb]:rounded [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer",
            "[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-[3px] [&::-moz-range-thumb]:rounded [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer",
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
