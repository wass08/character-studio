import { create } from "zustand";

import PocketBase from "pocketbase";

const pocketBaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;

if (!pocketBaseUrl) {
  throw new Error("VITE_POCKETBASE_URL is needed");
}

export const pb = new PocketBase(pocketBaseUrl);

export const useConfiguratorStore = create((set, get) => ({
  categories: [],
  currentCategory: null,
  assets: [],
  customization: {},
  download: () => {},
  setDownload: (download) => set({ download }),
  fetchCategories: async () => {
    const categories = await pb
      .collection("CharacterStudioGroups")
      .getFullList({
        sort: "+position",
      });
    const assets = await pb.collection("CharacterStudioAssets").getFullList({
      sort: "-created",
    });

    console.log(assets);

    const customization = {};
    categories.forEach((category) => {
      category.assets = assets.filter((asset) => asset.group === category.id);
      customization[category.name] = {};

      if (category.startingAsset) {
        customization[category.name].asset = category.assets.find(
          (asset) => asset.id === category.startingAsset
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
