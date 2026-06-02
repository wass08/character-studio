"use client";

import { createContext, type ReactNode, useContext } from "react";
import { MeshStandardMaterial } from "three";
import { useShallow } from "zustand/react/shallow";
import {
  DEFAULT_SKIN_COLOR,
  useConfiguratorStore,
} from "@/stores/useConfiguratorStore";

// The shared skin material lives on the store but is a three.js object, so
// it's created here in the engine chunk (where `three` is already loaded)
// rather than at store-init — that keeps `three` out of the app-wide store
// bundle. This module is imported by every engine leaf (Asset, Avatar,
// SkinManager) and evaluates before any of them render, so `skin` is
// populated before it's read. updateSkin/SkinManager re-apply the actual
// character colour + texture afterward, so the placeholder colour is fine.
if (!useConfiguratorStore.getState().skin) {
  useConfiguratorStore.setState({
    skin: new MeshStandardMaterial({
      color: DEFAULT_SKIN_COLOR,
      roughness: 1,
    }),
  });
}

/**
 * The single React context every engine leaf reads from to render one
 * character. It exists so `Asset`, `Avatar`, and `SkinManager` stop
 * binding directly to `useConfiguratorStore` — the editor still drives
 * them via the singleton store (through `<StoreCharacterProvider>`), but
 * other surfaces (the multi-character plaza, per-character scoped
 * experiments) can mount the same engine with their own data source.
 *
 * Scope is deliberate: only the slices the engine needs to render +
 * the four callbacks the engine writes back through (color edits,
 * morph/slot registration, export pipeline wiring). Anything the UI
 * needs (modes, dirty flags, save flows) stays on the store.
 *
 * The `pb` PocketBase client is a non-state singleton; engine code that
 * resolves asset URLs keeps importing it directly from the store module.
 */

export type AssetRecord = {
  r2Url?: string | null;
  url?: string | null;
  collectionId?: string;
  id?: string;
};

export type CustomizationEntry = {
  asset?: AssetRecord | null;
  color?: string | null;
  colors?: Record<string, string>;
};

export type Customization = Record<string, CustomizationEntry>;

export type LockedGroupEntry = { name: string; categoryName: string };
export type LockedGroups = Record<string, LockedGroupEntry[]>;

export type ExportOptions = {
  animations?: boolean;
  visemes?: boolean;
  arkit?: boolean;
  tpose?: boolean;
  optimize?: boolean;
  compression?: "none" | "draco" | "meshopt";
  dryRun?: boolean;
};

export type ExportPipeline = (opts?: ExportOptions) => Promise<number | null>;

export type ColorInput = string | { hex: string };

export type CharacterContextValue = {
  gender: string;
  customization: Customization;
  morphValues: Record<string, number>;
  height: number;
  pose: string;
  // Ephemeral idle-juice gesture layered over `pose`; null = use `pose`.
  // Optional so non-store providers needn't supply it.
  gesture?: string | null;
  skin: MeshStandardMaterial | null;
  lockedGroups: LockedGroups;

  updateColor: (
    categoryName: string,
    color: ColorInput,
    slotName?: string | null,
  ) => void;
  registerMorphs: (categoryName: string, keys: string[]) => void;
  registerColorSlots: (categoryName: string, slots: string[]) => void;
  setDownload: (downloader: ExportPipeline) => void;
};

const CharacterContext = createContext<CharacterContextValue | null>(null);

export function useCharacter(): CharacterContextValue {
  const value = useContext(CharacterContext);
  if (!value) {
    throw new Error(
      "useCharacter must be used inside a <StoreCharacterProvider> (or another CharacterContext.Provider).",
    );
  }
  return value;
}

// Narrow store slice the provider reads. The store stays untyped JS per
// the engine-rewrite TypeScript boundary; consumers declare the shape they
// need at the call site.
type StoreSlice = CharacterContextValue;

/**
 * Editor / hero / per-character-play wrapper that pipes the singleton
 * `useConfiguratorStore` into `CharacterContext`. Selector is wrapped in
 * `useShallow` so the provider only re-renders when one of the picked
 * slices changes by reference (callbacks from zustand are stable).
 */
export function StoreCharacterProvider({ children }: { children: ReactNode }) {
  const value = useConfiguratorStore(
    useShallow((state: StoreSlice) => ({
      gender: state.gender,
      customization: state.customization,
      morphValues: state.morphValues,
      height: state.height,
      pose: state.pose,
      gesture: state.gesture,
      skin: state.skin,
      lockedGroups: state.lockedGroups,
      updateColor: state.updateColor,
      registerMorphs: state.registerMorphs,
      registerColorSlots: state.registerColorSlots,
      setDownload: state.setDownload,
    })),
  );
  return (
    <CharacterContext.Provider value={value}>
      {children}
    </CharacterContext.Provider>
  );
}
