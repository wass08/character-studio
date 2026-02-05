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

const DEFAULT_SKIN_COLOR = "#e7a67a";

export const PHOTO_POSES = {
  Idle: "Rig|Idle_Loop",
  Walk: "Rig|Walk_Loop",
};

export const UI_MODES = {
  PHOTO: "photo",
  CUSTOMIZE: "customize",
};

export const GENDERS = {
  MAN: "man",
  WOMAN: "woman",
  OTHER: "other", // In case we want to add more
  NONE: "none", // In case we don't want to start with a default gender
};

export const useConfiguratorStore = create((set, get) => ({
  loading: true,
  introFinished: false,
  setIntroFinished: (value) => set({ introFinished: value }),
  gender: GENDERS.WOMAN,
  // gender: Math.random() > 0.5 ? GENDERS.MAN : GENDERS.WOMAN,
  setGender: (gender) => {
    if (get().gender === gender) return;

    set({
      gender: gender,
      loading: true,
      categories: [],
      customization: {},
      pose: PHOTO_POSES.Idle,
    });
  },
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
    color: DEFAULT_SKIN_COLOR,
    roughness: 1,
  }),
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
  screenshot: () => {},
  setScreenshot: (screenshot) => set({ screenshot }),
  updateColor: (colorObj, slotName = null) => {
    const hexColor = colorObj.hex || colorObj;
    const categoryName = get().currentCategory.name;

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
            colorData: slotName
              ? currentCategoryData.colorData
              : colorObj.hsl || null,
          },
        },
      };
    });

    if (categoryName === "Skin") {
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

    const currentGender = get().gender;

    const [categories, assets] = await Promise.all([
      pb.collection("CharacterStudioGroups").getFullList({
        sort: "+position",
        expand: "colorPalette",
      }),
      pb.collection("CharacterStudioAssets").getFullList({
        sort: "-created",
        expand: "gender",
      }),
    ]);

    const customization = {};

    categories.forEach((category) => {
      category.assets = assets.filter(
        (asset) =>
          asset.group === category.id &&
          asset.expand?.gender?.name === currentGender,
      );

      customization[category.name] = {
        color: category.name === "Skin" ? DEFAULT_SKIN_COLOR : null,
        asset: null,
        colors: {},
      };

      const startingAssetId =
        currentGender === GENDERS.MAN
          ? category.startingAssetMan
          : category.startingAssetWoman;

      if (startingAssetId) {
        const foundAsset = category.assets.find(
          (a) => a.id === startingAssetId,
        );
        if (foundAsset) {
          customization[category.name].asset = foundAsset;
        }
      }

      if (
        !category.optional &&
        !customization[category.name].asset &&
        category.assets.length > 0
      ) {
        customization[category.name].asset = category.assets[0];
      }
    });

    set({
      categories,
      currentCategory: categories[0],
      assets,
      customization,
      loading: false,
    });
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
      const hasAssets = category.assets && category.assets.length > 0;
      let randomAsset = hasAssets
        ? category.assets[randInt(0, category.assets.length - 1)]
        : null;

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

      if (category.name === "Skin" && randomColor) {
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
