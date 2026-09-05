import {
  claimCharacter,
  EMBED_RATE_LIMITS,
  embedError,
  embedJson,
  publicCharacter,
  rateLimited,
  userFromAuthHeader,
} from "@/lib/server/embed";
import { checkRateLimit } from "@/lib/server/modelResolver";

// POST /api/embed/claim { code } with `Authorization: Bearer <PocketBase user
// token>` — attaches the guest character behind the code to the signed-in
// user. The code is consumed; the character leaves guest mode and shows up
// in /studio like any other.
export async function POST(req) {
  const limit = checkRateLimit(req, EMBED_RATE_LIMITS.write);
  if (!limit.ok) return rateLimited(limit);
  try {
    const user = await userFromAuthHeader(req);
    const body = await req.json().catch(() => ({}));
    const record = await claimCharacter({ code: body?.code, user });
    return embedJson({ character: publicCharacter(record) });
  } catch (error) {
    return embedError(error);
  }
}
