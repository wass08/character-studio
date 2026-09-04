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

// GET /api/models/b/{bakeId}.glb?quality=…&morphs=…&compression=…&pose=…
// GET /api/models/b/{bakeId}.json
//
// The pinned, immutable form for external consumers: bakeId is the content
// hash, the recipe is frozen on the bake record, and the same URL returns the
// same bytes forever. The .json form is the integration manifest (URLs, rig
// contract, animation catalog, morphs) for that bake. Serving either marks
// the bake externallyDelivered, which exempts it from garbage collection
// permanently — never break a URL someone shipped in their project.

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

  const { bakeId: rawBakeId } = await params;
  const wantsManifest = /\.json$/i.test(rawBakeId);
  const bakeId = rawBakeId.replace(/\.(glb|json)$/i, "");

  const parsed = canonicalizeBakeParams(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }
  const variantKey = variantKeyFor(parsed.params);

  const pb = await getSuperuserPb();
  const fetchBake = () =>
    pb
      .collection("CharacterStudioBakes")
      .getFirstListItem(pb.filter("bakeId = {:bakeId}", { bakeId }), {
        expand: "character",
        requestKey: null,
      });

  let bake;
  try {
    bake = await fetchBake();
  } catch {
    return json({ error: "Bake not found" }, 404);
  }

  const markDelivered = async (deliveredBake) => {
    if (!deliveredBake.externallyDelivered) {
      await pb
        .collection("CharacterStudioBakes")
        .update(deliveredBake.id, { externallyDelivered: true })
        .catch(() => {});
    }
  };

  const origin = requestOrigin(req);
  const manifestUrl = `${origin}/api/models/b/${encodeURIComponent(bakeId)}.json`;

  if (wantsManifest) {
    await markDelivered(bake);
    return json(
      buildManifest({ bake, character: bake.expand?.character, origin }),
      200,
      // Variant availability changes as cold variants land, so this is
      // cacheable but not immutable.
      { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" },
    );
  }

  const deliver = async (url, deliveredBake) => {
    await markDelivered(deliveredBake);
    return NextResponse.redirect(url, {
      status: 302,
      headers: {
        ...PUBLIC_CORS_HEADERS,
        // bakeId → object key is deterministic and the target is immutable,
        // so this redirect itself may be cached forever.
        "Cache-Control": "public, max-age=31536000, immutable",
        Link: `<${manifestUrl}>; rel="describedby"; type="application/json"`,
      },
    });
  };

  const url = variantUrl(bake, variantKey);
  if (url) return deliver(url, bake);

  // Variant missing on an existing bake: generate it from the bake's frozen
  // recipe (job carries the bake reference), holding the request open.
  await enqueueVariantBake(pb, { bakeId: bake.id, variantKey });
  const waited = await waitForVariant(fetchBake, variantKey);
  if (waited.url) return deliver(waited.url, waited.bake);

  return json({ error: "Variant not ready yet, retry shortly" }, 503, {
    "Retry-After": "10",
  });
}
