import PocketBase from "pocketbase";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { enqueueCharacterBake } from "@/lib/bakeJobs";

const pocketBaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;

if (!pocketBaseUrl) {
  throw new Error("NEXT_PUBLIC_POCKETBASE_URL is needed");
}
export const pb = new PocketBase(pocketBaseUrl);

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => Math.random() * (max - min) + min;

export const DEFAULT_SKIN_COLOR = "#E7AF91";

export const hiddenPrefixes = [
  "viseme",
  "eyeBlink",
  "eyeLook",
  "eyeWide",
  "eyeSquint",
  "brow",
  "jaw",
  "mouth",
  "cheekPuff",
  "cheekSquint",
  "noseSneer",
  "tongueOut",
];

const excludedColorCategories = ["Eyes"];

// In-flight dedup for fetchCategories. The catalog fetch ends by writing the
// DEFAULT customization, so two concurrent callers (e.g. loadCharacter's
// internal fetch + GlobalChrome's mount fetch) would each finish and stomp the
// store — the last writer wins, and defaults can clobber a just-loaded
// character. Sharing one promise means the catalog (and its default
// customization) is written exactly once; loadCharacter then applies the real
// customization after awaiting it.
let categoriesFetchPromise = null;
let categoriesFetchSeq = 0;

// Monotonic token so only the most-recent loadCharacter writes the store. Two
// can race on a profile page — the route's viewed character and
// AuthBootstrapper's persisted/main character — and an older one resolving
// last would clobber the newer with stale (or default-looking) data.
let loadCharacterSeq = 0;

// Aspect-ratio presets for the Photo Booth crop. Values are width/height.
// The framing overlay draws a box at this ratio; capturePhoto crops the
// rendered frame to match. Order = display order in the bottom bar.
export const PHOTO_ASPECT_RATIOS = {
  "16:9": 16 / 9,
  "1:1": 1,
  "9:16": 9 / 16,
};
export const PHOTO_ASPECT_DEFAULT = "1:1";

// Curated subset of the rig's animation clips for the Photo Booth.
// Object insertion order = button order in PosesBox. Add/remove freely;
// values must match clip names exactly (see Animations.glb).
export const PHOTO_POSES = {
  Idle: "Rig|Idle_Loop",
  Talking: "Rig|Idle_Talking_Loop",
  Walk: "Rig|Walk_Loop",
  Dance: "Rig|Dance_Loop",
  Driving: "Rig|Driving_Loop",
  Punch: "Rig|Punch_Cross",
  Pistol: "Rig|Pistol_Idle_Loop",
  Spell: "Rig|Spell_Simple_Idle_Loop",
};

export const UI_MODES = {
  PHOTO: "photo",
  CUSTOMIZE: "customize",
  EXPORT: "export",
  LIPSYNC: "lipsync",
};

export const BACKDROP_IDS = ["studio", "daylight", "sunset", "night", "rose"];

export const COMPRESSION = {
  NONE: "none",
  DRACO: "draco",
  MESHOPT: "meshopt",
};

const DEFAULT_EXPORT_SETTINGS = {
  animations: true,
  visemes: false,
  arkit: false,
  tpose: true,
  optimize: true,
  compression: COMPRESSION.DRACO,
};

export const GENDERS = {
  MAN: "man",
  WOMAN: "woman",
  OTHER: "other", // In case we want to add more
  NONE: "none", // In case we don't want to start with a default gender
};

export const resolveStartingAssetId = (value) =>
  Array.isArray(value) ? value[0] || "" : value || "";

// Builds the starting customization for a gender from the loaded categories:
// each category's configured starting asset (per gender), falling back to the
// first asset for required categories. Shared by the initial category fetch
// and "start a new character" so both produce an identical default look.
export const buildDefaultCustomization = (categories, gender) => {
  const customization = {};
  categories.forEach((category) => {
    customization[category.name] = {
      color: category.name === "Skin" ? DEFAULT_SKIN_COLOR : null,
      asset: null,
      colors: {},
    };

    const startingAssetId = resolveStartingAssetId(
      gender === GENDERS.MAN
        ? category.startingAssetMan
        : category.startingAssetWoman,
    );

    if (startingAssetId) {
      const foundAsset = category.assets.find((a) => a.id === startingAssetId);
      if (foundAsset) customization[category.name].asset = foundAsset;
    }

    if (
      !category.optional &&
      !customization[category.name].asset &&
      category.assets.length > 0
    ) {
      customization[category.name].asset = category.assets[0];
    }
  });
  return customization;
};

export const useConfiguratorStore = create(
  persist(
    (set, get) => ({
      loading: true,
      // Per-category "a swap is in flight" flags. The engine sets these while
      // it preloads a replacement part (GLB or makeup texture) and keeps the
      // current one on screen; the asset panel reads them to spin the
      // thumbnail being applied. Keyed by category name.
      assetLoading: {},
      setAssetLoading: (categoryName, isLoading) =>
        set((state) => {
          if (Boolean(state.assetLoading[categoryName]) === isLoading) {
            return state;
          }
          const next = { ...state.assetLoading };
          if (isLoading) {
            next[categoryName] = true;
          } else {
            delete next[categoryName];
          }
          return { assetLoading: next };
        }),
      gender: GENDERS.WOMAN,
      // gender: Math.random() > 0.5 ? GENDERS.MAN : GENDERS.WOMAN,
      setGender: (gender) => {
        if (get().gender === gender) return;

        // A character route may still be resolving its saved look. A direct
        // user gender choice takes ownership from that request.
        loadCharacterSeq += 1;
        // Any in-flight catalog fetch is for the old gender — drop it so the
        // next fetchCategories rebuilds with the new gender's assets.
        categoriesFetchSeq += 1;
        categoriesFetchPromise = null;
        set({
          gender: gender,
          loading: true,
          categories: [],
          sections: [],
          customization: {},
          pose: PHOTO_POSES.Idle,
          activeSectionId: null,
          currentCategory: null,
          isDirty: true,
        });
      },
      photoAspectRatio: PHOTO_ASPECT_DEFAULT,
      setPhotoAspectRatio: (id) => set({ photoAspectRatio: id }),
      // Session-only — true while the user has the framing/capture UI
      // open. Default off so the Photo Booth starts as a clean scene
      // and the framing overlay only appears on explicit intent.
      photoFramingOpen: false,
      setPhotoFramingOpen: (open) => set({ photoFramingOpen: open }),
      mode: UI_MODES.CUSTOMIZE,
      setMode: (mode) => {
        set({ mode });
        if (mode === UI_MODES.CUSTOMIZE || mode === UI_MODES.LIPSYNC) {
          set({ pose: PHOTO_POSES.Idle });
        }
      },
      pose: PHOTO_POSES.Idle,
      setPose: (pose) => {
        set({ pose });
      },
      // Ephemeral "juice" gesture layered over `pose` by the Avatar on the
      // home + editor surfaces (see IdleJuice). Purely visual: never
      // persisted and never written into a saved character record. Clearing
      // it (null) crossfades the rig back to the canonical pose.
      gesture: null,
      setGesture: (gesture) => set({ gesture }),
      // Ephemeral: true while lipsync audio is playing. Drives the camera
      // zoom-in on the lipsync route (CameraManager) and is never persisted.
      lipsyncPlaying: false,
      setLipsyncPlaying: (lipsyncPlaying) => set({ lipsyncPlaying }),
      backdrop: "studio",
      setBackdrop: (backdrop) => {
        if (!BACKDROP_IDS.includes(backdrop)) return;
        set({ backdrop });
      },
      sections: [],
      activeSectionId: null,
      setActiveSectionId: (id) => set({ activeSectionId: id }),
      categories: [],
      currentCategory: null,
      assets: [],
      lockedGroups: {},
      height: 1,
      setHeight: (height) => set({ height, isDirty: true }),
      isDirty: false,
      // The shared skin material is a three.js object, so it's created
      // lazily by the engine layer (scene/CharacterContext) once that
      // client-only chunk loads — keeping `three` out of this store's
      // module graph, which is imported app-wide. updateSkin + SkinManager
      // both tolerate `skin` being null until then.
      skin: null,
      morphValues: {},
      detectedMorphsByCategory: {},
      detectedColorSlotsByCategory: {},
      registerColorSlots: (categoryName, slotNames) =>
        set((state) => ({
          detectedColorSlotsByCategory: {
            ...state.detectedColorSlotsByCategory,
            [categoryName]: slotNames,
          },
        })),

      setMorphValue: (key, value) => {
        set((state) => ({
          morphValues: { ...state.morphValues, [key]: value },
          isDirty: true,
        }));
      },
      // Ephemeral viseme update from the lipsync driver. Zeroes every viseme_*
      // key and sets `activeKey` to `intensity` in one shot — avoids 15 separate
      // re-renders per viseme change and never marks the character dirty.
      setVisemes: (activeKey, intensity = 1) =>
        set((state) => {
          const next = { ...state.morphValues };
          let changed = false;
          Object.keys(next).forEach((k) => {
            if (k.startsWith("viseme")) {
              const target = k === activeKey ? intensity : 0;
              if (next[k] !== target) {
                next[k] = target;
                changed = true;
              }
            }
          });
          // Make sure the active key exists even if the avatar's morph list
          // hadn't been touched yet.
          if (activeKey && !(activeKey in next)) {
            next[activeKey] = intensity;
            changed = true;
          }
          return changed ? { morphValues: next } : {};
        }),
      registerMorphs: (categoryName, keys) =>
        set((state) => ({
          detectedMorphsByCategory: {
            ...state.detectedMorphsByCategory,
            [categoryName]: keys,
          },
        })),
      resetAllMorphs: () => {
        const currentValues = get().morphValues;
        const resetValues = {};
        Object.keys(currentValues).forEach((key) => {
          resetValues[key] = 0;
        });
        set({ morphValues: resetValues, isDirty: true });
      },
      resetMorphSet: (keys) =>
        set((state) => {
          const newValues = { ...state.morphValues };
          keys.forEach((key) => {
            newValues[key] = 0;
          });
          return { morphValues: newValues, isDirty: true };
        }),
      customization: {},
      download: async () => null,
      setDownload: (download) => set({ download }),
      screenshot: () => {},
      setScreenshot: (screenshot) => set({ screenshot }),
      // Returns a Blob of the current frame instead of triggering a download.
      capturePhoto: async () => null,
      setCapturePhoto: (capturePhoto) => set({ capturePhoto }),
      // Returns a Blob of a close-up face thumbnail.
      captureFaceThumbnail: async () => null,
      setCaptureFaceThumbnail: (captureFaceThumbnail) =>
        set({ captureFaceThumbnail }),

      // Loaded/saved character tracking
      currentCharacterId: null,
      currentCharacterName: null,
      setCurrentCharacter: ({ id, name }) =>
        set({ currentCharacterId: id, currentCharacterName: name }),
      // Rename the in-progress character. Marks the look dirty so the Save
      // affordance lights up; the name is committed to the record on save.
      setCharacterName: (name) =>
        set((state) =>
          state.currentCharacterName === name
            ? {}
            : { currentCharacterName: name, isDirty: true },
        ),
      // True while the user is composing a brand-new (or forked) character
      // that hasn't been saved yet. Guards AuthBootstrapper from auto-loading
      // the user's main character over the fresh one. Never persisted.
      creatingNewCharacter: false,
      setCreatingNewCharacter: (value) => set({ creatingNewCharacter: value }),
      // Start a fresh character from the gender defaults without touching the
      // currently-selected gender. Clears the loaded-character id so the next
      // Save creates a new record instead of overwriting the previous one.
      beginNewCharacter: async () => {
        // Bare /editor owns the new draft. Invalidate any slower profile/main
        // hydration that began before navigation so it cannot resurrect a
        // previously edited character over this clean draft.
        loadCharacterSeq += 1;
        set({
          creatingNewCharacter: true,
          currentCharacterId: null,
          currentCharacterName: null,
        });
        if (get().categories.length === 0) {
          await get().fetchCategories();
        }
        const customization = buildDefaultCustomization(
          get().categories,
          get().gender,
        );
        set({
          customization,
          morphValues: {},
          height: 1,
          pose: PHOTO_POSES.Idle,
          isDirty: false,
        });
        const skinColor = customization.Skin?.color;
        if (skinColor) get().updateSkin(skinColor);
        get().applyLockedAssets();
      },
      saving: false,
      // Bumped after every successful character save — components can subscribe
      // to refresh listings.
      charactersChangedAt: 0,
      photosChangedAt: 0,
      setMainCharacter: async (characterId) => {
        const userId = pb.authStore.record?.id;
        if (!userId) throw new Error("Not signed in");
        const updated = await pb.collection("users").update(userId, {
          mainCharacter: characterId || null,
        });
        // Mirror the change locally so UI updates without waiting for onChange.
        pb.authStore.save(pb.authStore.token, updated);
        return updated;
      },
      loadCharacter: async (record) => {
        const seq = ++loadCharacterSeq;
        // Cover the whole load with `loading` (drives the boot diamond) so the
        // avatar never renders the previous/default look before the saved
        // customization is applied. Cleared by the final set below.
        set({ loading: true });
        // Switch gender first (this clears state + triggers refetch via AssetsBox).
        if (record.gender && get().gender !== record.gender) {
          // Drop any old-gender catalog fetch (see setGender).
          categoriesFetchSeq += 1;
          categoriesFetchPromise = null;
          set({
            gender: record.gender,
            loading: true,
            categories: [],
            sections: [],
            customization: {},
            pose: PHOTO_POSES.Idle,
            activeSectionId: null,
            currentCategory: null,
          });
        }
        // Ensure categories are loaded before resolving assetIds in saved customization.
        if (get().categories.length === 0) {
          await get().fetchCategories();
        }
        if (seq !== loadCharacterSeq) return;
        // A user-driven gender switch invalidated this character load while
        // its catalog was in flight. Do not apply a partial/empty look.
        if (record.gender && get().gender !== record.gender) return;
        const categories = get().categories;
        const saved = record.customization || {};
        const customization = {};
        categories.forEach((category) => {
          const slot = saved[category.name];
          const asset = slot?.assetId
            ? category.assets.find((a) => a.id === slot.assetId) || null
            : null;
          customization[category.name] = {
            asset,
            color:
              slot?.color ??
              (category.name === "Skin" ? DEFAULT_SKIN_COLOR : null),
            colors: slot?.colors || {},
          };
        });
        // A newer loadCharacter started while we were fetching — let it win
        // rather than clobbering it with this (now stale) character.
        if (seq !== loadCharacterSeq) return;
        // Apply the real customization AND clear loading together, so the
        // diamond only hands off once the saved look is in place (not after the
        // catalog fetch, which writes defaults first).
        set({
          customization,
          morphValues: record.morphValues || {},
          height: typeof record.height === "number" ? record.height : 1,
          currentCharacterId: record.id,
          currentCharacterName: record.name,
          creatingNewCharacter: false,
          isDirty: false,
          loading: false,
        });
        const skinColor = customization.Skin?.color;
        if (skinColor) get().updateSkin(skinColor);
        get().applyLockedAssets();
      },
      serializeCustomization: () => {
        const customization = get().customization;
        const out = {};
        Object.entries(customization).forEach(([name, slot]) => {
          out[name] = {
            assetId: slot?.asset?.id || null,
            color: slot?.color || null,
            colors: slot?.colors || {},
          };
        });
        return out;
      },
      saveCharacter: async ({ name } = {}) => {
        if (get().saving) return null;
        set({ saving: true });
        try {
          const userId = pb.authStore.record?.id;
          if (!userId) throw new Error("Not signed in");

          const captureFaceThumbnail = get().captureFaceThumbnail;
          const thumbBlob = captureFaceThumbnail
            ? await captureFaceThumbnail().catch(() => null)
            : null;

          const serialized = get().serializeCustomization();

          const formData = new FormData();
          formData.append("user", userId);
          formData.append(
            "name",
            name || get().currentCharacterName || "Untitled",
          );
          formData.append("gender", get().gender);
          formData.append("height", String(get().height));
          formData.append("pose", get().pose);
          formData.append("customization", JSON.stringify(serialized));
          formData.append("morphValues", JSON.stringify(get().morphValues));
          // Recipe asset ids denormalized into a queryable relation — powers
          // asset-edit invalidation and delete guards (the customization JSON
          // has dynamic keys, so PocketBase can't filter on it).
          const usedAssetIds = Object.values(serialized)
            .map((slot) => slot.assetId)
            .filter(Boolean);
          if (usedAssetIds.length === 0) {
            formData.append("usedAssets", "");
          } else {
            usedAssetIds.forEach((assetId) =>
              formData.append("usedAssets", assetId),
            );
          }
          // Recipe changed → the current bake no longer matches it.
          formData.append("bakeStale", "true");
          if (thumbBlob) {
            formData.append("thumbnail", thumbBlob, `thumb_${Date.now()}.png`);
          }

          const id = get().currentCharacterId;
          if (!thumbBlob && !id) {
            throw new Error(
              "Thumbnail capture is not ready yet. Wait for the character preview to finish loading, then save again.",
            );
          }

          const record = id
            ? await pb
                .collection("CharacterStudioCharacters")
                .update(id, formData)
            : await pb.collection("CharacterStudioCharacters").create(formData);

          // Eager default-variant bake so first-party surfaces never hit the
          // cold path. Best-effort: a failed enqueue never fails the save.
          enqueueCharacterBake(pb, record.id);

          set({
            currentCharacterId: record.id,
            currentCharacterName: record.name,
            charactersChangedAt: Date.now(),
            creatingNewCharacter: false,
            isDirty: false,
          });
          return record;
        } finally {
          set({ saving: false });
        }
      },
      capturingPhoto: false,
      savePhoto: async () => {
        if (get().capturingPhoto) return null;
        set({ capturingPhoto: true });
        try {
          const userId = pb.authStore.record?.id;
          if (!userId) throw new Error("Not signed in");
          const capturePhoto = get().capturePhoto;
          if (!capturePhoto) throw new Error("Camera not ready");
          const blob = await capturePhoto();
          if (!blob) throw new Error("Failed to capture photo");
          const formData = new FormData();
          formData.append("user", userId);
          formData.append("pose", get().pose || "");
          if (get().currentCharacterId) {
            formData.append("character", get().currentCharacterId);
          }
          formData.append("image", blob, `photo_${Date.now()}.png`);
          const record = await pb
            .collection("CharacterStudioPhotos")
            .create(formData);
          set({ photosChangedAt: Date.now() });
          return record;
        } finally {
          set({ capturingPhoto: false });
        }
      },

      exportSettings: { ...DEFAULT_EXPORT_SETTINGS },
      setExportSetting: (key, value) =>
        set((state) => ({
          exportSettings: { ...state.exportSettings, [key]: value },
        })),
      exporting: false,
      setExporting: (exporting) => set({ exporting }),
      estimating: false,
      setEstimating: (estimating) => set({ estimating }),
      estimatedSize: null,
      setEstimatedSize: (estimatedSize) => set({ estimatedSize }),
      updateColor: (categoryName, colorObj, slotName = null) => {
        if (!categoryName) return;

        const hexColor = colorObj.hex || colorObj;

        set((state) => {
          const currentCategoryData = state.customization[categoryName] || {};
          const currentColors = currentCategoryData.colors || {};

          return {
            customization: {
              ...state.customization,
              [categoryName]: {
                ...currentCategoryData,
                color: slotName ? currentCategoryData.color : hexColor,
                colors: {
                  ...currentColors,
                  ...(slotName ? { [slotName]: hexColor } : {}),
                },
                asset: currentCategoryData.asset || null,
              },
            },
            isDirty: true,
          };
        });

        if (categoryName.toLowerCase() === "skin") {
          get().updateSkin(hexColor);
        }
      },
      updateSkin: (color) => {
        const skinMaterial = get().skin;
        // With makeup, SkinManager rebakes the selected colour underneath the
        // overlay. Tinting that existing composite here would briefly apply
        // the colour twice before the new map arrives.
        if (skinMaterial && !skinMaterial.map) {
          skinMaterial.color.set(color);
        }
      },
      fetchCategories: async () => {
        if (get().categories.length > 0) return;
        // Share one in-flight fetch so concurrent callers don't each write the
        // catalog + default customization (which races loadCharacter's real
        // customization). See `categoriesFetchPromise`.
        if (categoriesFetchPromise) return categoriesFetchPromise;

        const fetchSeq = ++categoriesFetchSeq;
        const fetchPromise = (async () => {
          try {
            const currentGender = get().gender;

            const [sections, categories, assets] = await Promise.all([
              pb.collection("CharacterStudioSections").getFullList({
                sort: "+position",
                requestKey: null,
              }),
              pb.collection("CharacterStudioGroups").getFullList({
                sort: "+position",
                expand: "colorPalette,section",
                requestKey: null,
              }),
              pb.collection("CharacterStudioAssets").getFullList({
                sort: "-created",
                expand: "gender",
                requestKey: null,
              }),
            ]);

            categories.forEach((category) => {
              category.assets = assets.filter(
                (asset) =>
                  asset.group === category.id &&
                  asset.expand?.gender?.name === currentGender,
              );
            });

            const customization = buildDefaultCustomization(
              categories,
              currentGender,
            );

            // A gender switch or a newer catalog request happened while the
            // network calls were running. The old response must never write
            // old-gender categories/defaults into the new session.
            if (
              fetchSeq !== categoriesFetchSeq ||
              get().gender !== currentGender
            ) {
              return;
            }

            set({
              sections,
              categories,
              assets,
              customization,
              loading: false,
            });
            get().applyLockedAssets();
          } finally {
            if (categoriesFetchPromise === fetchPromise) {
              categoriesFetchPromise = null;
            }
          }
        })();

        categoriesFetchPromise = fetchPromise;

        return categoriesFetchPromise;
      },

      setCurrentCategory: (category) => set({ currentCategory: category }),
      changeAsset: (category, asset) => {
        set((state) => ({
          customization: {
            ...state.customization,
            [category]: {
              ...state.customization[category],
              asset,
            },
          },
          isDirty: true,
        }));
        get().applyLockedAssets();
      },

      randomize: () => {
        const customization = {};
        const morphValues = { ...get().morphValues };
        const categories = get().categories;
        const detectedMorphs = get().detectedMorphsByCategory;

        categories.forEach((category) => {
          const hasAssets = category.assets && category.assets.length > 0;
          let randomAsset = hasAssets
            ? category.assets[randInt(0, category.assets.length - 1)]
            : null;

          if (category.optional && Math.random() > 0.7) {
            randomAsset = null;
          }

          const colors = category.expand?.colorPalette?.colors;
          let randomColor = "";
          if (!excludedColorCategories.includes(category.name)) {
            randomColor = colors ? colors[randInt(0, colors.length - 1)] : "";
          } else {
            randomColor = get().customization[category.name]?.color || "";
          }

          customization[category.name] = {
            asset: randomAsset,
            color: randomColor,
          };

          const categoryMorphs = detectedMorphs[category.name];
          if (categoryMorphs) {
            categoryMorphs.forEach((morphKey) => {
              const shouldSkip = hiddenPrefixes.some((prefix) =>
                morphKey.startsWith(prefix),
              );
              if (!shouldSkip) {
                morphValues[morphKey] = randFloat(0, 1);
              }
            });
          }

          if (category.name === "Skin" && randomColor) {
            get().updateSkin(randomColor);
          }
        });

        const randomHeight = randFloat(0.5, 2);

        set({
          customization,
          morphValues,
          height: randomHeight,
          isDirty: true,
        });
        get().applyLockedAssets();
      },

      applyLockedAssets: () => {
        const customization = get().customization;
        const categories = get().categories;
        const lockedGroups = {};

        Object.values(customization).forEach((category) => {
          if (category.asset?.lockedGroups) {
            category.asset.lockedGroups.forEach((group) => {
              const categoryName = categories.find(
                (category) => category.id === group,
              ).name;
              if (!lockedGroups[categoryName]) {
                lockedGroups[categoryName] = [];
              }
              const lockingAssetCategoryName = categories.find(
                (cat) => cat.id === category.asset.group,
              ).name;
              lockedGroups[categoryName].push({
                name: category.asset.name,
                categoryName: lockingAssetCategoryName,
              });
            });
          }
        });

        set({ lockedGroups });
      },
    }),
    {
      name: "character-studio-prefs",
      version: 1,
      partialize: (state) => ({
        exportSettings: state.exportSettings,
        // Keep the user's active character across reloads and route changes
        // so the chip + per-character experiments don't reset to "No
        // character" on refresh.
        currentCharacterId: state.currentCharacterId,
        currentCharacterName: state.currentCharacterName,
        photoAspectRatio: state.photoAspectRatio,
        // The backdrop is now switchable from every studio topbar; persist it
        // so the chosen mood carries across routes and reloads.
        backdrop: state.backdrop,
      }),
      migrate: (persisted, version) => {
        if (!persisted?.exportSettings) return persisted;
        if (version < 1 && "draco" in persisted.exportSettings) {
          // Old boolean flag → new enum. Default to Draco (the new default)
          // when the old flag was on, "none" when it was off.
          persisted.exportSettings.compression = persisted.exportSettings.draco
            ? COMPRESSION.DRACO
            : COMPRESSION.NONE;
          delete persisted.exportSettings.draco;
        }
        return persisted;
      },
    },
  ),
);
