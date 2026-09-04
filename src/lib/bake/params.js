// Canonical bake-variant parameters — the single source of truth shared by
// the model-serving routes, the bake worker, and job enqueueing.
//
// Params are clamped enums, never free values: free values would let anyone
// mint unlimited distinct variants and burn worker CPU. The full space is
// 3×4×3×2 = 72 combos per bake; real usage hits a handful.
//
// A "variant key" is the canonical query string of ALL params in sorted key
// order (defaults filled in). Being enum-clamped keeps it short, readable and
// filesystem/R2-safe, so we use it directly instead of hashing:
//   "compression=meshopt&morphs=visemes&pose=default&quality=medium"
// R2 layout: bakes/{bakeId}/{variantKey}.glb

export const BAKE_PARAMS = Object.freeze({
  quality: Object.freeze({
    values: Object.freeze(["low", "medium", "high"]),
    default: "medium",
  }),
  morphs: Object.freeze({
    values: Object.freeze(["none", "visemes", "arkit", "full"]),
    default: "visemes",
  }),
  compression: Object.freeze({
    values: Object.freeze(["none", "draco", "meshopt"]),
    default: "meshopt",
  }),
  pose: Object.freeze({
    values: Object.freeze(["default", "tpose"]),
    default: "default",
  }),
});

const PARAM_NAMES = Object.freeze(Object.keys(BAKE_PARAMS).sort());

/**
 * Validate + canonicalize raw params (e.g. from URLSearchParams entries).
 * Unknown keys and unknown values are hard errors (HTTP 400 at the edge) —
 * silently ignoring them would make typos mint surprise default variants.
 *
 * @param {Record<string, string>} raw
 * @returns {{ ok: true, params: Record<string, string> } | { ok: false, error: string }}
 */
export function canonicalizeBakeParams(raw = {}) {
  const params = {};
  for (const [key, value] of Object.entries(raw)) {
    const spec = BAKE_PARAMS[key];
    if (!spec) {
      return {
        ok: false,
        error: `Unknown param "${key}". Allowed: ${PARAM_NAMES.join(", ")}`,
      };
    }
    if (!spec.values.includes(value)) {
      return {
        ok: false,
        error: `Invalid value "${value}" for "${key}". Allowed: ${spec.values.join("|")}`,
      };
    }
    params[key] = value;
  }
  for (const name of PARAM_NAMES) {
    if (!(name in params)) params[name] = BAKE_PARAMS[name].default;
  }
  return { ok: true, params };
}

/** Canonical variant key: all params, sorted keys, query-string form. */
export function variantKeyFor(params) {
  return PARAM_NAMES.map((name) => `${name}=${params[name]}`).join("&");
}

export const DEFAULT_VARIANT_KEY = variantKeyFor(
  Object.fromEntries(
    PARAM_NAMES.map((name) => [name, BAKE_PARAMS[name].default]),
  ),
);

/** R2 object key for a variant of a bake. */
export function variantObjectKey(bakeId, variantKey) {
  return `bakes/${bakeId}/${variantKey}.glb`;
}
