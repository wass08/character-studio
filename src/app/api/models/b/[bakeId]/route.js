import { NextResponse } from "next/server";
import { canonicalizeBakeParams, variantKeyFor } from "@/lib/bake/params";
import { enqueueVariantBake } from "@/lib/bakeJobs";
import {
  checkRateLimit,
  getSuperuserPb,
  variantUrl,
  waitForVariant,
} from "@/lib/server/modelResolver";

// GET /api/models/b/{bakeId}.glb?quality=…&morphs=…&compression=…&pose=…
//
// The pinned, immutable form for external consumers: bakeId is the content
// hash, the recipe is frozen on the bake record, and the same URL returns the
// same bytes forever. Serving this URL marks the bake externallyDelivered,
// which exempts it from garbage collection permanently — never break a URL
// someone shipped in their project.

export async function GET(req, { params }) {
  const limit = checkRateLimit(req);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Rate limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const { bakeId: rawBakeId } = await params;
  const bakeId = rawBakeId.replace(/\.glb$/i, "");

  const parsed = canonicalizeBakeParams(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const variantKey = variantKeyFor(parsed.params);

  const pb = await getSuperuserPb();
  const fetchBake = () =>
    pb
      .collection("CharacterStudioBakes")
      .getFirstListItem(pb.filter("bakeId = {:bakeId}", { bakeId }), {
        requestKey: null,
      });

  let bake;
  try {
    bake = await fetchBake();
  } catch {
    return NextResponse.json({ error: "Bake not found" }, { status: 404 });
  }

  const deliver = async (url, deliveredBake) => {
    if (!deliveredBake.externallyDelivered) {
      await pb
        .collection("CharacterStudioBakes")
        .update(deliveredBake.id, { externallyDelivered: true })
        .catch(() => {});
    }
    return NextResponse.redirect(url, {
      status: 302,
      // bakeId → object key is deterministic and the target is immutable, so
      // this redirect itself may be cached forever.
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    });
  };

  const url = variantUrl(bake, variantKey);
  if (url) return deliver(url, bake);

  // Variant missing on an existing bake: generate it from the bake's frozen
  // recipe (job carries the bake reference), holding the request open.
  await enqueueVariantBake(pb, { bakeId: bake.id, variantKey });
  const waited = await waitForVariant(fetchBake, variantKey);
  if (waited.url) return deliver(waited.url, waited.bake);

  return NextResponse.json(
    { error: "Variant not ready yet, retry shortly" },
    { status: 503, headers: { "Retry-After": "10" } },
  );
}
