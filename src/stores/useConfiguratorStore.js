import { create } from "zustand";

import PocketBase from "pocketbase";
import { MeshStandardMaterial } from "three";

const pocketBaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;

if (!pocketBaseUrl) {
  throw new Error("NEXT_PUBLIC_POCKETBASE_URL is needed");
}
export const pb = new PocketBase(pocketBaseUrl);

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => Math.random() * (max - min) + min;

export const PHOTO_POSES = {
  Idle: "Idle",
  Walk: "Rig|Walk_Loop",
};

export const UI_MODES = {
  PHOTO: "photo",
  CUSTOMIZE: "customize",
};

export const useConfiguratorStore = create((set, get) => ({
  mode: UI_MODES.CUSTOMIZE,
  setMode: (mode) => {
    set({ mode: mode });
  },
  pose: PHOTO_POSES.Idle,
  setPose: (pose) => {
    set({ pose });
  },
  categories: [],
  currentCategory: null,
  assets: [],
  height: 1,
  setHeight: (height) => set({ height }),
  skin: new MeshStandardMaterial({
    color: 0xffcc99,
    roughness: 1,
  }),
  morphValues: {},
  detectedMorphsByCategory: {},
  setMorphValue: (key, value) =>
    set((state) => ({
      morphValues: { ...state.morphValues, [key]: value },
    })),
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
    set({ morphValues: resetValues });
  },
  resetMorphSet: (keys) =>
    set((state) => {
      const newValues = { ...state.morphValues };
      keys.forEach((key) => {
        newValues[key] = 0;
      });
      return { morphValues: newValues };
    }),
  customization: {},
  download: () => {},
  setDownload: (download) => set({ download }),
  updateColor: (colorObj) => {
    const hexColor = colorObj.hex || colorObj;
    const categoryName = get().currentCategory.name;

    set((state) => ({
      customization: {
        ...state.customization,
        [categoryName]: {
          ...state.customization[categoryName],
          color: hexColor,
          colorData: colorObj.hsl || null,
        },
      },
    }));

    if (categoryName === "skin") {
      get().updateSkin(hexColor);
    }
  },
  updateSkin: (color) => {
    const skinMaterial = get().skin;
    if (skinMaterial) {
      skinMaterial.color.set(color);
    }
  },
  fetchCategories: async () => {
    if (get().categories.length > 0) return;

    const categories = await pb
      .collection("CharacterStudioGroups")
      .getFullList({
        sort: "+position",
        expand: "colorPalette",
      });
    const assets = await pb.collection("CharacterStudioAssets").getFullList({
      sort: "-created",
    });

    const customization = {};
    categories.forEach((category) => {
      category.assets = assets.filter((asset) => asset.group === category.id);
      customization[category.name] = {
        color: category.expand?.colorPalette?.colors?.[0] || "",
      };

      if (category.startingAsset) {
        customization[category.name].asset = category.assets.find(
          (asset) => asset.id === category.startingAsset,
        );
      }
    });

    set({ categories, currentCategory: categories[0], assets, customization });
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
    }));
  },

  randomize: () => {
    const customization = {};
    const morphValues = { ...get().morphValues };
    const categories = get().categories;
    const detectedMorphs = get().detectedMorphsByCategory;

    categories.forEach((category) => {
      let randomAsset = category.assets[randInt(0, category.assets.length - 1)];

      if (category.optional && Math.random() > 0.7) {
        randomAsset = null;
      }

      const colors = category.expand?.colorPalette?.colors;
      const randomColor = colors ? colors[randInt(0, colors.length - 1)] : "";

      customization[category.name] = {
        asset: randomAsset,
        color: randomColor,
      };

      const categoryMorphs = detectedMorphs[category.name];
      if (categoryMorphs) {
        categoryMorphs.forEach((morphKey) => {
          morphValues[morphKey] = randFloat(0, 1);
        });
      }

      if (category.name === "skin" && randomColor) {
        get().updateSkin(randomColor);
      }
    });

    const randomHeight = randFloat(0.5, 2);

    set({
      customization,
      morphValues,
      height: randomHeight,
    });
  },
}));
