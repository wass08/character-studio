import { NextResponse } from "next/server";
import { canonicalizeBakeParams, variantKeyFor } from "@/lib/bake/params";
import { enqueueVariantBake } from "@/lib/bakeJobs";
import {
  checkRateLimit,
  getSuperuserPb,
  variantUrl,
  waitForVariant,
} from "@/lib/server/modelResolver";

// GET /api/models/c/{characterId}.glb?quality=…&morphs=…&compression=…&pose=…
//
// The mutable, follows-the-pointer form: resolves the character's latestBake
// and 302s to the immutable R2 object for the requested variant. Serving
// contract (see plans/data-bake-pipeline.md): enum-clamped params, 400 on
// unknowns; stale bakes are served immediately while a re-bake is enqueued
// (SWR); missing variants are baked while the request is held open (~20s).

export async function GET(req, { params }) {
  const limit = checkRateLimit(req);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Rate limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const { id: rawId } = await params;
  const characterId = rawId.replace(/\.glb$/i, "");

  const parsed = canonicalizeBakeParams(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
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
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }
  if (character.hidden) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  const redirect = (url) =>
    NextResponse.redirect(url, {
      status: 302,
      // The pointer is mutable — never let a CDN pin this hop. The R2 object
      // it points to is immutable and carries cache-forever headers instead.
      headers: { "Cache-Control": "no-store" },
    });

  const url = variantUrl(character.expand?.latestBake, variantKey);
  if (url) {
    if (character.bakeStale) {
      // SWR: serve the old bake now, heal in the background.
      await enqueueVariantBake(pb, { characterId, variantKey });
    }
    return redirect(url);
  }

  // Cold path: variant (or whole bake) doesn't exist yet. Enqueue and hold
  // the request open until the worker lands it or we time out.
  await enqueueVariantBake(pb, { characterId, variantKey });
  const waited = await waitForVariant(
    () => fetchCharacter().then((c) => c.expand?.latestBake || null),
    variantKey,
  );
  if (waited.url) return redirect(waited.url);

  return NextResponse.json(
    { error: "Bake not ready yet, retry shortly" },
    { status: 503, headers: { "Retry-After": "10" } },
  );
}
