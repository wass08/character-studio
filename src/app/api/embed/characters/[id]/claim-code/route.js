import {
  CLAIM_CODE_TTL_MS,
  EMBED_RATE_LIMITS,
  embedError,
  embedJson,
  guestTokenFrom,
  issueClaimCode,
  rateLimited,
} from "@/lib/server/embed";
import { requestOrigin } from "@/lib/server/manifest";
import { checkRateLimit } from "@/lib/server/modelResolver";

// POST /api/embed/characters/{id}/claim-code — mint a single-use code the
// guest can redeem on a first-party tab (/claim?code=…) after signing in.
// Codes expire after CLAIM_CODE_TTL_MS; issuing a new one replaces the old.
export async function POST(req, { params }) {
  const limit = checkRateLimit(req, EMBED_RATE_LIMITS.write);
  if (!limit.ok) return rateLimited(limit);
  try {
    const token = guestTokenFrom(req);
    const { id } = await params;
    const { code, expiresAt, characterId } = await issueClaimCode({
      token,
      characterId: id,
    });
    const claimUrl = `${requestOrigin(req)}/claim?code=${encodeURIComponent(code)}`;
    return embedJson({
      code,
      claimUrl,
      expiresAt,
      ttlSeconds: Math.round(CLAIM_CODE_TTL_MS / 1000),
      characterId,
    });
  } catch (error) {
    return embedError(error);
  }
}
