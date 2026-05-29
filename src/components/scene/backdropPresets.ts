import type { PresetsType } from "@react-three/drei/helpers/environment-assets";

export type BackdropPresetId = "studio" | "sunset" | "night";

type ColorIntensity = { color: string; intensity: number };

export type BackdropPreset = {
  id: BackdropPresetId;
  label: string;
  swatch: string;
  background: string;
  floor: string;
  ambient: ColorIntensity;
  hemisphere: { sky: string; ground: string; intensity: number };
  keyLight: ColorIntensity;
  fillLight: ColorIntensity;
  rimLight: ColorIntensity;
  environment: { preset: PresetsType; intensity: number };
};

export const DEFAULT_BACKDROP: BackdropPresetId = "studio";

export const BACKDROP_PRESETS: Record<BackdropPresetId, BackdropPreset> = {
  studio: {
    id: "studio",
    label: "Studio",
    swatch:
      "linear-gradient(135deg, #2a2a4a 0%, #b0b0ff 100%)",
    background: "#222237",
    floor: "#b0b0ff",
    ambient: { color: "#ffffff", intensity: 0.55 },
    hemisphere: { sky: "#fff4ec", ground: "#3a3a4a", intensity: 0.55 },
    keyLight: { color: "#ffebe3", intensity: 1.2 },
    fillLight: { color: "#ffebe3", intensity: 1.5 },
    rimLight: { color: "#fff2e7", intensity: 0.8 },
    environment: { preset: "city", intensity: 0.5 },
  },
  sunset: {
    id: "sunset",
    label: "Sunset",
    swatch:
      "linear-gradient(135deg, #ff7c4a 0%, #ffcd9e 50%, #5b2230 100%)",
    background: "#3b1f2e",
    floor: "#a05a3a",
    ambient: { color: "#ffd9b0", intensity: 0.5 },
    hemisphere: { sky: "#ffb87c", ground: "#3a2030", intensity: 0.6 },
    keyLight: { color: "#ff9968", intensity: 1.4 },
    fillLight: { color: "#ff8855", intensity: 0.9 },
    rimLight: { color: "#ffcd9e", intensity: 1.1 },
    environment: { preset: "sunset", intensity: 0.7 },
  },
  night: {
    id: "night",
    label: "Night",
    swatch:
      "linear-gradient(135deg, #08101e 0%, #324875 60%, #73e2ff 100%)",
    background: "#08101e",
    floor: "#1d2433",
    ambient: { color: "#9bb8ff", intensity: 0.35 },
    hemisphere: { sky: "#5077ff", ground: "#0a0f1e", intensity: 0.45 },
    keyLight: { color: "#aac6ff", intensity: 0.75 },
    fillLight: { color: "#d8c4ff", intensity: 0.55 },
    rimLight: { color: "#73e2ff", intensity: 1.3 },
    environment: { preset: "night", intensity: 0.55 },
  },
};

export const BACKDROP_PRESET_LIST: BackdropPreset[] = Object.values(
  BACKDROP_PRESETS,
);
