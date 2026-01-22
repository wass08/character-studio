import { useConfiguratorStore } from "@/stores/useConfiguratorStore";

import "./HeightSlider.css";

export const HeightSlider = () => {
  const height = useConfiguratorStore((state) => state.height);
  const setHeight = useConfiguratorStore((state) => state.setHeight);

  return (
    <div
      className="absolute top-2 left-80 p-4 bg-white/10 rounded-lg"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <label className="block text-white mb-2">
        Height: {height.toFixed(2)}
      </label>
      <input
        type="range"
        min="0"
        max="2.0"
        step="0.01"
        value={height}
        onChange={(e) => setHeight(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
};
