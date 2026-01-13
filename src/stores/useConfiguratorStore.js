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

    categories.forEach((category) => {
      category.assets = assets.filter((asset) => asset.group === category.id);
      console.log(category.assets);
    });

    set({ categories, currentCategory: categories[0], assets });
  },

  setCurrentCategory: (category) => set({ currentCategory: category }),
}));
