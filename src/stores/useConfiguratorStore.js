import { create } from "zustand";

import PocketBase from "pocketbase";
import { MeshStandardMaterial } from "three";

const pocketBaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;

if (!pocketBaseUrl) {
  throw new Error("NEXT_PUBLIC_POCKETBASE_URL is needed");
}

export const pb = new PocketBase(pocketBaseUrl);

export const useConfiguratorStore = create((set, get) => ({
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
    const categories = await pb
      .collection("CharacterStudioGroups")
      .getFullList({
        sort: "+position",
        expand: "colorPalette",
      });
    const assets = await pb.collection("CharacterStudioAssets").getFullList({
      sort: "-created",
    });

    console.log(assets);

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
}));
