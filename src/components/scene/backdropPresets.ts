import type { PresetsType } from "@react-three/drei/helpers/environment-assets";

export type BackdropPresetId =
  | "studio"
  | "daylight"
  | "sunset"
  | "night"
  | "rose";

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

// Design note: with the studio camera, the FLOOR plane fills most of the
// frame — the flat `background` color only peeks above the horizon. So each
// preset is designed floor-first (does this color look good full-screen?),
// with the background a deeper cousin of the floor for depth, and the fill/
// ambient lights tinted *against* the key so shadowed areas keep hue variety
// instead of collapsing into a monochrome wash.
export const BACKDROP_PRESETS: Record<BackdropPresetId, BackdropPreset> = {
  studio: {
    id: "studio",
    label: "Studio",
    swatch: "linear-gradient(135deg, #2a2a4a 0%, #b0b0ff 100%)",
    background: "#222237",
    floor: "#b0b0ff",
    ambient: { color: "#ffffff", intensity: 0.55 },
    hemisphere: { sky: "#fff4ec", ground: "#3a3a4a", intensity: 0.55 },
    keyLight: { color: "#ffebe3", intensity: 1.2 },
    fillLight: { color: "#ffebe3", intensity: 1.5 },
    rimLight: { color: "#fff2e7", intensity: 0.8 },
    environment: { preset: "city", intensity: 0.5 },
  },
  // Neutral bright daylight — near-white floor and soft blue-gray sky. The
  // truest preset for checking a character's real colors before export.
  daylight: {
    id: "daylight",
    label: "Daylight",
    swatch: "linear-gradient(135deg, #eef1f6 0%, #8fa0bd 100%)",
    background: "#b6c0d0",
    floor: "#e6e9ef",
    ambient: { color: "#ffffff", intensity: 0.6 },
    hemisphere: { sky: "#ffffff", ground: "#aab3c4", intensity: 0.55 },
    keyLight: { color: "#fff4e6", intensity: 1.15 },
    fillLight: { color: "#dfe9ff", intensity: 0.7 },
    rimLight: { color: "#ffffff", intensity: 0.55 },
    environment: { preset: "city", intensity: 0.6 },
  },
  // Golden hour: terracotta floor against a deep plum sky (not the same red
  // family — that read as a full-screen brick wash), warm key, lavender fill
  // so the shadow side stays colorful instead of muddy.
  sunset: {
    id: "sunset",
    label: "Sunset",
    swatch: "linear-gradient(135deg, #ffb37c 0%, #c97a5e 55%, #3f2440 100%)",
    background: "#3f2440",
    floor: "#bd7f63",
    ambient: { color: "#ffe3c4", intensity: 0.5 },
    hemisphere: { sky: "#ffab72", ground: "#56345c", intensity: 0.5 },
    keyLight: { color: "#ffbe85", intensity: 1.35 },
    fillLight: { color: "#b48ccb", intensity: 0.6 },
    rimLight: { color: "#ffdcae", intensity: 0.95 },
    environment: { preset: "sunset", intensity: 0.5 },
  },
  // Moonlight: cool but bright enough to read the character — dim blue-black
  // presets collapse outfits into silhouettes.
  night: {
    id: "night",
    label: "Night",
    swatch: "linear-gradient(135deg, #101726 0%, #3d517f 60%, #a8c8f0 100%)",
    background: "#111828",
    floor: "#2c3550",
    ambient: { color: "#b9c9e8", intensity: 0.5 },
    hemisphere: { sky: "#8fa8d8", ground: "#161c2e", intensity: 0.55 },
    keyLight: { color: "#dce8ff", intensity: 1.1 },
    fillLight: { color: "#7d8fc0", intensity: 0.5 },
    rimLight: { color: "#bfe0ff", intensity: 1.05 },
    environment: { preset: "night", intensity: 0.7 },
  },
  // Soft pink editorial studio — pastel floor, deeper mauve sky, cool blue
  // fill to keep skin tones from going bubblegum.
  rose: {
    id: "rose",
    label: "Rose",
    swatch: "linear-gradient(135deg, #f2d3e2 0%, #b0779d 100%)",
    background: "#a86e95",
    floor: "#f0cede",
    ambient: { color: "#fff0f6", intensity: 0.58 },
    hemisphere: { sky: "#ffe8f2", ground: "#b787a5", intensity: 0.5 },
    keyLight: { color: "#fff2f0", intensity: 1.1 },
    fillLight: { color: "#d6e4ff", intensity: 0.6 },
    rimLight: { color: "#ffffff", intensity: 0.5 },
    environment: { preset: "city", intensity: 0.55 },
  },
};

export const BACKDROP_PRESET_LIST: BackdropPreset[] =
  Object.values(BACKDROP_PRESETS);
