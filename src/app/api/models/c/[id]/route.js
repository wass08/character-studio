import { NextResponse } from "next/server";
import { canonicalizeBakeParams, variantKeyFor } from "@/lib/bake/params";
import { enqueueVariantBake } from "@/lib/bakeJobs";
import {
  buildManifest,
  PUBLIC_CORS_HEADERS,
  requestOrigin,
} from "@/lib/server/manifest";
import {
  checkRateLimit,
  getSuperuserPb,
  variantUrl,
  waitForVariant,
} from "@/lib/server/modelResolver";

// GET /api/models/c/{characterId}.glb?quality=…&morphs=…&compression=…&pose=…
// GET /api/models/c/{characterId}.json
//
// The mutable, follows-the-pointer form: resolves the character's latestBake
// and 302s to the immutable R2 object for the requested variant. Serving
// contract (see plans/data-bake-pipeline.md): enum-clamped params, 400 on
// unknowns; stale bakes are served immediately while a re-bake is enqueued
// (SWR); missing variants are baked while the request is held open (~20s).
// The .json form returns the integration manifest of the current bake.

const json = (body, status, headers = {}) =>
  NextResponse.json(body, {
    status,
    headers: { ...PUBLIC_CORS_HEADERS, ...headers },
  });

export async function GET(req, { params }) {
  const limit = checkRateLimit(req);
  if (!limit.ok) {
    return json({ error: "Rate limited" }, 429, {
      "Retry-After": String(limit.retryAfter),
    });
  }

  const { id: rawId } = await params;
  const wantsManifest = /\.json$/i.test(rawId);
  const characterId = rawId.replace(/\.(glb|json)$/i, "");

  const parsed = canonicalizeBakeParams(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }
  const variantKey = variantKeyFor(parsed.params);

  const pb = await getSuperuserPb();
  const fetchCharacter = () =>
    pb.collection("CharacterStudioCharacters").getOne(characterId, {
      expand: "latestBake",
      requestKey: null,
    });

  let character;
  try {
    character = await fetchCharacter();
  } catch {
    return json({ error: "Character not found" }, 404);
  }
  if (character.hidden) {
    return json({ error: "Character not found" }, 404);
  }

  const origin = requestOrigin(req);
  // The pointer is mutable — never let a CDN pin this hop. The R2 object it
  // points to is immutable and carries cache-forever headers instead.
  const noStore = { "Cache-Control": "no-store" };

  const manifestFor = (bake) =>
    json(buildManifest({ bake, character, origin }), 200, noStore);

  const redirect = (url, bake) =>
    NextResponse.redirect(url, {
      status: 302,
      headers: {
        ...PUBLIC_CORS_HEADERS,
        ...noStore,
        Link: `<${origin}/api/models/b/${encodeURIComponent(bake.bakeId)}.json>; rel="describedby"; type="application/json"`,
      },
    });

  const latest = character.expand?.latestBake;
  const url = variantUrl(latest, variantKey);
  if (url) {
    if (character.bakeStale) {
      // SWR: serve the old bake now, heal in the background.
      await enqueueVariantBake(pb, { characterId, variantKey });
    }
    return wantsManifest ? manifestFor(latest) : redirect(url, latest);
  }

  // Cold path: variant (or whole bake) doesn't exist yet. Enqueue and hold
  // the request open until the worker lands it or we time out.
  await enqueueVariantBake(pb, { characterId, variantKey });
  const waited = await waitForVariant(
    () => fetchCharacter().then((c) => c.expand?.latestBake || null),
    variantKey,
  );
  if (waited.url) {
    return wantsManifest
      ? manifestFor(waited.bake)
      : redirect(waited.url, waited.bake);
  }

  return json({ error: "Bake not ready yet, retry shortly" }, 503, {
    "Retry-After": "10",
  });
}
