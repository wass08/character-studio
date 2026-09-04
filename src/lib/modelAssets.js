const CHARACTER_GENDERS = new Set(["man", "woman"]);

export function normalizeCharacterGender(gender) {
  return CHARACTER_GENDERS.has(gender) ? gender : "woman";
}

export function sharedAnimationsUrl(gender) {
  return `/api/models/animations/${normalizeCharacterGender(gender)}.glb`;
}

export function bakedCharacterUrl(characterId) {
  return `/api/models/c/${encodeURIComponent(characterId)}.glb`;
}
