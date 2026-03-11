import { useConfiguratorStore } from "@/stores/useConfiguratorStore";
import "./HeightSlider.css";

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
      className="height-slider-container"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="height-slider-track-wrapper">
        <div
          className="height-slider-fill"
          style={{ width: `${fillPercent}%` }}
        />
        <span className="height-slider-label-inline">Height</span>
        <span className="height-slider-value-inline">{displayValue}</span>
        <input
          className="height-slider-input"
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
